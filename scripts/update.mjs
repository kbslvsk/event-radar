// Stáhne aktuální události z Wikipedie (MMA), football-data.org (fotbal) a Ticketmasteru (koncerty)
// a uloží je do data/auto-events.js. Když některý zdroj selže, ponechá jeho data z minulého běhu.
//
// Použití: node scripts/update.mjs
// Klíče: FOOTBALL_DATA_TOKEN, TICKETMASTER_KEY (env proměnné nebo soubor .env)

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { MMA_SOURCES, MMA_FEEDS, FOOTBALL, CONCERTS } from "./config.mjs";

const OUT_FILE = new URL("../data/auto-events.js", import.meta.url);
const TZ = "Europe/Prague";
const UA = "EventRadar/1.0 (personal event calendar)";

const todayStr = () => localParts(new Date()).date;
const addDays = (n) => new Date(Date.now() + n * 86400000);

function localParts(date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
      .formatToParts(date).map((x) => [x.type, x.value])
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour === "24" ? "00" : p.hour}:${p.minute}` };
}

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers: { "User-Agent": UA, ...headers } });
  if (!res.ok) throw new Error(`HTTP ${res.status} pro ${url.split("?")[0]}`);
  return res.json();
}

// ---------------------------------------------------------------- MMA (Wikipedia)

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

// {{dts|2026|Oct|17}}, {{dts|2026|10|17}}, {{dts|October 17, 2026}}, {{dts|17 October 2026}}
function parseDts(params) {
  const p = params.split("|").map((s) => s.trim()).filter((s) => s && !s.includes("="));
  let y, m, d;
  if (p.length >= 3) {
    [y, m, d] = p;
    m = /^\d+$/.test(m) ? Number(m) : MONTHS[m.slice(0, 3).toLowerCase()];
  } else if (p.length === 1) {
    const s = p[0];
    let x;
    if ((x = s.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/))) [, m, d, y] = x;
    else if ((x = s.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/))) [, d, m, y] = x;
    else if ((x = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) [, y, m, d] = x;
    else return null;
    m = /^\d+$/.test(m) ? Number(m) : MONTHS[m.slice(0, 3).toLowerCase()];
  } else return null;
  if (!y || !m || !d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function cleanWikitext(text) {
  let t = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/\{\{\s*dts\s*\|([^{}]*)\}\}/gi, (_, p) => `@@DATE:${parseDts(p) ?? "?"}@@`);
  // Odstraň zbylé šablony (i vnořené) – odzadu, dokud nějaké jsou
  let prev;
  do { prev = t; t = t.replace(/\{\{[^{}]*\}\}/g, ""); } while (t !== prev);
  return t;
}

const plain = (s) => s
  .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
  .replace(/<[^>]+>/g, "")
  .replace(/'''?/g, "")
  .replace(/&nbsp;/g, " ")
  .replace(/\s+/g, " ")
  .trim();

// Rozebere wiki tabulky na hlavičky + řádky (včetně rowspan)
function parseTables(text) {
  const tables = [];
  const re = /\{\|([\s\S]*?)\n\|\}/g;
  let m;
  while ((m = re.exec(text))) {
    const headers = [];
    const rows = [];
    let carry = []; // carry[col] = { value, left }
    for (const rawRow of m[1].split(/\n\|-[^\n]*/)) {
      const cells = [];
      let isHeader = false;
      for (const line of rawRow.split("\n")) {
        const first = line[0];
        if (first !== "|" && first !== "!") {
          if (cells.length && line.trim()) cells[cells.length - 1].raw += " " + line;
          continue;
        }
        if (line.startsWith("|+")) continue;
        if (first === "!" && !cells.length && !rows.length) isHeader = true;
        for (const part of line.slice(1).split(first === "!" ? /!!|\|\|/ : /\|\|/)) {
          // "attr=x | obsah" – atributy před první svislicí mimo [[ ]]
          const bar = findAttrBar(part);
          const attrs = bar >= 0 ? part.slice(0, bar) : "";
          const raw = bar >= 0 ? part.slice(bar + 1) : part;
          const rs = attrs.match(/rowspan\s*=\s*"?(\d+)/i);
          cells.push({ raw, rowspan: rs ? Number(rs[1]) : 1 });
        }
      }
      if (!cells.length) continue;
      if (isHeader && !headers.length) { headers.push(...cells.map((c) => plain(c.raw).toLowerCase())); continue; }
      // Doplň buňky přenesené z rowspan předchozích řádků
      const row = [];
      let ci = 0;
      for (let col = 0; ci < cells.length || carry.slice(col).some((c) => c?.left > 0); col++) {
        if (carry[col]?.left > 0) { row.push(carry[col].value); carry[col].left--; continue; }
        const c = cells[ci++];
        if (!c) break;
        row.push(c.raw);
        if (c.rowspan > 1) carry[col] = { value: c.raw, left: c.rowspan - 1 };
      }
      rows.push(row);
    }
    tables.push({ headers, rows });
  }
  return tables;
}

function findAttrBar(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s.startsWith("[[", i) || s.startsWith("{{", i)) { depth++; i++; }
    else if (s.startsWith("]]", i) || s.startsWith("}}", i)) { depth--; i++; }
    else if (s[i] === "|" && depth === 0) {
      const before = s.slice(0, i);
      return /^\s*[\w-]+\s*=/.test(before) && !before.includes("@@") ? i : -1;
    }
  }
  return -1;
}

async function fetchMma() {
  const year = new Date().getFullYear();
  const today = todayStr();
  const events = [];
  const seenIds = new Set();

  for (const src of MMA_SOURCES) {
    const pages = [...new Set(src.pages.flatMap((p) => [p.replace("{year}", year), p.replace("{year}", year + 1)]))];
    let found = 0;
    for (const page of pages) {
      const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=wikitext&format=json&formatversion=2`;
      const data = await getJson(url);
      if (data.error) { if (data.error.code === "missingtitle") continue; throw new Error(data.error.info); }
      const tables = parseTables(cleanWikitext(data.parse.wikitext));

      for (const { headers, rows } of tables) {
        const col = (re) => headers.findIndex((h) => re.test(h));
        const iEvent = col(/^event/), iDate = col(/^date/), iVenue = col(/^venue/), iLoc = col(/^(location|city)/);
        if (iEvent < 0 || iDate < 0) continue;
        for (const row of rows) {
          const date = row[iDate]?.match(/@@DATE:(\d{4}-\d{2}-\d{2})@@/)?.[1];
          if (!date || date < today) continue;
          const title = plain(row[iEvent] ?? "").replace(/^XTB\s+/, "");
          if (!title) continue;
          const loc = plain(row[iLoc] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
          let id = `${slug(src.org)}-${date}`;
          if (seenIds.has(id)) id += "-" + slug(title).slice(0, 30);
          if (seenIds.has(id)) continue; // stejná akce na letošní i příští stránce
          seenIds.add(id);
          events.push({
            id, category: "mma", org: src.org, title, date,
            venue: plain(row[iVenue] ?? "") || undefined,
            city: loc.slice(0, -1).join(", ") || loc[0],
            country: loc.length > 1 ? loc.at(-1) : undefined,
            url: `https://en.wikipedia.org/wiki/${page}`,
          });
          found++;
        }
      }
    }
    if (!found) throw new Error(`${src.org}: na Wikipedii jsem nenašel žádné nadcházející akce (změnila se struktura stránky?)`);
  }
  return events;
}

