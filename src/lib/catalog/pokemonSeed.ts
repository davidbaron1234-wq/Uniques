import { MasterItem } from "./types";

// ── Compact builder ────────────────────────────────────────────────────────
// [cardNumber, name, rarity, marketPriceUSD]
type C = [number | string, string, string, number];

function ptcg(setId: string, setName: string, series: string, cards: C[]): MasterItem[] {
  return cards.map(([num, name, rarity, price]) => ({
    id: `ptcg-${setId}-${num}`,
    name,
    category: "Pokémon TCG" as const,
    subCategory: "Pokémon TCG",
    set: setName,
    series,
    rarity,
    imageSmall: `https://images.pokemontcg.io/${setId}/${num}.png`,
    imageLarge: `https://images.pokemontcg.io/${setId}/${num}_hires.png`,
    marketPrice: price,
  }));
}

// ── WOTC Era (1999-2003) ───────────────────────────────────────────────────

const baseSet = ptcg("base1", "Base Set", "Base", [
  [1, "Alakazam", "Rare Holo", 45],
  [2, "Blastoise", "Rare Holo", 120],
  [3, "Chansey", "Rare Holo", 25],
  [4, "Charizard", "Rare Holo", 350],
  [5, "Clefairy", "Rare Holo", 18],
  [6, "Gyarados", "Rare Holo", 30],
  [7, "Hitmonchan", "Rare Holo", 20],
  [8, "Machamp", "Rare Holo", 15],
  [9, "Magneton", "Rare Holo", 15],
  [10, "Mewtwo", "Rare Holo", 45],
  [11, "Nidoking", "Rare Holo", 20],
  [12, "Ninetales", "Rare Holo", 20],
  [13, "Poliwrath", "Rare Holo", 15],
  [14, "Raichu", "Rare Holo", 25],
  [15, "Venusaur", "Rare Holo", 100],
  [16, "Zapdos", "Rare Holo", 25],
  [17, "Beedrill", "Rare", 5],
  [18, "Dragonair", "Rare", 8],
  [19, "Dugtrio", "Rare", 4],
  [20, "Electabuzz", "Rare", 4],
  [21, "Electrode", "Rare", 3],
  [24, "Charmeleon", "Uncommon", 12],
  [25, "Dewgong", "Uncommon", 2],
  [26, "Dratini", "Uncommon", 5],
  [28, "Growlithe", "Uncommon", 3],
  [35, "Pikachu", "Common", 12],
  [36, "Poliwag", "Common", 2],
  [46, "Charmander", "Common", 10],
  [44, "Bulbasaur", "Common", 8],
  [42, "Squirtle", "Common", 6],
]);

const jungle = ptcg("base2", "Jungle", "Base", [
  [1, "Clefable", "Rare Holo", 15],
  [2, "Electrode", "Rare Holo", 10],
  [3, "Flareon", "Rare Holo", 30],
  [4, "Jolteon", "Rare Holo", 25],
  [5, "Kangaskhan", "Rare Holo", 10],
  [6, "Mr. Mime", "Rare Holo", 12],
  [7, "Nidoqueen", "Rare Holo", 12],
  [8, "Pidgeot", "Rare Holo", 15],
  [9, "Pinsir", "Rare Holo", 8],
  [10, "Scyther", "Rare Holo", 15],
  [11, "Snorlax", "Rare Holo", 25],
  [12, "Vaporeon", "Rare Holo", 30],
  [13, "Venomoth", "Rare Holo", 8],
  [14, "Victreebel", "Rare Holo", 8],
  [15, "Vileplume", "Rare Holo", 8],
  [16, "Wigglytuff", "Rare Holo", 8],
  [17, "Clefable", "Rare", 5],
  [18, "Electrode", "Rare", 3],
  [25, "Scyther", "Rare", 6],
]);

const fossil = ptcg("base3", "Fossil", "Base", [
  [1, "Aerodactyl", "Rare Holo", 15],
  [2, "Articuno", "Rare Holo", 25],
  [3, "Ditto", "Rare Holo", 15],
  [4, "Dragonite", "Rare Holo", 40],
  [5, "Gengar", "Rare Holo", 50],
  [6, "Haunter", "Rare Holo", 15],
  [7, "Hitmonlee", "Rare Holo", 10],
  [8, "Hypno", "Rare Holo", 8],
  [9, "Kabutops", "Rare Holo", 10],
  [10, "Lapras", "Rare Holo", 15],
  [11, "Magneton", "Rare Holo", 10],
  [12, "Moltres", "Rare Holo", 20],
  [13, "Muk", "Rare Holo", 8],
  [14, "Raichu", "Rare Holo", 15],
  [15, "Zapdos", "Rare Holo", 18],
]);

