const CATEGORIES = {
  mma: { label: "MMA", color: "var(--mma)" },
  football: { label: "Fotbal", color: "var(--football)" },
  tennis: { label: "Tenis", color: "var(--tennis)" },
  concert: { label: "Koncerty", color: "var(--concert)" },
};

const MONTHS = ["leden", "únor", "březen", "duben", "květen", "červen", "červenec", "srpen", "září", "říjen", "listopad", "prosinec"];
const MONTHS_SHORT = ["led", "úno", "bře", "dub", "kvě", "čvn", "čvc", "srp", "zář", "říj", "lis", "pro"];
const WEEKDAYS = ["ne", "po", "út", "st", "čt", "pá", "so"];

const STORE_WATCH = "eventRadar.watchlist";
const STORE_CUSTOM = "eventRadar.custom";

const load = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const state = {
  view: "list",
  search: "",
  categories: new Set(),
  orgs: new Set(),
  showPast: false,
  watchlist: new Set(load(STORE_WATCH, [])),
  custom: load(STORE_CUSTOM, []),
};

// ---------- Helpers ----------
const $ = (sel) => document.querySelector(sel);

const parseDate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

const today = () => {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
};

const isPast = (ev) => parseDate(ev.endDate || ev.date) < today();

const daysUntil = (ev) => Math.round((parseDate(ev.date) - today()) / 86400000);

function relativeLabel(ev) {
  if (isPast(ev)) return "Proběhlo";
  const d = daysUntil(ev);
  if (d <= 0) return ev.endDate ? "Právě probíhá" : "Dnes!";
  if (d === 1) return "Zítra";
  if (d < 5) return `Za ${d} dny`;
  if (d < 60) return `Za ${d} dní`;
  const months = Math.round(d / 30);
  return `Za ${months} ${months < 5 ? "měsíce" : "měsíců"}`;
}

function formatRange(ev) {
  const a = parseDate(ev.date);
  let s = `${WEEKDAYS[a.getDay()]} ${a.getDate()}. ${a.getMonth() + 1}. ${a.getFullYear()}`;
  if (ev.endDate) {
    const b = parseDate(ev.endDate);
    s = `${a.getDate()}. ${a.getMonth() + 1}. – ${b.getDate()}. ${b.getMonth() + 1}. ${b.getFullYear()}`;
  }
  if (ev.time) s += `, ${ev.time}`;
  return s;
}

const place = (ev) => [ev.venue, ev.city, ev.country].filter(Boolean).join(", ");

const escapeHtml = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const AUTO = typeof AUTO_DATA !== "undefined" ? AUTO_DATA : { sources: {} };
const autoEvents = Object.values(AUTO.sources).flatMap((s) => s.events);
const autoCategories = new Set(autoEvents.map((e) => e.category));
// Ruční data z data.js se použijí jen pro kategorie, které automatika nepokrývá (tenis, nebo když zdroj nemá data)
const manualEvents = DEFAULT_EVENTS.filter((e) => !autoCategories.has(e.category));

const allEvents = () =>
  [...autoEvents, ...manualEvents, ...state.custom].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

