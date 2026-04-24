/**
 * Curated name pools for forgeNameEngine — era-grounded, personality-filtered; not one global "dark gothic" list.
 * f = feminine-leaning, m = masculine-leaning, x = unisex / neutral-friendly.
 */
export type NameGender = "f" | "m" | "x";

export type NameBank = { f: readonly string[]; m: readonly string[]; x: readonly string[] };
export type SurnamePool = readonly string[] | null;

const stripDupes = (a: string[]) => [...new Set(a.map((s) => s.trim()).filter(Boolean))];

export const BANK_MODERN: NameBank = {
  f: stripDupes([
    "Riley", "Zoey", "Harper", "Lexi", "Maya", "Jenna", "Chloe", "Natalie", "Skylar", "Morgan", "Priya", "Lily",
    "Hannah", "Sophia", "Zoe", "Emma", "Olivia", "Madison", "Avery", "Kendall", "Brielle", "Dani", "Elle", "Gracie",
    "Ivy", "Jade", "Kinsley", "Luna", "Nora", "Paige", "Quinn", "Ruby", "Sienna", "Tessa", "Violet", "Willow", "Ari",
  ]),
  m: stripDupes([
    "Dylan", "Cole", "Jordan", "Jake", "Finn", "Omar", "Devin", "Tyler", "Noah", "Kai", "Gavin", "Aidan", "Brett",
    "Derek", "Ethan", "Felix", "Gabe", "Hunter", "Jesse", "Leo", "Marcus", "Nico", "Owen", "Parker", "Reid", "Seth",
    "Tristan", "Vince", "Wes", "Xavier", "Yuri", "Zain", "Alec", "Brady", "Cam", "Drew", "Evan", "Grant", "Hugo",
  ]),
  x: stripDupes([
    "Jordan", "River", "Avery", "Riley", "Parker", "Kai", "Morgan", "Cameron", "Skylar", "Peyton", "Rowan", "Sage",
    "Jules", "Alex", "Sydney", "Casey", "Ellis", "Kendall", "Remi", "Sam", "Sloane", "Tatum", "Quinn", "Dakota", "Reese",
    "Reign", "Lane", "Bay", "Ash", "Ocean", "Sky", "Stormy", "Indigo", "Cedar", "Phoenix", "Harper", "Charlie", "Sawyer",
  ]),
};

export const SURNAME_MODERN: SurnamePool = null;

export const BANK_MEDIEVAL: NameBank = {
  f: stripDupes([
    "Elowen", "Isolde", "Giselle", "Brigid", "Astrid", "Eira", "Freya", "Isla", "Liora", "Maren", "Nerys", "Oona",
    "Riona", "Willa", "Alys", "Brynn", "Clara", "Elise", "Fenella", "Giselle", "Hilda", "Iseult", "Jocelyn", "Kira", "Lara",
  ]),
  m: stripDupes([
    "Gareth", "Caelan", "Darian", "Ewan", "Roland", "Tristan", "Alaric", "Anselm", "Bjorn", "Cade", "Duncan", "Edric",
    "Faris", "Garrett", "Hugh", "Ivor", "Kael", "Leif", "Osric", "Percival", "Quinlan", "Roric", "Sigurd", "Torin", "Ulric",
  ]),
  x: stripDupes([
    "Rowan", "Sorrel", "Avery", "Briar", "Clove", "Eden", "Lark", "Wren", "Sable", "Ash", "Ember", "Fenn", "Joss", "Sage",
    "Iris", "Hollis", "Maris", "Rain", "West", "True", "Reign", "Cyan", "Indigo", "Cedar", "Quill", "Fable", "Glen", "Briar",
  ]),
};

export const SURNAME_MEDIEVAL: SurnamePool = stripDupes([
  "Blackwood", "Ashford", "Carrick", "Drummond", "Eddington", "Fairclough", "Garrick", "Hartwell", "Ironside", "Kingsley", "Lancaster", "Merrick", "Northcote", "Pembroke", "Quinlan", "Rutherford", "Sutherland", "Trelawney", "Underwood", "Whitmore", "Yardley", "Alden", "Bronte", "Craven", "Dunlow",
]);