// ---------------------------------------------------------------- Menší MMA (iCal feedy next-fight.com)

function parseIcs(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n"); // rozbalí zalomené řádky
  const unescape = (s) => s.replace(/\\n/gi, "\n").replace(/\\([,;\\])/g, "$1");
  const events = [];
  let cur = null;
  for (const line of lines) {
    if (line === "BEGIN:VEVENT") cur = {};
    else if (line === "END:VEVENT") { if (cur) events.push(cur); cur = null; }
    else if (cur) {
      const i = line.indexOf(":");
      if (i > 0) cur[line.slice(0, i).split(";")[0]] = unescape(line.slice(i + 1));
    }
  }
  return events;
}

// 20261017T133000Z → Date
const icsDate = (s) => new Date(s.replace(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/, (_, y, mo, d, h = "00", mi = "00", se = "00") => `${y}-${mo}-${d}T${h}:${mi}:${se}Z`));

const lastName = (name) => name.trim().split(/\s+/).at(-1);

const WEIGHTS = [
  [/women's\s+/i, "ženy, "], [/light heavyweight/i, "polotěžká váha"], [/heavyweight/i, "těžká váha"],
  [/middleweight/i, "střední váha"], [/welterweight/i, "velterová váha"], [/lightweight/i, "lehká váha"],
  [/featherweight/i, "pérová váha"], [/bantamweight/i, "bantamová váha"], [/strawweight/i, "slámová váha"],
  [/flyweight/i, "muší váha"], [/(\d+)\s*lb catchweight/i, "smluvní váha $1 lb"], [/catchweight/i, "smluvní váha"],
  [/,\s*title/i, ", o titul"],
];
const czWeight = (s) => WEIGHTS.reduce((acc, [re, cz]) => acc.replace(re, cz), s);

async function fetchMmaFeeds() {
  const today = todayStr();
  const events = [];
  for (const src of MMA_FEEDS) {
    const res = await fetch(`https://next-fight.com/api/calendar/${src.feed}.ics?lang=en`, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${src.org}: HTTP ${res.status}`);
    let found = 0;
    for (const e of parseIcs(await res.text())) {
      if (!e.DTSTART || e.STATUS === "CANCELLED") continue;
      const allDay = !e.DTSTART.includes("T");
      const { date, time } = allDay ? { date: `${e.DTSTART.slice(0, 4)}-${e.DTSTART.slice(4, 6)}-${e.DTSTART.slice(6, 8)}` } : localParts(icsDate(e.DTSTART));
      if (date < today) continue;
      // "Main event : Michal Kopas vs Marcel Simo — Featherweight, title"
      const main = e.DESCRIPTION?.match(/Main event\s*:\s*(.+?)\s+vs\.?\s+(.+?)\s+—\s+([^\n]+)/);
      const name = (e.SUMMARY ?? src.org).split(" - ").at(-1).trim();
      const [city, country] = (e.LOCATION ?? "").split(",").map((s) => s.trim()).slice(-2);
      const venue = (e.LOCATION ?? "").split(",").length > 2 ? e.LOCATION.split(",")[0].trim() : undefined;
      events.push({
        id: `${slug(src.org)}-${date}`, category: "mma", org: src.org,
        title: main ? `${name}: ${lastName(main[1])} vs. ${lastName(main[2])}` : name,
        date, time,
        headline: main ? `${main[1]} vs. ${main[2]} (${czWeight(main[3])})` : undefined,
        venue, city, country, url: e.URL,
      });
      found++;
    }
    console.log(`  ${src.org}: ${found}`);
  }
  return events;
}

// ---------------------------------------------------------------- Fotbal (football-data.org)

const normTeam = (s = "") => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/\b(fc|cf|afc|ac|ssc|sk|club|calcio)\b/g, "").replace(/\s+/g, " ").trim();

const STAGES = { LEAGUE_STAGE: "ligová fáze", PLAYOFFS: "play-off", LAST_16: "osmifinále", QUARTER_FINALS: "čtvrtfinále", SEMI_FINALS: "semifinále", FINAL: "finále" };

async function fetchFootball() {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("chybí FOOTBALL_DATA_TOKEN");
  const big = new Set(FOOTBALL.bigClubs.map(normTeam));
  const fav = new Set(FOOTBALL.favoriteTeams.map(normTeam));
  const is = (set, t) => set.has(normTeam(t.name)) || set.has(normTeam(t.shortName));
  const from = todayStr();
  const to = localParts(addDays(FOOTBALL.daysAhead)).date;
  const events = [];

  for (const [code, label] of Object.entries(FOOTBALL.competitions)) {
    const data = await getJson(
      `https://api.football-data.org/v4/competitions/${code}/matches?dateFrom=${from}&dateTo=${to}`,
      { "X-Auth-Token": token }
    );
    for (const m of data.matches ?? []) {
      if (["FINISHED", "CANCELLED", "AWARDED"].includes(m.status)) continue;
      const h = m.homeTeam, a = m.awayTeam;
      const wanted = (is(big, h) && is(big, a)) || is(fav, h) || is(fav, a) || FOOTBALL.allMatchesFromStages.includes(m.stage);
      if (!wanted) continue;
      // Výkop v 00:00 UTC znamená, že čas ještě není určený
      const tbd = m.status === "POSTPONED" || m.utcDate.includes("T00:00:00");
      const { date, time } = tbd ? { date: m.utcDate.slice(0, 10) } : localParts(new Date(m.utcDate));
      const stage = m.stage && m.stage !== "REGULAR_SEASON" ? STAGES[m.stage] ?? m.stage.toLowerCase() : null;
      events.push({
        id: `fd-${m.id}`, category: "football", org: label,
        title: `${h.shortName || h.name || "?"} – ${a.shortName || a.name || "?"}`,
        date, time,
        headline: [stage, m.matchday && `${m.matchday}. kolo`, m.status === "POSTPONED" && "odloženo"].filter(Boolean).join(", ") || undefined,
        venue: m.venue || undefined,
      });
    }
    await new Promise((r) => setTimeout(r, 6500)); // free tier: max 10 požadavků za minutu
  }
  return events;
}

// ---------------------------------------------------------------- Koncerty (Ticketmaster)

async function fetchConcerts() {
  const key = process.env.TICKETMASTER_KEY;
  if (!key) throw new Error("chybí TICKETMASTER_KEY");
  const venues = CONCERTS.bigVenues.map((v) => v.toLowerCase());
  const artists = CONCERTS.favoriteArtists.map((a) => a.toLowerCase());
  const ignore = CONCERTS.ignoreKeywords.map((k) => k.toLowerCase());
  const start = new Date().toISOString().split(".")[0] + "Z";
  const end = addDays(CONCERTS.daysAhead).toISOString().split(".")[0] + "Z";
  const events = [];
  const seen = new Set();

  for (const country of CONCERTS.countries) {
    for (let page = 0; page < 5; page++) {
      const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${key}&classificationName=music&countryCode=${country}` +
        `&startDateTime=${start}&endDateTime=${end}&size=200&page=${page}&sort=date,asc&locale=*`;
      const data = await getJson(url);
      for (const e of data._embedded?.events ?? []) {
        const venue = e._embedded?.venues?.[0] ?? {};
        const performers = (e._embedded?.attractions ?? []).map((a) => a.name);
        const name = e.name ?? "";
        if ([name, ...performers].some((n) => ignore.some((k) => n.toLowerCase().includes(k)))) continue;
        const atBigVenue = venues.some((v) => (venue.name ?? "").toLowerCase().includes(v));
        const favArtist = [name, ...performers].some((n) => artists.some((a) => n.toLowerCase().includes(a)));
        if (!atBigVenue && !favArtist) continue;
        const date = e.dates?.start?.localDate;
        if (!date) continue;
        const dedupeKey = `${date}|${slug(venue.name ?? "")}|${slug(performers[0] ?? name)}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        events.push({
          id: `tm-${e.id}`, category: "concert", org: performers[0] || name, title: name, date,
          time: e.dates.start.localTime?.slice(0, 5),
          venue: venue.name, city: venue.city?.name, country: venue.country?.name, url: e.url,
        });
      }
      if (page + 1 >= (data.page?.totalPages ?? 0)) break;
      await new Promise((r) => setTimeout(r, 250)); // limit 5 požadavků za sekundu
    }
  }
  return events;
}