function filteredEvents({ onlyWatched = false } = {}) {
  const q = state.search.trim().toLowerCase();
  return allEvents().filter((ev) => {
    if (onlyWatched && !state.watchlist.has(ev.id)) return false;
    if (!state.showPast && isPast(ev)) return false;
    if (state.categories.size && !state.categories.has(ev.category)) return false;
    if (state.orgs.size && !state.orgs.has(ev.org)) return false;
    if (q) {
      const hay = [ev.title, ev.org, ev.venue, ev.city, ev.country, ev.headline].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function groupByMonth(events) {
  const groups = new Map();
  for (const ev of events) {
    const d = parseDate(ev.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, { label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, events: [] });
    groups.get(key).events.push(ev);
  }
  return [...groups.values()];
}

// ---------- Watchlist ----------
function toggleWatch(id) {
  state.watchlist.has(id) ? state.watchlist.delete(id) : state.watchlist.add(id);
  save(STORE_WATCH, [...state.watchlist]);
  render();
}

function deleteCustom(id) {
  if (!confirm("Smazat tuto vlastní událost?")) return;
  state.custom = state.custom.filter((e) => e.id !== id);
  state.watchlist.delete(id);
  save(STORE_CUSTOM, state.custom);
  save(STORE_WATCH, [...state.watchlist]);
  render();
}

// ---------- Rendering ----------
function renderChips() {
  const catWrap = $("#category-chips");
  catWrap.innerHTML = Object.entries(CATEGORIES)
    .map(([key, c]) => `
      <button class="chip ${state.categories.has(key) ? "active" : ""}" data-cat="${key}">
        <span class="dot" style="background:${c.color}"></span>${c.label}
      </button>`)
    .join("");

  // Organizace se nabízí jen pro vybrané kategorie (nebo všechny, když není nic vybráno).
  // Interpretů je moc, ty se hledají přes vyhledávání.
  const orgs = [...new Set(
    allEvents()
      .filter((e) => e.category !== "concert" && (!state.categories.size || state.categories.has(e.category)))
      .map((e) => e.org)
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, "cs"));
  for (const o of state.orgs) if (!orgs.includes(o)) state.orgs.delete(o);

  $("#org-chips").innerHTML = orgs
    .map((o) => `<button class="chip ${state.orgs.has(o) ? "active" : ""}" data-org="${escapeHtml(o)}">${escapeHtml(o)}</button>`)
    .join("");
}

function starButton(ev) {
  const on = state.watchlist.has(ev.id);
  return `<button class="star ${on ? "on" : ""}" data-watch="${ev.id}" title="${on ? "Odebrat z mého seznamu" : "Přidat do mého seznamu"}">${on ? "★" : "☆"}</button>`;
}

function extras(ev) {
  const parts = [];
  if (ev.url) parts.push(`<a href="${escapeHtml(ev.url)}" target="_blank" rel="noopener">Odkaz ↗</a>`);
  if (ev.custom) parts.push(`<button class="delete" data-delete="${ev.id}">Smazat</button>`);
  return parts.join(" ");
}

function cardHtml(ev) {
  const d = parseDate(ev.date);
  const cat = CATEGORIES[ev.category];
  const past = isPast(ev);
  return `
    <article class="card ${past ? "past" : ""}" style="--cat:${cat.color}">
      <div class="card-top">
        <div class="date-box">
          <div class="day">${d.getDate()}</div>
          <div class="rest">${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}<br>${WEEKDAYS[d.getDay()]}${ev.time ? " · " + ev.time : ""}</div>
        </div>
        ${starButton(ev)}
      </div>
      <span class="org-tag">${escapeHtml(ev.org || cat.label)}</span>
      <h3>${escapeHtml(ev.title)}</h3>
      <div class="where">${[escapeHtml(place(ev)), ev.endDate && formatRange(ev)].filter(Boolean).join(" · ")}</div>
      ${ev.headline ? `<div class="headline">${escapeHtml(ev.headline)}</div>` : ""}
      <div class="card-bottom">
        <span class="when ${past ? "past" : ""}">${relativeLabel(ev)}</span>
        <span>${extras(ev)}</span>
      </div>
    </article>`;
}

function renderList(events) {
  if (!events.length) return emptyHtml("Nic neodpovídá filtrům.");
  return groupByMonth(events)
    .map((g) => `<h2 class="month-heading">${g.label}</h2><div class="grid">${g.events.map(cardHtml).join("")}</div>`)
    .join("");
}

function renderTimeline(events) {
  if (!events.length) return emptyHtml("Nic neodpovídá filtrům.");
  const t = today();
  let html = `<div class="timeline">`;
  let side = 0;
  let todayShown = false;
  for (const g of groupByMonth(events)) {
    html += `<div class="tl-month"><span>${g.label}</span></div>`;
    for (const ev of g.events) {
      if (!todayShown && parseDate(ev.date) >= t) {
        html += `<div class="tl-today"><span>DNES</span></div>`;
        todayShown = true;
      }
      const cat = CATEGORIES[ev.category];
      html += `
        <div class="tl-row ${side++ % 2 ? "right" : "left"}" style="--cat:${cat.color}">
          <div class="tl-dot"></div>
          <div class="tl-item ${isPast(ev) ? "past" : ""}">
            <div class="body">
              <div class="tl-date">${formatRange(ev)} · ${relativeLabel(ev)}</div>
              <h4>${escapeHtml(ev.title)}</h4>
              <div class="where">${escapeHtml(ev.org || cat.label)}${place(ev) ? " · " + escapeHtml(place(ev)) : ""}</div>
              ${extras(ev)}
            </div>
            ${starButton(ev)}
          </div>
        </div>`;
    }
  }
  return html + `</div>`;
}

function renderMine(events) {
  const header = `
    <div class="mine-header">
      <p>${$("#watch-count").textContent} sledovaných událostí</p>
      ${state.watchlist.size ? `<button class="btn" id="export-btn">⬇ Exportovat do kalendáře (.ics)</button>` : ""}
    </div>`;
  if (!events.length) {
    return header + emptyHtml(state.watchlist.size
      ? "Žádná sledovaná událost neodpovídá filtrům."
      : "Zatím nic nesleduješ. Klikni na <b>☆</b> u události a objeví se tady i v odpočtu nahoře.");
  }
  return header + renderTimeline(events);
}

const emptyHtml = (msg) => `<div class="empty">${msg}</div>`;

function renderNextUp() {
  const box = $("#next-up");
  const next = allEvents().find((e) => state.watchlist.has(e.id) && !isPast(e));
  if (!next) { box.classList.add("hidden"); return; }
  box.classList.remove("hidden");
  box.dataset.date = next.date;
  box.dataset.time = next.time || "";
  box.innerHTML = `
    <div>
      <div class="label">Nejbližší z mého seznamu</div>
      <div class="title">${escapeHtml(next.title)}</div>
      <div class="meta">${formatRange(next)}${place(next) ? " · " + escapeHtml(place(next)) : ""}</div>
    </div>
    <div class="countdown" id="countdown"></div>`;
  tickCountdown();
}

function tickCountdown() {
  const box = $("#next-up");
  const el = $("#countdown");
  if (!el || box.classList.contains("hidden")) return;
  const [y, m, d] = box.dataset.date.split("-").map(Number);
  const [hh, mm] = (box.dataset.time || "00:00").split(":").map(Number);
  let diff = Math.max(0, new Date(y, m - 1, d, hh, mm) - new Date());
  const days = Math.floor(diff / 86400000); diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000); diff -= hours * 3600000;
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff - mins * 60000) / 1000);
  el.innerHTML = [[days, "dní"], [hours, "hod"], [mins, "min"], [secs, "s"]]
    .map(([v, l]) => `<div><b>${String(v).padStart(2, "0")}</b><span>${l}</span></div>`)
    .join("");
}

function render() {
  renderChips();
  renderNextUp();
  $("#watch-count").textContent = allEvents().filter((e) => state.watchlist.has(e.id)).length;
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === state.view));

  const content = $("#content");
  if (state.view === "list") content.innerHTML = renderList(filteredEvents());
  else if (state.view === "timeline") content.innerHTML = renderTimeline(filteredEvents());
  else content.innerHTML = renderMine(filteredEvents({ onlyWatched: true }));
}