export const BANK_GREEK: NameBank = {
  f: stripDupes([
    "Elara", "Phoebe", "Selene", "Thalia", "Daphne", "Iris", "Lyra", "Rhea", "Thea", "Ariadne", "Eirene", "Eulalia", "Hebe", "Ione", "Io", "Jocasta", "Klytie", "Leda", "Andromache", "Callirhoe", "Damia", "Eudokia", "Galatea", "Hekate", "Kore", "Lysandra", "Myrine", "Nerissa", "Phaedra", "Xenia", "Zoe", "Cassandra",
  ]),
  m: stripDupes([
    "Evander", "Hector", "Ilyas", "Leander", "Orion", "Taras", "Aeson", "Castor", "Damon", "Dorian", "Helios", "Icarus", "Lucian", "Lysias", "Nereus", "Orestes", "Pallas", "Perseus", "Soran", "Thales", "Xandros", "Zale", "Aristo", "Cosmas", "Demetrios", "Euripides", "Galan", "Heron", "Kleitos", "Myron", "Nikos", "Orestor",
  ]),
  x: stripDupes([
    "Aster", "Echo", "Eris", "Phoenix", "Halcyon", "Themis", "Aether", "Cosmo", "Delta", "Eos", "Halo", "Iris", "Juno", "Kai", "Lumen", "Memphis", "Mytho", "Oracle", "Pallas", "Scout", "Seleneo", "Tempo", "Sunny", "Lyric", "Sky", "Hero", "Artemis", "Asteria", "Pallas", "Zoe",
  ]),
};

export const SURNAME_GREEK: SurnamePool = null;

export const BANK_VICTORIAN: NameBank = {
  f: stripDupes([
    "Eloise", "Genevieve", "Josephine", "Clara", "Clementine", "Dorothea", "Evelyn", "Florence", "Greta", "Imogen", "Louisa", "Matilda", "Penelope", "Violet", "Beatrice", "Cordelia", "Edith", "Evangeline", "Fiona", "Harriet", "Ivy", "Jemima", "Katherine", "Mildred", "Nora", "Prudence", "Tabitha", "Ursula", "Winifred", "Agnes",
  ]),
  m: stripDupes([
    "Alfred", "Ambrose", "Benedict", "Clement", "Cyril", "Edgar", "Frederick", "Harold", "Julian", "Lawrence", "Maurice", "Oscar", "Percival", "Rupert", "Seymour", "Sydney", "Tobias", "Victor", "Alistair", "Barnaby", "Cecil", "Edmund", "Fergus", "Giles", "Humphrey", "Ivor", "Lionel", "Nigel", "Reginald", "Sydney", "Walter",
  ]),
  x: stripDupes([
    "Morgan", "Aubrey", "Eden", "Evel", "Fenn", "Hart", "Ivy", "Marlowe", "Morgan", "Pember", "Sydney", "Vale", "Cairo", "Ember", "Fern", "Garnet", "Indigo", "Jori", "Linden", "Merril", "Novel", "Quent", "Remi", "Stone", "Temple", "Umber", "Vale", "Wren", "Aster", "Reign", "Brix",
  ]),
};

export const SURNAME_VICTORIAN: SurnamePool = stripDupes([
  "Ashford", "Blackwood", "Carstairs", "Ellingworth", "Fairfax", "Hartwell", "Kingsley", "Pembry", "Rutherford", "Sutherland", "Thatchwell", "Whitmore", "Crawford", "Darcy", "Everett", "Fairclough", "Gresham", "Hollis", "Kerridge", "Lockwood", "Merridew", "Northcote", "Pritchard", "Ransome", "Stratford", "Wentworth", "Aldridge", "Bremworth",
]);

