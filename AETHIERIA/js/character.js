// File: js/character.js
export const BASE = {
    archetypes: [
        { name: "Windblade Ranger", stats: { hp: [800, 1100], atk: [16, 24], def: [45, 65], mastery: [20, 40], stamina: [90, 120] }, element: "anemo" },
        { name: "Skylit Duelist", stats: { hp: [860, 1080], atk: [20, 28], def: [40, 58], mastery: [16, 36], stamina: [95, 115] }, element: "anemo" }
    ],
    palettes: [
        ["#87D7FF", "#2E4057", "#3CF2B2", "#FFE88A", "#1A1A1A"], // Classic Anemo
        ["#FF6B6B", "#4D0F0F", "#FFD93D", "#FF9F43", "#2D3436"], // Pyro Style
        ["#A29BFE", "#2D3436", "#6C5CE7", "#00CEC9", "#DFE6E9"]  // Electro Style
    ],
    abilities: [
        { name: "Gale Step", cd: [5, 7], atkMultiplier: [0.75, 0.95], desc: "Dash anemo; cancel en saut." },
        { name: "Updraft Bloom", cd: [10, 13], atkMultiplier: [0.22, 0.28], desc: "Bulle ascendante; lift léger." },
        { name: "Tempest Weave", energy: [55, 65], atkMultiplier: [0.42, 0.52], desc: "Tourbillon; swirl et 3 air combos." }
    ]
};

const rint = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const rpick = arr => arr[Math.floor(Math.random() * arr.length)];
const rrange = ([a, b]) => rint(a, b);

export function generateCharacter(seed = Math.random().toString(36).slice(2)) {
    // Simple seed influence
    const s = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const arch = BASE.archetypes[(s % BASE.archetypes.length)];
    const pal = BASE.palettes[(s % BASE.palettes.length)];

    const abilities = BASE.abilities.map(a => ({
        name: a.name,
        cooldown: a.cd ? rrange(a.cd) : undefined,
        energy: a.energy ? rrange(a.energy) : undefined,
        atkMultiplier: Number((Math.random() * (a.atkMultiplier[1] - a.atkMultiplier[0]) + a.atkMultiplier[0]).toFixed(2)),
        desc: a.desc
    }));

    const stats = {
        hp: rrange(arch.stats.hp),
        atk: rrange(arch.stats.atk),
        def: rrange(arch.stats.def),
        mastery: rrange(arch.stats.mastery),
        stamina: rrange(arch.stats.stamina)
    };

    return {
        id: "aeryn-skydawn",
        name: "Aeryn Skydawn",
        archetype: arch.name,
        element: arch.element,
        vibes: ["aérien", "lumineux", "précis", "voyageur"],
        palette: pal,
        stats,
        abilities,
        passives: ["Wind Reader", "Edge Timing"],
        rig: { humanoid: true, extraBones: { cloth: 8, pony: 3, scabbard: 1 } },
        model: { path: "assets/models/hero.glb", lod: [0.45, 0.22, 0.12] },
        seed
    };
}
