// Nastavení automatické aktualizace. Uprav podle sebe a pushni – další běh to použije.

export const MMA_SOURCES = [
  // Wikipedia stránky s tabulkou turnajů. {year} se nahradí letošním a příštím rokem.
  { org: "UFC", pages: ["List_of_UFC_events"] },
  { org: "OKTAGON", pages: ["{year}_in_Oktagon_MMA"] },
  { org: "KSW", pages: ["{year}_in_Konfrontacja_Sztuk_Walki"] },
  { org: "PFL", pages: ["{year}_in_Professional_Fighters_League"] },
];

// Menší MMA organizace z kalendářových feedů next-fight.com.
// feed = část adresy https://next-fight.com/en/organization/<feed> (seznam: https://next-fight.com/en/mma-organizations)
export const MMA_FEEDS = [
  { org: "RFA", feed: "real-fight-arena" },
];

export const FOOTBALL = {
  daysAhead: 270, // do konce sezóny
  // Kódy soutěží z football-data.org (zdarma: PL, CL, PD, BL1, SA, FL1, DED, PPL, ELC, BSA, WC, EC)
  competitions: {
    CL: "Liga mistrů",
    PL: "Premier League",
    PD: "La Liga",
    BL1: "Bundesliga",
    SA: "Serie A",
  },
  // Zobrazí se zápasy, kde proti sobě hrají dva z těchto klubů…
  bigClubs: [
    "Arsenal", "Chelsea", "Liverpool", "Manchester City", "Manchester United", "Tottenham Hotspur",
    "Barcelona", "Real Madrid", "Atlético de Madrid",
    "Bayern München", "Borussia Dortmund", "Bayer 04 Leverkusen",
    "Juventus", "Internazionale Milano", "Milan", "Napoli",
    "Paris Saint-Germain",
  ],
  // …a VŠECHNY zápasy těchto klubů
  favoriteTeams: ["Slavia Praha", "Sparta Praha", "Viktoria Plzeň"],
  // V těchto fázích Ligy mistrů se zobrazí všechny zápasy
  allMatchesFromStages: ["QUARTER_FINALS", "SEMI_FINALS", "FINAL"],
};

export const CONCERTS = {
  daysAhead: 365,
  countries: ["CZ", "SK", "AT"],
  // Koncerty v těchto halách/stadionech se berou vždy (stačí část názvu)
  bigVenues: [
    "O2 arena", "Letňany", "Fortuna Arena", "Eden Arena", "Stadion Strahov", "Sportovní hala Fortuna",
    "Tipos aréna", "Národný futbalový štadión",
    "Wiener Stadthalle - Halle D", "Ernst-Happel", "Ernst Happel",
    // "O2 universum", "Forum Karlín", // menší haly – odkomentuj, jestli chceš víc koncertů
  ],
  // Tihle interpreti se zobrazí kdekoli ve vybraných zemích
  favoriteArtists: ["Metallica", "Coldplay", "Ed Sheeran", "Imagine Dragons", "Linkin Park", "The Weeknd", "Taylor Swift"],
  // Položky s těmito slovy v názvu nebo u interpreta se přeskočí (VIP balíčky, tribute kapely…)
  ignoreKeywords: ["VIP", "Parking", "Parkování", "Package", "Upgrade", "Hospitality", "Gift", "Fast Track", "Tribute"],
};