// ---------------------------------------------------------------- Hlavní běh

async function loadPrevious() {
  try {
    const text = await readFile(OUT_FILE, "utf8");
    return JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch {
    return { sources: {} };
  }
}

const SOURCES = {
  mma: { label: "MMA (Wikipedia)", run: fetchMma },
  mmaFeeds: { label: "Menší MMA (next-fight.com)", run: fetchMmaFeeds },
  football: { label: "Fotbal (football-data.org)", run: fetchFootball },
  concert: { label: "Koncerty (Ticketmaster)", run: fetchConcerts },
};

const prev = await loadPrevious();
const out = { updatedAt: new Date().toISOString(), sources: {} };
let anyOk = false;

for (const [key, src] of Object.entries(SOURCES)) {
  try {
    const events = (await src.run()).map((e) => JSON.parse(JSON.stringify(e))); // zahodí undefined
    out.sources[key] = { label: src.label, ok: true, updatedAt: out.updatedAt, count: events.length, events };
    anyOk = true;
    console.log(`✔ ${src.label}: ${events.length} událostí`);
  } catch (err) {
    const old = prev.sources?.[key];
    out.sources[key] = { label: src.label, ok: false, error: err.message, updatedAt: old?.updatedAt ?? null, count: old?.events?.length ?? 0, events: old?.events ?? [] };
    console.warn(`✘ ${src.label}: ${err.message}${old?.events?.length ? ` (ponechávám ${old.events.length} starších)` : ""}`);
  }
}

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(OUT_FILE, `// Generováno skriptem scripts/update.mjs – needituj ručně.\nconst AUTO_DATA = ${JSON.stringify(out, null, 1)};\n`);
console.log(`Uloženo do data/auto-events.js`);
if (!anyOk) process.exit(1);