export const BANK_CYBER: NameBank = {
  f: stripDupes([
    "Astra", "Jinx", "Nova", "Kira", "Lumen", "Mika", "Rin", "Yumi", "Asha", "Byte", "Cyra", "Dij", "Echoa", "Fluxa", "Helixa", "Iso", "Jinxer", "Kestra", "Luma", "Miraq", "Neon", "Orin", "Pix", "Qira", "Riva", "Soraq", "Tess", "Unita", "Vespa", "Wira", "Xae", "Yin", "Zor",
  ]),
  m: stripDupes([
    "Axon", "Cipher", "Evo", "Gage", "Jett", "Kade", "Neo", "Rex", "Soren", "Volt", "Axiom", "Cypher", "Droid", "Flux", "Grid", "Holo", "Ion", "Jettz", "Kest", "Linx", "Matrix", "Nix", "Orin", "Pixel", "Rook", "Shard", "Trace", "Vexa", "Wire", "Xer", "Zenon", "Zeroq",
  ]),
  x: stripDupes([
    "Glitch", "Pixel", "Echo", "Nix", "Rune", "Quark", "Volt", "Bex", "Cy", "Dex", "Fenn", "Hexa", "Jetx", "Lexa", "Minx", "Nyxx", "Pyx", "Qui", "Rex", "Synco", "Texa", "Vala", "Wex", "Zan", "Ax", "Bix", "Cal", "Dax", "Emm", "Fynn", "Jix", "Kem",
  ]),
};

export const SURNAME_CYBER: SurnamePool = null;

export const BANK_APOC: NameBank = {
  f: stripDupes([
    "Sunny", "Wren", "Sage", "Dusti", "Marlow", "Rivera", "Scout", "Shiloh", "Asha", "Blaze", "Cinder", "Etta", "Ginny", "Haven", "Jolie", "Kess", "Lark", "Minow", "Nova", "Opal", "Remi", "Ria", "Salom", "Tess", "Vesper", "Zarae", "Ash", "Bliss", "Dawn", "Fawn", "Glimmer", "Halo",
  ]),
  m: stripDupes([
    "Ash", "Cobalt", "Flint", "Grit", "Hawk", "Jet", "Knox", "Marek", "Rusty", "Verge", "Jett", "Cruz", "Drift", "Gann", "Iron", "Kest", "Locke", "Marrow", "Nash", "Pace", "Ridge", "Slate", "Tank", "Ulf", "Vash", "Wes", "Zan", "Archer", "Brick", "Cinder", "Deke", "Ecko",
  ]),
  x: stripDupes([
    "Ash", "Cinder", "Dusty", "Marlowe", "Remi", "Rivero", "Shade", "Sora", "Storme", "Flinty", "Graye", "Hazey", "Ivy", "Jest", "Kite", "Lest", "Mist", "Northo", "Oak", "Pineo", "Reigno", "Sal", "Sora", "Tide", "Vex", "West", "Zed", "Arrow", "Baye", "Comet", "Dune", "Ecko",
  ]),
};

export const SURNAME_APOC: SurnamePool = null;

export const BANK_DARK: NameBank = {
  f: stripDupes([
    "Morgana", "Morwen", "Seris", "Thalira", "Vespera", "Drusilla", "Elvira", "Garnis", "Ishtar", "Korvy", "Obsidia", "Rivena", "Sable", "Vexia", "Bansh", "Calig", "Drevis", "Ebol", "Feral", "Gris", "Hekat", "Irk", "Jadis", "Korvin", "Lyss", "Malin", "Nix", "Orlokv", "Pyreth", "Thren", "Umbri", "Vork",
  ]),
  m: stripDupes([
    "Draen", "Malakai", "Morde", "Nihil", "Strahd", "Thann", "Vorath", "Baelo", "Cinder", "Drav", "Ebol", "Grim", "Havok", "Jorick", "Korv", "Lorn", "Malin", "Orlokm", "Pyre", "Rook", "Shad", "Thul", "Umbrae", "Vor", "Wraithn", "Zorath", "Acher", "Blight", "Dreven", "Grend", "Malak", "Nihilo",
  ]),
  x: stripDupes([
    "Blight", "Dre", "Gloom", "Hollowm", "Malx", "Noctis", "Omena", "Reap", "Shad", "Umbor", "Vex", "Abyx", "Crypta", "Drexx", "Erebo", "Grom", "Hekk", "Infera", "Jad", "Korr", "Nulla", "Pyro", "Rendu", "Shade", "Thor", "Umbo", "Voida", "Wex", "Axx", "Bly", "Crix", "Dre",
  ]),
};