const teamRocket = ptcg("base5", "Team Rocket", "Base", [
  [1, "Dark Alakazam", "Rare Holo", 20],
  [2, "Dark Arbok", "Rare Holo", 10],
  [3, "Dark Blastoise", "Rare Holo", 50],
  [4, "Dark Charizard", "Rare Holo", 120],
  [5, "Dark Dragonite", "Rare Holo", 40],
  [6, "Dark Dugtrio", "Rare Holo", 10],
  [7, "Dark Golbat", "Rare Holo", 8],
  [8, "Dark Gyarados", "Rare Holo", 15],
  [9, "Dark Hypno", "Rare Holo", 8],
  [10, "Dark Machamp", "Rare Holo", 12],
  [11, "Dark Magneton", "Rare Holo", 8],
  [12, "Dark Slowbro", "Rare Holo", 10],
  [13, "Dark Vileplume", "Rare Holo", 8],
  [14, "Dark Weezing", "Rare Holo", 8],
  [15, "Here Comes Team Rocket!", "Rare Holo", 6],
  [16, "Rocket's Sneak Attack", "Rare Holo", 5],
  [17, "Rainbow Energy", "Rare Holo", 8],
  [82, "Rocket's Mewtwo", "Rare Holo", 15],
]);

const gymHeroes = ptcg("gym1", "Gym Heroes", "Gym", [
  [1, "Blaine's Moltres", "Rare Holo", 20],
  [2, "Brock's Rhydon", "Rare Holo", 10],
  [3, "Erika's Clefable", "Rare Holo", 10],
  [4, "Lt. Surge's Electabuzz", "Rare Holo", 8],
  [5, "Misty's Seadra", "Rare Holo", 8],
  [6, "Misty's Tentacruel", "Rare Holo", 10],
  [7, "Rocket's Hitmonchan", "Rare Holo", 10],
  [8, "Rocket's Moltres", "Rare Holo", 12],
  [9, "Rocket's Scyther", "Rare Holo", 15],
  [10, "Sabrina's Gengar", "Rare Holo", 30],
  [11, "Brock's Ninetales", "Rare Holo", 12],
  [12, "Misty's Gyarados", "Rare Holo", 18],
  [13, "Erika's Vileplume", "Rare Holo", 10],
  [14, "Lt. Surge's Fearow", "Rare Holo", 6],
  [18, "Brock's Golem", "Rare Holo", 8],
]);

const gymChallenge = ptcg("gym2", "Gym Challenge", "Gym", [
  [1, "Blaine's Arcanine", "Rare Holo", 25],
  [2, "Blaine's Charizard", "Rare Holo", 80],
  [3, "Brock's Ninetales", "Rare Holo", 10],
  [4, "Erika's Venusaur", "Rare Holo", 30],
  [5, "Giovanni's Gyarados", "Rare Holo", 15],
  [6, "Giovanni's Machamp", "Rare Holo", 15],
  [7, "Giovanni's Nidoking", "Rare Holo", 15],
  [8, "Giovanni's Persian", "Rare Holo", 12],
  [9, "Koga's Beedrill", "Rare Holo", 8],
  [10, "Koga's Ditto", "Rare Holo", 15],
  [11, "Lt. Surge's Raichu", "Rare Holo", 12],
  [12, "Misty's Golduck", "Rare Holo", 8],
  [13, "Rocket's Mewtwo", "Rare Holo", 20],
  [14, "Rocket's Zapdos", "Rare Holo", 12],
  [15, "Sabrina's Alakazam", "Rare Holo", 20],
  [16, "Sabrina's Gengar", "Rare Holo", 35],
]);

const neoGenesis = ptcg("neo1", "Neo Genesis", "Neo", [
  [1, "Ampharos", "Rare Holo", 15],
  [2, "Azumarill", "Rare Holo", 8],
  [3, "Bellossom", "Rare Holo", 10],
  [4, "Feraligatr", "Rare Holo", 25],
  [5, "Feraligatr", "Rare Holo", 20],
  [6, "Heracross", "Rare Holo", 12],
  [7, "Jumpluff", "Rare Holo", 8],
  [8, "Kingdra", "Rare Holo", 10],
  [9, "Lugia", "Rare Holo", 200],
  [10, "Meganium", "Rare Holo", 18],
  [11, "Meganium", "Rare Holo", 15],
  [12, "Pichu", "Rare Holo", 15],
  [13, "Skarmory", "Rare Holo", 10],
  [14, "Slowking", "Rare Holo", 10],
  [15, "Steelix", "Rare Holo", 12],
  [16, "Togetic", "Rare Holo", 10],
  [17, "Typhlosion", "Rare Holo", 35],
  [18, "Typhlosion", "Rare Holo", 30],
]);