// ---------- iCal export ----------
function exportIcs() {
  const fmt = (s) => s.replaceAll("-", "");
  const nextDay = (s) => {
    const d = parseDate(s); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  };
  const esc = (s = "") => s.replace(/[\\;,]/g, (c) => "\\" + c).replace(/\n/g, "\\n");
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Event Radar//CZ", "CALSCALE:GREGORIAN"];
  for (const ev of allEvents().filter((e) => state.watchlist.has(e.id))) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${ev.id}@event-radar`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART;VALUE=DATE:${fmt(ev.date)}`,
      `DTEND;VALUE=DATE:${nextDay(ev.endDate || ev.date)}`,
      `SUMMARY:${esc(ev.title)}`,
      `LOCATION:${esc(place(ev))}`,
      `DESCRIPTION:${esc([ev.org, ev.time && "Začátek: " + ev.time, ev.headline, ev.url].filter(Boolean).join("\n"))}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");
  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "moje-udalosti.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Events ----------
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-watch],[data-delete],[data-cat],[data-org],[data-view],#export-btn");
  if (!t) return;
  if (t.dataset.watch) return toggleWatch(t.dataset.watch);
  if (t.dataset.delete) return deleteCustom(t.dataset.delete);
  if (t.id === "export-btn") return exportIcs();
  if (t.dataset.view) { state.view = t.dataset.view; return render(); }
  if (t.dataset.cat) {
    const c = t.dataset.cat;
    state.categories.has(c) ? state.categories.delete(c) : state.categories.add(c);
    return render();
  }
  if (t.dataset.org) {
    const o = t.dataset.org;
    state.orgs.has(o) ? state.orgs.delete(o) : state.orgs.add(o);
    return render();
  }
});

$("#search").addEventListener("input", (e) => { state.search = e.target.value; render(); });
$("#show-past").addEventListener("change", (e) => { state.showPast = e.target.checked; render(); });

const dialog = $("#event-dialog");
const form = $("#event-form");
$("#add-btn").addEventListener("click", () => { form.reset(); dialog.showModal(); });
$("#cancel-btn").addEventListener("click", () => dialog.close());

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (data.endDate && data.endDate < data.date) return alert("Datum konce nemůže být před začátkem.");
  const ev = { id: "custom-" + Date.now(), custom: true, category: data.category, title: data.title.trim(), date: data.date };
  for (const k of ["org", "endDate", "time", "venue", "city", "url"]) if (data[k]?.trim()) ev[k] = data[k].trim();
  state.custom.push(ev);
  save(STORE_CUSTOM, state.custom);
  if (data.watch) { state.watchlist.add(ev.id); save(STORE_WATCH, [...state.watchlist]); }
  dialog.close();
  render();
});

function renderUpdateStatus() {
  const fmt = (iso) => new Date(iso).toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
  const parts = Object.values(AUTO.sources).map((s) => {
    if (s.ok) return `<span class="ok">✔ ${escapeHtml(s.label)}: ${s.count}</span>`;
    const fallback = s.count ? `starší data (${s.count}) z ${fmt(s.updatedAt)}` : "používám ruční data";
    return `<span class="fail" title="${escapeHtml(s.error)}">✘ ${escapeHtml(s.label)}: ${escapeHtml(s.error)}, ${fallback}</span>`;
  });
  $("#update-status").innerHTML = AUTO.updatedAt
    ? `Automaticky aktualizováno ${fmt(AUTO.updatedAt)} · ${parts.join(" · ")}`
    : "Automatická data zatím nejsou – používám ruční seznam.";
}

setInterval(tickCountdown, 1000);
renderUpdateStatus();
render();