export const SURNAME_DARK: SurnamePool = stripDupes([
  "Dreadmarch", "Nightbane", "Shadowmere", "Grimholt", "Voidbloom", "Morwenhollow", "Blightfen", "Darkharrow", "Ashencrown", "Cinderfall", "Ebonmire", "Fellwinter", "Gloomwraith", "Hollowmarch", "Ironbane", "Jaggedrift", "Korvinthrall", "Lostgrave", "Mourningveil", "Nightharrow", "Obsidvale", "Palethorn", "Rivenmoor", "Shadowfen", "Thronewraith", "Umbrivale", "Vilecourt", "Widowmere", "Xyrevale", "Duskhall",
]);

export const BANK_EGYPT: NameBank = {
  f: stripDupes([
    "Amani", "Anippe", "Asha", "Bastet", "Dendera", "Ebonee", "Hasina", "Khepria", "Lotis", "Maat", "Nubia", "Nefre", "Oma", "Pili", "Rania", "Safiya", "Tiye", "Zahra", "Amonet", "Cleo", "Djamila", "Esi", "Faru", "Heqet", "Isis", "Jendayi", "Kareem", "Layla", "Merit", "Noura", "Opet", "Sati",
  ]),
  m: stripDupes([
    "Amen", "Aziz", "Barak", "Hapir", "Horo", "Menk", "Nadim", "Osri", "Ramsa", "Sefir", "Tarek", "Tarii", "Zed", "Amun", "Beso", "Dewar", "Fenrik", "Gizan", "Hakim", "Jabari", "Kamor", "Lapis", "Memi", "Nadif", "Okir", "Pili", "Sef", "Bariq", "Faruq", "Hapi", "Kef",
  ]),
  x: stripDupes([
    "Ankh", "Bennu", "Delta", "Heka", "Nilas", "Oasis", "Ra", "Sphinx", "Thoth", "Aton", "Fenn", "Giza", "Jed", "Khep", "Luxor", "Nef", "Pil", "Resh", "Seta", "Tef", "Unas", "Wen", "Zer", "Horus", "Iset", "Merit", "On", "Papy", "Ramses", "Sobek", "Amon", "Benn",
  ]),
};

export const SURNAME_EGYPT: SurnamePool = null;

export const BANK_80S: NameBank = {
  f: stripDupes([
    "Tiffany", "Stacy", "Heather", "Brittany", "Lindsay", "Amber", "Melody", "Courtney", "Christie", "Cindy", "Dana", "Felicia", "Gretchen", "Holly", "Jami", "Kelli", "Mandy", "Nikki", "Pami", "Robyn", "Sammie", "Tami", "Wendy", "Yvonne", "Aimee", "Bambi", "Carrie", "Darcy", "Elle", "Fran", "Ginger", "Hollye",
  ]),
  m: stripDupes([
    "Brett", "Chad", "Derek", "Jason", "Kyle", "Matt", "Scott", "Steve", "Brad", "Brian", "Chris", "Danny", "Eddie", "Frank", "Glen", "Hank", "Ivan", "Jeff", "Keith", "Lance", "Mark", "Nick", "Paul", "Randy", "Todd", "Bryan", "Craig", "Davey", "Doug", "Erik", "Floyd", "Gary",
  ]),
  x: stripDupes([
    "Dana", "Jamie", "Jesse", "Kris", "Lee", "Morgan", "Pat", "Sam", "Sydney", "Terry", "Val", "Aeryn", "Blair", "Corey", "Dale", "Eddie", "Flynn", "Gale", "Hani", "Ira", "Jace", "Lane", "Max", "Nori", "Ollie", "Pey", "Rae", "Sagey", "Toni", "Vali", "Wes", "Remy",
  ]),
};

export const SURNAME_80S: SurnamePool = null;

export const BANK_JAPAN: NameBank = {
  f: stripDupes([
    "Aiko", "Hana", "Hikari", "Kiko", "Mei", "Mio", "Sakura", "Yui", "Yuna", "Ami", "Emi", "Haruna", "Kaede", "Keiko", "Miko", "Nana", "Noriko", "Rin", "Rina", "Tomo", "Yume", "Aya", "Chinatsu", "Etsuko", "Fumiko", "Hinata", "Junna", "Kiko", "Mariko", "Nori", "Rei", "Sakae",
  ]),
  m: stripDupes([
    "Daiki", "Haruto", "Hiro", "Jun", "Kaito", "Kenji", "Kenta", "Ren", "Ryo", "Shin", "Sora", "Taichi", "Taro", "Yuto", "Aki", "Daisuke", "Eiji", "Fumio", "Hideo", "Isao", "Jiro", "Koji", "Makoto", "Osamu", "Riku", "Sota", "Toshi", "Yuki", "Yuta", "Akira", "Bunta", "Denki",
  ]),
  x: stripDupes([
    "Aki", "Hari", "Haru", "Itsuki", "Rei", "Kai", "Nari", "Ren", "Sato", "Tooru", "Aoi", "Izumi", "Kou", "Michi", "Naru", "Rui", "Toma", "Yue", "Yui", "Asa", "Dai", "Ei", "Fuu", "Aoi", "Hinata", "Iori", "Jin", "Kei", "Lyn", "Min", "Rio", "Sei",
  ]),
};