const neoDiscovery = ptcg("neo2", "Neo Discovery", "Neo", [
  [1, "Espeon", "Rare Holo", 80],
  [2, "Forretress", "Rare Holo", 8],
  [3, "Hitmontop", "Rare Holo", 8],
  [4, "Houndoom", "Rare Holo", 30],
  [5, "Houndour", "Rare Holo", 8],
  [6, "Kabutops", "Rare Holo", 15],
  [7, "Magnemite", "Rare Holo", 5],
  [8, "Politoed", "Rare Holo", 15],
  [9, "Poliwrath", "Rare Holo", 10],
  [10, "Scizor", "Rare Holo", 20],
  [11, "Smeargle", "Rare Holo", 12],
  [12, "Tyranitar", "Rare Holo", 50],
  [13, "Umbreon", "Rare Holo", 120],
  [14, "Ursaring", "Rare Holo", 8],
  [15, "Wobbuffet", "Rare Holo", 10],
  [16, "Yanma", "Rare Holo", 8],
]);

const neoRevelation = ptcg("neo3", "Neo Revelation", "Neo", [
  [1, "Ampharos", "Rare Holo", 12],
  [2, "Blissey", "Rare Holo", 15],
  [3, "Celebi", "Rare Holo", 25],
  [4, "Crobat", "Rare Holo", 12],
  [5, "Delibird", "Rare Holo", 8],
  [6, "Entei", "Rare Holo", 20],
  [7, "Ho-Oh", "Rare Holo", 40],
  [8, "Houndoom", "Rare Holo", 15],
  [9, "Jumpluff", "Rare Holo", 8],
  [10, "Magneton", "Rare Holo", 8],
  [11, "Misdreavus", "Rare Holo", 10],
  [12, "Porygon2", "Rare Holo", 10],
  [13, "Raikou", "Rare Holo", 25],
  [14, "Suicune", "Rare Holo", 35],
  ["13a", "Shining Gyarados", "Rare Holo", 150],
  ["13b", "Shining Magikarp", "Rare Holo", 80],
]);

const neoDestiny = ptcg("neo4", "Neo Destiny", "Neo", [
  [105, "Shining Celebi", "Rare Holo", 100],
  [107, "Shining Charizard", "Rare Holo", 500],
  [106, "Shining Gyarados", "Rare Holo", 100],
  [108, "Shining Kabutops", "Rare Holo", 100],
  [109, "Shining Mewtwo", "Rare Holo", 200],
  [110, "Shining Noctowl", "Rare Holo", 80],
  [111, "Shining Raichu", "Rare Holo", 100],
  [112, "Shining Steelix", "Rare Holo", 120],
  [113, "Shining Tyranitar", "Rare Holo", 300],
  [1, "Dark Ampharos", "Rare Holo", 15],
  [2, "Dark Crobat", "Rare Holo", 15],
  [3, "Dark Donphan", "Rare Holo", 10],
  [4, "Dark Espeon", "Rare Holo", 40],
  [5, "Dark Feraligatr", "Rare Holo", 20],
  [6, "Dark Gengar", "Rare Holo", 30],
  [7, "Dark Houndoom", "Rare Holo", 15],
  [8, "Dark Porygon2", "Rare Holo", 10],
  [9, "Dark Scizor", "Rare Holo", 20],
  [10, "Dark Typhlosion", "Rare Holo", 20],
  [11, "Dark Tyranitar", "Rare Holo", 35],
  [12, "Light Arcanine", "Rare Holo", 25],
  [13, "Light Azumarill", "Rare Holo", 10],
  [14, "Light Dragonite", "Rare Holo", 40],
  [15, "Light Togetic", "Rare Holo", 12],
]);

// ── e-Card Era (2002-2003) ─────────────────────────────────────────────────

const expedition = ptcg("ecard1", "Expedition Base Set", "E-Card", [
  [6, "Charizard", "Rare Holo", 150],
  [4, "Blastoise", "Rare Holo", 60],
  [30, "Venusaur", "Rare Holo", 50],
  [1, "Alakazam", "Rare Holo", 35],
  [28, "Tyranitar", "Rare Holo", 40],
  [10, "Feraligatr", "Rare Holo", 30],
  [13, "Gengar", "Rare Holo", 40],
  [20, "Mewtwo", "Rare Holo", 30],
  [22, "Pichu", "Rare Holo", 15],
  [25, "Skarmory", "Rare Holo", 10],
]);

const skyridge = ptcg("ecard3", "Skyridge", "E-Card", [
  [146, "Charizard", "Rare Holo", 500],
  [150, "Gyarados", "Rare Holo", 80],
  [143, "Alakazam", "Rare Holo", 60],
  [148, "Gengar", "Rare Holo", 90],
  ["H25", "Charizard (Crystal Type)", "Rare Holo", 800],
  ["H9", "Gengar (Crystal Type)", "Rare Holo", 300],
  ["H32", "Nidoking (Crystal Type)", "Rare Holo", 200],
]);

