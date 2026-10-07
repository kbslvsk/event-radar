// Ruční seznam událostí (dohledáno 7. 10. 2026).
// Pro kategorie, které stahuje scripts/update.mjs (MMA, fotbal, koncerty), se použije jen tehdy,
// když automatický zdroj nemá žádná data. Tenis automaticky stahovaný není – doplňuj ho tady.
// always: true = zobrazit vždy (akce, které automatický zdroj ještě nemá). Když se pak objeví
// automaticky se stejným id (<org>-<datum>), ruční záznam se nahradí.
// category: mma | football | tennis | concert
// date / endDate: YYYY-MM-DD, time: HH:MM (místní čas akce, nepovinné)

const DEFAULT_EVENTS = [
  // ---------- MMA: UFC ----------
  { id: "ufc-fn-allen-duncan", category: "mma", org: "UFC", title: "UFC Fight Night: Allen vs. Duncan", date: "2026-10-10", city: "Las Vegas", country: "USA" },
  { id: "ufc-fn-buckley-malott", category: "mma", org: "UFC", title: "UFC Fight Night: Buckley vs. Malott", date: "2026-10-17", city: "Edmonton", country: "Kanada" },
  { id: "ufc-333", category: "mma", org: "UFC", title: "UFC 333: Volkanovski vs. Evloev", date: "2026-10-24", city: "Abú Dhabí", country: "SAE", headline: "Titul v pérové váze" },
  { id: "ufc-fn-moicano-nolan", category: "mma", org: "UFC", title: "UFC Fight Night: Moicano vs. Nolan", date: "2026-10-31", city: "Las Vegas", country: "USA" },
  { id: "ufc-fn-bonfim-brady", category: "mma", org: "UFC", title: "UFC Fight Night: Bonfim vs. Brady", date: "2026-11-07", city: "Las Vegas", country: "USA" },
  { id: "ufc-msg", category: "mma", org: "UFC", title: "UFC MSG: Gane vs. Hokit", date: "2026-11-14", venue: "Madison Square Garden", city: "New York", country: "USA", headline: "Titul v těžké váze" },
  { id: "ufc-fn-prochazka-stirling", category: "mma", org: "UFC", title: "UFC Fight Night: Procházka vs. Stirling", date: "2026-11-21", city: "Dauhá", country: "Katar", headline: "Jiří Procházka v hlavním zápase" },
  { id: "ufc-335", category: "mma", org: "UFC", title: "UFC 335: Oliveira vs. Lopes", date: "2026-12-12", city: "Las Vegas", country: "USA" },

  // ---------- MMA: OKTAGON ----------
  { id: "okt-95", category: "mma", org: "OKTAGON", title: "OKTAGON 95: Kincl vs. Humburger", date: "2026-10-17", venue: "Mattoni Arena", city: "Karlovy Vary", country: "ČR" },
  { id: "okt-96", category: "mma", org: "OKTAGON", title: "OKTAGON 96: Gogoladze vs. Klinkhammer", date: "2026-10-31", venue: "SAP Garden", city: "Mnichov", country: "Německo" },
  { id: "okt-97", category: "mma", org: "OKTAGON", title: "OKTAGON 97: Severino vs. Holzer", date: "2026-11-07", venue: "ZAG Arena", city: "Hannover", country: "Německo" },
  { id: "okt-cage-game-2", category: "mma", org: "OKTAGON", title: "Tipsport Cage Game 2: Pruyem vs. Jovinečko", date: "2026-11-11", venue: "BOBYHALL", city: "Brno", country: "ČR" },
  { id: "okt-98", category: "mma", org: "OKTAGON", title: "OKTAGON 98: Legierski vs. Buchinger", date: "2026-11-21", venue: "Werk Arena", city: "Třinec", country: "ČR" },
  { id: "okt-99", category: "mma", org: "OKTAGON", title: "OKTAGON 99: Dortmund", date: "2026-12-05", venue: "Westfalenhalle", city: "Dortmund", country: "Německo" },
  { id: "okt-100", category: "mma", org: "OKTAGON", title: "OKTAGON 100: Praha", date: "2026-12-29", venue: "O2 arena", city: "Praha", country: "ČR", headline: "Jubilejní 100. turnaj" },

  // ---------- MMA: KSW ----------
  { id: "ksw-122", category: "mma", org: "KSW", title: "KSW 122: Yakymenko vs. Morelli", date: "2026-10-10", venue: "Hala Podpromie", city: "Rzeszów", country: "Polsko", headline: "Titul v bantamové váze" },
  { id: "ksw-123", category: "mma", org: "KSW", title: "KSW 123: Bartosiński vs. Łopaczyk", date: "2026-11-21", venue: "Netto Arena", city: "Štětín", country: "Polsko", headline: "Titul ve velterové váze" },
  { id: "ksw-124", category: "mma", org: "KSW", title: "KSW 124: Pawlak vs. Kuberski", date: "2026-12-19", venue: "PreZero Arena", city: "Gliwice", country: "Polsko", headline: "Titul ve střední váze" },

  // ---------- MMA: PFL ----------
  { id: "pfl-africa-morocco", category: "mma", org: "PFL", title: "PFL Africa: Morocco", date: "2026-10-10", city: "Casablanca", country: "Maroko" },
  { id: "pfl-chicago", category: "mma", org: "PFL", title: "PFL Chicago: Carmouche vs. Bishop 2", date: "2026-10-16", city: "Chicago", country: "USA" },
  { id: "pfl-dubai", category: "mma", org: "PFL", title: "PFL Dubai: Nemkov vs. Bilostenniy", date: "2026-11-14", city: "Dubaj", country: "SAE" },
  { id: "pfl-lyon", category: "mma", org: "PFL", title: "PFL Lyon: Lapilus vs. McKee", date: "2026-12-19", city: "Lyon", country: "Francie" },

  // ---------- MUAY THAI: PML ----------
  { id: "pml-2026-11-28", always: true, category: "mma", org: "PML", title: "PML 22", date: "2026-11-28", time: "17:30", venue: "Zimný štadión P. Demitru", city: "Trenčín", country: "Slovensko", headline: "Professional Muaythai League", url: "https://7sport.sk/program/professional-muay-thai-league/" },

  // ---------- FOTBAL ----------
  { id: "pl-liv-mci", category: "football", org: "Premier League", title: "Liverpool – Manchester City", date: "2026-10-10", venue: "Anfield", city: "Liverpool", country: "Anglie" },
  { id: "ucl-md2", category: "football", org: "Liga mistrů", title: "LM 2. kolo: Man City – PSG, Barcelona – Atlético", date: "2026-10-13", endDate: "2026-10-14", headline: "Přesný den zápasů ověř u UEFA" },
  { id: "ucl-md3", category: "football", org: "Liga mistrů", title: "LM 3. kolo: PSG – Barcelona, Bayern – Arsenal", date: "2026-10-20", endDate: "2026-10-21" },
  { id: "pl-che-tot", category: "football", org: "Premier League", title: "Chelsea – Tottenham", date: "2026-10-24", venue: "Stamford Bridge", city: "Londýn", country: "Anglie" },
  { id: "laliga-clasico-1", category: "football", org: "La Liga", title: "El Clásico: Barcelona – Real Madrid", date: "2026-10-25", time: "21:00", venue: "Camp Nou", city: "Barcelona", country: "Španělsko" },
  { id: "pl-liv-ars", category: "football", org: "Premier League", title: "Liverpool – Arsenal", date: "2026-10-31", venue: "Anfield", city: "Liverpool", country: "Anglie" },
  { id: "ucl-md4", category: "football", org: "Liga mistrů", title: "LM 4. kolo: Atlético – Bayern, Villarreal – PSG", date: "2026-11-03", endDate: "2026-11-04" },
  { id: "pl-liv-mun", category: "football", org: "Premier League", title: "Liverpool – Manchester United", date: "2026-11-21", venue: "Anfield", city: "Liverpool", country: "Anglie" },
  { id: "ucl-md5", category: "football", org: "Liga mistrů", title: "LM 5. kolo", date: "2026-11-24", endDate: "2026-11-25" },
  { id: "laliga-clasico-2", category: "football", org: "La Liga", title: "El Clásico: Real Madrid – Barcelona", date: "2027-05-08", endDate: "2027-05-09", venue: "Santiago Bernabéu", city: "Madrid", country: "Španělsko", headline: "Přesný den bude upřesněn" },

  // ---------- TENIS ----------
  { id: "atp-finals-2026", category: "tennis", org: "ATP", title: "Nitto ATP Finals", date: "2026-11-15", endDate: "2026-11-22", venue: "Pala Alpitour", city: "Turín", country: "Itálie", headline: "Turnaj mistrů – 8 nejlepších hráčů sezóny" },
  { id: "ao-2027", category: "tennis", org: "Grand Slam", title: "Australian Open 2027", date: "2027-01-17", endDate: "2027-01-31", venue: "Melbourne Park", city: "Melbourne", country: "Austrálie", headline: "Hlavní soutěž, finále 30. a 31. 1." },

  // ---------- KONCERTY ----------
  { id: "c-europe-vienna", category: "concert", org: "Europe", title: "Europe", date: "2026-10-17", venue: "Raiffeisen Halle im Gasometer", city: "Vídeň", country: "Rakousko" },
  { id: "c-amon-amarth", category: "concert", org: "Amon Amarth", title: "Amon Amarth – The Allfather Awakens", date: "2026-11-07", venue: "O2 arena", city: "Praha", country: "ČR" },
  { id: "c-kabat", category: "concert", org: "Kabát", title: "Kabát", date: "2026-11-11", venue: "O2 arena", city: "Praha", country: "ČR" },
  { id: "c-korn", category: "concert", org: "KoRn", title: "KoRn – Euro Tour 2026", date: "2026-11-16", venue: "O2 arena", city: "Praha", country: "ČR" },
  { id: "c-prodigy", category: "concert", org: "The Prodigy", title: "The Prodigy", date: "2026-11-23", venue: "O2 arena", city: "Praha", country: "ČR" },
  { id: "c-brightman", category: "concert", org: "Sarah Brightman", title: "Sarah Brightman – A Winter Symphony", date: "2026-11-26", venue: "O2 arena", city: "Praha", country: "ČR" },
  { id: "c-lindemann-vienna", category: "concert", org: "Till Lindemann", title: "Till Lindemann", date: "2026-11-29", venue: "Wiener Stadthalle", city: "Vídeň", country: "Rakousko" },
  { id: "c-bryan-adams", category: "concert", org: "Bryan Adams", title: "Bryan Adams – Roll with the Punches", date: "2026-12-13", venue: "O2 arena", city: "Praha", country: "ČR" },
  { id: "c-lindemann-prague", category: "concert", org: "Till Lindemann", title: "Till Lindemann", date: "2026-12-18", venue: "O2 arena", city: "Praha", country: "ČR" },
];