export const SURNAME_JAPAN: SurnamePool = stripDupes([
  "Tanaka", "Sato", "Suzuki", "Watanabe", "Kobayashi", "Kato", "Yamamoto", "Nakamura", "Ito", "Hayashi", "Shimizu", "Arai", "Fujimoto", "Hoshino", "Matsumoto", "Nishida", "Okada", "Saito", "Takahashi", "Ueda", "Yamaguchi", "Ando", "Endo", "Goto", "Hara", "Ishida", "Kondo", "Mori", "Nakano", "Oda",
]);

/** "Edgy" substrings to avoid for soft / innocent archetype mixes (but allowed in dark fantasy, etc.) */
export const GOTH_TOKENS = [
  "raven", "nyx", "vex", "dread", "morga", "malak", "strahd", "drae", "lich", "grimm", "voidb", "doom", "bane", "draen", "nihil", "wraith", "orlok", "gloomw", "shadowm", "dreadm", "nightb", "umbrae", "cinderf", "draven", "lilith", "morgana", "sable",
] as const;

/** Zany / meme-adjacent — merged when personality calls for it (bratty, wild, playful). */
export const QUIRKY_MODERN_F = stripDupes([
  "Taffy", "Peaches", "Moxie", "Bambi", "Pickles", "Bubbles", "Kit", "Coco", "Dolly", "Fifi", "Gidget", "Kiki", "Lolo", "Mimi", "Pip", "Poppy", "Jojo", "Bitsy", "Gigi", "Izzy",
]);
export const QUIRKY_MODERN_M = stripDupes([
  "Pickles", "Biscuit", "Chipper", "Dodger", "Gizmo", "Jester", "Lucky", "Mack", "Nacho", "Poncho", "Rascal", "Scamp", "Spud", "Chuck", "Dingo", "Gonzo", "Noodle", "Pogo", "Rizzo", "Bongo", "Duke", "Fizz", "Gumbo", "Jib", "Kaz", "Ludo", "Nitz", "Riff", "Zeb", "Tuck", "Biff",
]);
export const QUIRKY_MODERN_X = stripDupes([
  "Bingo", "Sunny", "Moxie", "Bubbles", "Zippy", "Noodle", "Raffi", "Waffle", "Bento", "Doodle", "Jinx", "Kook", "Loopy", "Miso", "Nim", "Puff", "Snax", "Bloop", "Zorb", "Bleep", "Boop", "Pixel", "Glitch", "Taffy", "Froggy", "Gummy", "Skadoosh", "Pogo", "Zesty", "Yolo",
]);
export const QUIRKY_CYBER: NameBank = {
  f: ["Glitch", "Bleep", "Loopy", "Nulla", "Fizz", "Bae", "Patchi", "Coda", "Bitsy", "Danki", "Yeet", "Vibez", "Boopa", "Zappy", "Meme", "Boti", "Fomo", "Synthi", "Pinga", "Router"],
  m: ["Glitch", "Zero", "Bloop", "Pingy", "Kernel", "Cache", "Boomo", "Zapp", "Vapor", "Synth", "Drone", "Bot", "Warez", "Stack", "Bytey", "Patch", "Cypher", "Meem", "Fizzo", "Neonx"],
  x: ["Null", "Byte", "Boop", "Vibez", "Glitch", "Meme", "Bae", "Fomo", "Zapp", "Pixel", "Ping", "Bloop", "Sim", "Coda", "Dank", "Fizz", "Glich", "Loopo", "Quark", "Zorb"],
} as const;