// ── EX Era (2003-2007) ────────────────────────────────────────────────────

const exSeries = ptcg("ex1", "Ruby & Sapphire", "EX", [
  [100, "Blaziken ex", "Rare Holo EX", 30],
  [94, "Gardevoir ex", "Rare Holo EX", 25],
  [95, "Sceptile ex", "Rare Holo EX", 20],
  [96, "Swampert ex", "Rare Holo EX", 20],
  [97, "Sneasel ex", "Rare Holo EX", 15],
  [1, "Aggron", "Rare Holo", 8],
  [2, "Beautifly", "Rare Holo", 5],
  [3, "Blaziken", "Rare Holo", 10],
  [7, "Gardevoir", "Rare Holo", 8],
]);

const exDragonFrontiers = ptcg("ex15", "EX Dragon Frontiers", "EX", [
  [100, "Charizard Gold Star δ", "Rare Holo Star", 800],
  [101, "Mew Gold Star δ", "Rare Holo Star", 500],
  [97, "Flygon ex δ", "Rare Holo EX", 30],
  [98, "Dragonite ex δ", "Rare Holo EX", 35],
  [99, "Gardevoir ex δ", "Rare Holo EX", 25],
]);

const exDeoxys = ptcg("ex6", "EX Deoxys", "EX", [
  [107, "Rayquaza Gold Star", "Rare Holo Star", 700],
  [104, "Deoxys ex", "Rare Holo EX", 30],
  [105, "Hariyama ex", "Rare Holo EX", 15],
  [99, "Rayquaza ex", "Rare Holo EX", 150],
]);

const exFireRedLeafGreen = ptcg("ex7", "EX FireRed & LeafGreen", "EX", [
  [105, "Charizard ex", "Rare Holo EX", 200],
  [104, "Blastoise ex", "Rare Holo EX", 80],
  [112, "Venusaur ex", "Rare Holo EX", 60],
  [113, "Mr. Mime ex", "Rare Holo EX", 20],
]);

const exUnseenForces = ptcg("ex10", "EX Unseen Forces", "EX", [
  [104, "Lugia ex", "Rare Holo EX", 100],
  [105, "Ho-Oh ex", "Rare Holo EX", 50],
  [115, "Umbreon Gold Star", "Rare Holo Star", 1500],
  [116, "Espeon Gold Star", "Rare Holo Star", 600],
]);

const pop5 = ptcg("pop5", "POP Series 5", "EX", [
  [17, "Umbreon Gold Star", "Rare Holo Star", 1500],
  [18, "Espeon Gold Star", "Rare Holo Star", 400],
]);

// ── Diamond & Pearl / Platinum Era (2007-2010) ─────────────────────────────

const dpSeries = ptcg("dp1", "Diamond & Pearl", "Diamond & Pearl", [
  [1, "Dialga", "Rare Holo", 12],
  [2, "Dusknoir", "Rare Holo", 8],
  [3, "Electivire", "Rare Holo", 8],
  [4, "Empoleon", "Rare Holo", 10],
  [6, "Infernape", "Rare Holo", 12],
  [10, "Lucario", "Rare Holo", 10],
  [11, "Luxray", "Rare Holo", 8],
  [14, "Palkia", "Rare Holo", 12],
  [120, "Empoleon Lv.X", "Rare Holo Lv.X", 25],
  [121, "Infernape Lv.X", "Rare Holo Lv.X", 20],
  [122, "Torterra Lv.X", "Rare Holo Lv.X", 15],
]);

const platinumSeries = ptcg("pl1", "Platinum", "Platinum", [
  [5, "Dialga G", "Rare Holo", 8],
  [7, "Giratina", "Rare Holo", 10],
  [120, "Dialga G Lv.X", "Rare Holo Lv.X", 20],
  [122, "Giratina Lv.X", "Rare Holo Lv.X", 15],
  [125, "Shaymin Lv.X", "Rare Holo Lv.X", 15],
]);

// ── HeartGold & SoulSilver Era (2010-2011) ─────────────────────────────────

const hgssSeries = ptcg("hgss1", "HeartGold & SoulSilver", "HeartGold & SoulSilver", [
  [1, "Arcanine", "Rare Holo", 8],
  [5, "Feraligatr", "Rare Holo (PRIME)", 15],
  [6, "Gyarados", "Rare Holo", 8],
  [7, "Hitmontop", "Rare Holo", 5],
  [109, "Lugia LEGEND (Top)", "Rare Holo LEGEND", 25],
  [110, "Lugia LEGEND (Bottom)", "Rare Holo LEGEND", 25],
  [111, "Ho-Oh LEGEND (Top)", "Rare Holo LEGEND", 20],
  [112, "Ho-Oh LEGEND (Bottom)", "Rare Holo LEGEND", 20],
  [113, "Typhlosion PRIME", "Rare Holo PRIME", 15],
  [114, "Meganium PRIME", "Rare Holo PRIME", 10],
  [115, "Feraligatr PRIME", "Rare Holo PRIME", 18],
  [116, "Donphan PRIME", "Rare Holo PRIME", 10],
]);

// ── Black & White Era (2011-2013) ──────────────────────────────────────────

const bwSeries = ptcg("bw1", "Black & White", "Black & White", [
  [113, "Reshiram (Full Art)", "Ultra Rare", 20],
  [114, "Zekrom (Full Art)", "Ultra Rare", 20],
  [1, "Snivy", "Common", 2],
  [7, "Tepig", "Common", 2],
  [14, "Oshawott", "Common", 2],
]);

const bwNextDestinies = ptcg("bw4", "Next Destinies", "Black & White", [
  [96, "Mewtwo EX (Full Art)", "Ultra Rare", 35],
  [95, "Reshiram EX (Full Art)", "Ultra Rare", 15],
  [97, "Shaymin EX (Full Art)", "Ultra Rare", 12],
  [98, "Zekrom EX (Full Art)", "Ultra Rare", 15],
]);

const bwDragonsExalted = ptcg("bw6", "Dragons Exalted", "Black & White", [
  [124, "Rayquaza EX (Full Art)", "Ultra Rare", 40],
  [122, "Ho-Oh EX (Full Art)", "Ultra Rare", 20],
  [128, "Rayquaza (Dragon Vault)", "Rare Secret", 30],
]);

// ── XY Era (2013-2016) ────────────────────────────────────────────────────

const xyEvolutions = ptcg("xy12", "XY Evolutions", "XY", [
  [11, "Charizard (Holo)", "Rare Holo", 35],
  [12, "Charizard EX", "Rare Holo EX", 30],
  [101, "Charizard EX (Full Art)", "Ultra Rare", 60],
  [13, "Blastoise EX", "Rare Holo EX", 15],
  [100, "Blastoise EX (Full Art)", "Ultra Rare", 25],
  [1, "Venusaur EX", "Rare Holo EX", 12],
  [104, "Mewtwo EX (Full Art)", "Ultra Rare", 20],
  [106, "M Charizard EX (Secret)", "Rare Secret", 80],
  [108, "Pikachu (Full Art)", "Rare Secret", 50],
]);

const xyFlashfire = ptcg("xy2", "XY Flashfire", "XY", [
  [100, "Charizard EX", "Ultra Rare", 40],
  [107, "M Charizard EX (Full Art)", "Ultra Rare", 60],
  [108, "M Charizard EX (Secret)", "Rare Secret", 100],
  [69, "Charizard EX", "Rare Holo EX", 25],
]);

// ── Sun & Moon Era (2017-2019) ─────────────────────────────────────────────

const smBaseSeries = ptcg("sm1", "Sun & Moon", "Sun & Moon", [
  [143, "Espeon GX (Full Art)", "Ultra Rare", 12],
  [145, "Lunala GX (Full Art)", "Ultra Rare", 10],
  [149, "Umbreon GX (Full Art)", "Ultra Rare", 20],
  [150, "Umbreon GX (Secret)", "Rare Secret", 40],
  [151, "Lurantis GX (Secret)", "Rare Secret", 12],
  [155, "Psychic Energy (Secret)", "Rare Secret", 15],
]);

const smHiddenFates = ptcg("sm115", "Hidden Fates", "Sun & Moon", [
  ["SV49", "Charizard GX (Shiny)", "Rare Holo GX", 100],
  ["SV47", "Espeon GX (Shiny)", "Rare Holo GX", 20],
  ["SV46", "Umbreon GX (Shiny)", "Rare Holo GX", 30],
  ["SV1", "Scyther (Shiny)", "Rare Holo", 8],
  ["SV6", "Charmander (Shiny)", "Rare Holo", 15],
  ["SV7", "Charmeleon (Shiny)", "Rare Holo", 10],
  ["SV10", "Wooper (Shiny)", "Rare Holo", 5],
  ["SV22", "Lucario (Shiny)", "Rare Holo", 10],
  ["SV48", "Mewtwo GX (Shiny)", "Rare Holo GX", 20],
  [68, "Mewtwo GX", "Ultra Rare", 15],
  [69, "Charizard GX", "Ultra Rare", 40],
]);

const smChampionsPath = ptcg("swsh35", "Champion's Path", "Sword & Shield", [
  ["SWSH050", "Charizard VMAX", "Ultra Rare", 80],
  [74, "Charizard V", "Ultra Rare", 20],
  [79, "Charizard VMAX (Secret)", "Rare Secret", 150],
]);

// ── Sword & Shield Era (2020-2023) ─────────────────────────────────────────

const swshBase = ptcg("swsh1", "Sword & Shield", "Sword & Shield", [
  [190, "Zacian V (Secret)", "Rare Secret", 12],
  [195, "Marnie (Full Art)", "Ultra Rare", 25],
  [211, "Quick Ball (Secret)", "Rare Secret", 10],
  [138, "Sableye V", "Ultra Rare", 5],
]);

const swshShiningFates = ptcg("swsh45", "Shining Fates", "Sword & Shield", [
  ["SV107", "Charizard VMAX (Shiny)", "Rare Holo VMAX", 100],
  ["SV108", "Ditto VMAX (Shiny)", "Rare Holo VMAX", 15],
  ["SV104", "Lapras VMAX (Shiny)", "Rare Holo VMAX", 12],
  ["SV106", "Toxtricity VMAX (Shiny)", "Rare Holo VMAX", 10],
  ["SV117", "Charizard V (Shiny)", "Rare Holo V", 30],
]);

const evolvingSkies = ptcg("swsh7", "Evolving Skies", "Sword & Shield", [
  [203, "Espeon VMAX (Alt Art)", "Rare Holo VMAX", 80],
  [204, "Flareon VMAX", "Rare Holo VMAX", 15],
  [205, "Leafeon VMAX (Alt Art)", "Rare Holo VMAX", 70],
  [209, "Glaceon VMAX (Alt Art)", "Rare Holo VMAX", 100],
  [212, "Sylveon VMAX (Alt Art)", "Rare Holo VMAX", 80],
  [215, "Umbreon VMAX (Alt Art)", "Rare Holo VMAX", 300],
  [217, "Rayquaza VMAX", "Rare Holo VMAX", 30],
  [218, "Rayquaza VMAX (Alt Art)", "Rare Holo VMAX", 250],
  [219, "Duraludon VMAX (Alt Art)", "Rare Holo VMAX", 30],
  [175, "Glaceon V (Alt Art)", "Ultra Rare", 30],
  [180, "Espeon V (Alt Art)", "Ultra Rare", 25],
  [189, "Umbreon V (Alt Art)", "Ultra Rare", 50],
  [192, "Dragonite V (Alt Art)", "Ultra Rare", 60],
  [194, "Rayquaza V (Alt Art)", "Ultra Rare", 40],
  [184, "Jolteon V (Alt Art)", "Ultra Rare", 20],
  [185, "Leafeon V (Alt Art)", "Ultra Rare", 20],
  [188, "Sylveon V (Alt Art)", "Ultra Rare", 25],
]);

const brilliantStars = ptcg("swsh9", "Brilliant Stars", "Sword & Shield", [
  [174, "Charizard VSTAR", "Rare Holo VSTAR", 90],
  [154, "Charizard V (Alt Art)", "Ultra Rare", 35],
  [184, "Arceus VSTAR (Secret)", "Rare Secret", 50],
  [166, "Arceus V (Alt Art)", "Ultra Rare", 25],
  [172, "Lumineon V (Alt Art)", "Ultra Rare", 12],
  ["TG13", "Umbreon V (Trainer Gallery)", "Rare Holo V", 15],
  ["TG30", "Umbreon VMAX (Trainer Gallery)", "Rare Holo VMAX", 35],
]);

const astralRadiance = ptcg("swsh10", "Astral Radiance", "Sword & Shield", [
  [176, "Machamp V (Alt Art)", "Ultra Rare", 20],
  [189, "Origin Forme Dialga VSTAR (Secret)", "Rare Secret", 25],
  [190, "Origin Forme Palkia VSTAR (Secret)", "Rare Secret", 25],
  ["TG15", "Garchomp V (Trainer Gallery)", "Rare Holo V", 10],
  ["TG29", "Ice Rider Calyrex VMAX (TG)", "Rare Holo VMAX", 15],
]);

const lostOrigin = ptcg("swsh11", "Lost Origin", "Sword & Shield", [
  [196, "Giratina VSTAR (Secret)", "Rare Secret", 40],
  [183, "Giratina V (Alt Art)", "Ultra Rare", 60],
  ["TG17", "Pikachu V (Trainer Gallery)", "Rare Holo V", 12],
  ["TG30", "Giratina VSTAR (TG)", "Rare Holo VSTAR", 20],
]);

const crownZenith = ptcg("swsh12pt5", "Crown Zenith", "Sword & Shield", [
  ["GG44", "Mewtwo VSTAR (Galarian Gallery)", "Ultra Rare", 50],
  ["GG54", "Pikachu VMAX (Galarian Gallery)", "Ultra Rare", 40],
  ["GG30", "Charizard VSTAR (Galarian Gallery)", "Ultra Rare", 35],
  ["GG34", "Giratina VSTAR (Galarian Gallery)", "Ultra Rare", 30],
  ["GG38", "Arceus VSTAR (Galarian Gallery)", "Ultra Rare", 25],
  ["GG46", "Zamazenta V (Galarian Gallery)", "Ultra Rare", 10],
]);

// ── Scarlet & Violet Era (2023-present) ────────────────────────────────────

const svBase = ptcg("sv1", "Scarlet & Violet", "Scarlet & Violet", [
  [244, "Miraidon ex (Special Art Rare)", "Special Art Rare", 35],
  [247, "Koraidon ex (Special Art Rare)", "Special Art Rare", 30],
  [254, "Arcanine ex (Special Art Rare)", "Special Art Rare", 25],
  [253, "Gardevoir ex (Special Art Rare)", "Special Art Rare", 20],
  [198, "Miraidon ex", "Ultra Rare", 10],
  [197, "Koraidon ex", "Ultra Rare", 10],
]);

const svPaldeaEvolved = ptcg("sv2", "Paldea Evolved", "Scarlet & Violet", [
  [237, "Iono (Special Art Rare)", "Special Art Rare", 50],
  [240, "Groudon (Illustration Rare)", "Illustration Rare", 20],
  [244, "Clive (Special Art Rare)", "Special Art Rare", 10],
  [225, "Chien-Pao ex (Special Art Rare)", "Special Art Rare", 15],
]);

const sv151 = ptcg("sv3pt5", "Pokémon Card 151", "Scarlet & Violet", [
  [183, "Charizard ex (Special Art Rare)", "Special Art Rare", 80],
  [172, "Alakazam ex (Special Art Rare)", "Special Art Rare", 15],
  [171, "Arcanine ex (Special Art Rare)", "Special Art Rare", 20],
  [175, "Snorlax (Illustration Rare)", "Illustration Rare", 15],
  [186, "Mew ex (Special Art Rare)", "Special Art Rare", 60],
  [198, "Erika's Invitation (Special Art Rare)", "Special Art Rare", 50],
  [199, "Giovanni's Charisma (Special Art Rare)", "Special Art Rare", 8],
  [178, "Zapdos ex (Special Art Rare)", "Special Art Rare", 20],
  [185, "Alakazam ex (Hyper Rare)", "Hyper Rare", 30],
  [205, "Mew ex (Hyper Rare)", "Hyper Rare", 80],
  [207, "Bulbasaur (Illustration Rare)", "Illustration Rare", 15],
]);

const obsidianFlames = ptcg("sv3", "Obsidian Flames", "Scarlet & Violet", [
  [215, "Charizard ex (Special Art Rare)", "Special Art Rare", 60],
  [228, "Tyranitar ex (Special Art Rare)", "Special Art Rare", 25],
  [223, "Melmetal ex (Special Art Rare)", "Special Art Rare", 15],
  [197, "Charizard ex", "Ultra Rare", 15],
  [201, "Vespiquen ex", "Ultra Rare", 5],
]);

const paradoxRift = ptcg("sv4", "Paradox Rift", "Scarlet & Violet", [
  [228, "Iron Valiant ex (Special Art Rare)", "Special Art Rare", 20],
  [246, "Roaring Moon ex (Special Art Rare)", "Special Art Rare", 30],
  [247, "Iron Hands ex (Special Art Rare)", "Special Art Rare", 15],
  [241, "Professor Sada's Vitality (SAR)", "Special Art Rare", 15],
  [242, "Professor Turo's Scenario (SAR)", "Special Art Rare", 10],
]);

const temporalForces = ptcg("sv5", "Temporal Forces", "Scarlet & Violet", [
  [195, "Walking Wake ex (Special Art Rare)", "Special Art Rare", 15],
  [196, "Iron Leaves ex (Special Art Rare)", "Special Art Rare", 10],
  [203, "Bianca's Devotion (Special Art Rare)", "Special Art Rare", 15],
  [208, "Ace Spec: Prime Catcher", "Ace Spec Rare", 12],
]);

const twilightMasquerade = ptcg("sv6", "Twilight Masquerade", "Scarlet & Violet", [
  [196, "Bloodmoon Ursaluna ex (SAR)", "Special Art Rare", 15],
  [210, "Dragapult ex (Special Art Rare)", "Special Art Rare", 20],
  [203, "Carmine (Special Art Rare)", "Special Art Rare", 12],
  [211, "Lana's Aid (Special Art Rare)", "Special Art Rare", 10],
]);

const shroudedFable = ptcg("sv6pt5", "Shrouded Fable", "Scarlet & Violet", [
  [99, "Pecharunt ex (Special Art Rare)", "Special Art Rare", 15],
  [94, "Ceruledge ex (Illustration Rare)", "Illustration Rare", 12],
  [81, "Kingambit (Illustration Rare)", "Illustration Rare", 10],
]);

const stellarCrown = ptcg("sv7", "Stellar Crown", "Scarlet & Violet", [
  [175, "Terapagos ex (Special Art Rare)", "Special Art Rare", 30],
  [171, "Hydrapple ex (Special Art Rare)", "Special Art Rare", 12],
  [180, "Cynthia's Ambition (Special Art Rare)", "Special Art Rare", 15],
]);

const surgingSparks = ptcg("sv8", "Surging Sparks", "Scarlet & Violet", [
  [248, "Pikachu ex (Special Art Rare)", "Special Art Rare", 100],
  [268, "N's Zoroark ex (Special Art Rare)", "Special Art Rare", 30],
  [272, "Pikachu ex (Hyper Rare)", "Hyper Rare", 200],
  [261, "Charizard ex (Special Art Rare)", "Special Art Rare", 45],
  [270, "Cynthia's Garchomp ex (SAR)", "Special Art Rare", 25],
]);

const prismaticEvolutions = ptcg("sv8pt5", "Prismatic Evolutions", "Scarlet & Violet", [
  [187, "Umbreon ex (Special Illustration Rare)", "Special Illustration Rare", 300],
  [191, "Sylveon ex (Special Illustration Rare)", "Special Illustration Rare", 80],
  [188, "Glaceon ex (Special Illustration Rare)", "Special Illustration Rare", 50],
  [189, "Leafeon ex (Special Illustration Rare)", "Special Illustration Rare", 40],
  [190, "Espeon ex (Special Illustration Rare)", "Special Illustration Rare", 50],
  [192, "Flareon ex (Special Illustration Rare)", "Special Illustration Rare", 35],
  [193, "Vaporeon ex (Special Illustration Rare)", "Special Illustration Rare", 35],
  [194, "Jolteon ex (Special Illustration Rare)", "Special Illustration Rare", 30],
  [184, "Eevee (Illustration Rare)", "Illustration Rare", 40],
  [179, "Pikachu ex (Illustration Rare)", "Illustration Rare", 20],
  [172, "Sylveon ex", "Ultra Rare", 10],
  [173, "Umbreon ex", "Ultra Rare", 15],
  [205, "Mew ex (Hyper Rare)", "Hyper Rare", 50],
]);

// ── Promo & Special Sets ───────────────────────────────────────────────────

const promos = ptcg("swshp", "SWSH Promos", "Sword & Shield", [
  ["SWSH077", "Celebrations Charizard V", "Promo", 20],
  ["SWSH262", "Pikachu VMAX (Lost Origin Promo)", "Promo", 12],
]);

const celebrationsClassic = ptcg("cel25c", "Celebrations Classic", "Sword & Shield", [
  [1, "Ho-Oh (Classic Collection)", "Rare Holo", 5],
  [2, "Umbreon Gold Star (Reprint)", "Rare Holo", 12],
  [4, "Charizard (Classic Collection)", "Rare Holo", 25],
  [6, "Blastoise (Classic Collection)", "Rare Holo", 8],
  [15, "Mew ex (Classic Collection)", "Rare Holo", 8],
  [17, "Dark Gyarados (Classic)", "Rare Holo", 5],
]);

// ── Export ──────────────────────────────────────────────────────────────────

export const pokemonSeedData: MasterItem[] = [
  ...baseSet,
  ...jungle,
  ...fossil,
  ...teamRocket,
  ...gymHeroes,
  ...gymChallenge,
  ...neoGenesis,
  ...neoDiscovery,
  ...neoRevelation,
  ...neoDestiny,
  ...expedition,
  ...skyridge,
  ...exSeries,
  ...exDragonFrontiers,
  ...exDeoxys,
  ...exFireRedLeafGreen,
  ...exUnseenForces,
  ...pop5,
  ...dpSeries,
  ...platinumSeries,
  ...hgssSeries,
  ...bwSeries,
  ...bwNextDestinies,
  ...bwDragonsExalted,
  ...xyEvolutions,
  ...xyFlashfire,
  ...smBaseSeries,
  ...smHiddenFates,
  ...smChampionsPath,
  ...swshBase,
  ...swshShiningFates,
  ...evolvingSkies,
  ...brilliantStars,
  ...astralRadiance,
  ...lostOrigin,
  ...crownZenith,
  ...svBase,
  ...svPaldeaEvolved,
  ...sv151,
  ...obsidianFlames,
  ...paradoxRift,
  ...temporalForces,
  ...twilightMasquerade,
  ...shroudedFable,
  ...stellarCrown,
  ...surgingSparks,
  ...prismaticEvolutions,
  ...promos,
  ...celebrationsClassic,
];
