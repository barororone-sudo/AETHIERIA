// js/Chemistry.js
import * as THREE from 'three';

export const Elements = {
    NONE: 'none',
    PYRO: 'pyro',
    HYDRO: 'hydro',
    CRYO: 'cryo',
    ELECTRO: 'electro',
    ANEMO: 'anemo',
    GEO: 'geo'
};

export class Chemistry {
    static getReaction(triggerElement, auraElement) {
        if (!triggerElement || !auraElement) return null;
        if (triggerElement === Elements.NONE || auraElement === Elements.NONE) return null;

        const e1 = triggerElement; // The incoming element (Trigger)
        const e2 = auraElement;    // The existing element (Aura)

        // --- AMP REACTIONS (Multipliers) ---

        // MELT (Pyro <-> Cryo)
        if ((e1 === Elements.PYRO && e2 === Elements.CRYO) || (e1 === Elements.CRYO && e2 === Elements.PYRO)) {
            // Pyro on Cryo = 2.0x, Cryo on Pyro = 1.5x (Simplified to 2.0 for user request)
            return { type: 'MELT', multiplier: 2.0, color: '#ffaa00' };
        }

        // VAPORIZE (Pyro <-> Hydro)
        if ((e1 === Elements.HYDRO && e2 === Elements.PYRO) || (e1 === Elements.PYRO && e2 === Elements.HYDRO)) {
            // Hydro on Pyro = 2.0x, Pyro on Hydro = 1.5x (User asked for 1.5 generic)
            return { type: 'VAPORIZE', multiplier: 1.5, color: '#ff8800' };
        }

        // --- TRANSFORM REACTIONS (Effects) ---

        // OVERLOAD (Pyro <-> Electro) -> Explosion
        if ((e1 === Elements.PYRO && e2 === Elements.ELECTRO) || (e1 === Elements.ELECTRO && e2 === Elements.PYRO)) {
            return { type: 'OVERLOAD', damage: 200, isAoE: true, color: '#ff00ff' };
        }

        // SUPERCONDUCT (Cryo <-> Electro) -> AoE Cryo Dmg
        if ((e1 === Elements.CRYO && e2 === Elements.ELECTRO) || (e1 === Elements.ELECTRO && e2 === Elements.CRYO)) {
            return { type: 'SUPERCONDUCT', damage: 100, isAoE: true, color: '#ccaaff' };
        }

        // ELECTRO-CHARGED (Hydro <-> Electro) -> DoT
        if ((e1 === Elements.HYDRO && e2 === Elements.ELECTRO) || (e1 === Elements.ELECTRO && e2 === Elements.HYDRO)) {
            return { type: 'ELECTRO-CHARGED', duration: 3.0, damage: 50, color: '#cc00ff' };
        }

        // FROZEN (Hydro <-> Cryo) -> CC
        if ((e1 === Elements.HYDRO && e2 === Elements.CRYO) || (e1 === Elements.CRYO && e2 === Elements.HYDRO)) {
            return { type: 'FROZEN', duration: 3.0, color: '#aaddff' };
        }

        // SWIRL (Anemo + Pyro/Hydro/Cryo/Electro)
        if (e1 === Elements.ANEMO || e2 === Elements.ANEMO) {
            const other = (e1 === Elements.ANEMO) ? e2 : e1;
            if ([Elements.PYRO, Elements.HYDRO, Elements.CRYO, Elements.ELECTRO].includes(other)) {
                return { type: 'SWIRL', element: other, isAoE: true, force: 10, color: '#00ffaa' };
            }
        }

        return null;
    }

    static applyElement(target, element, world) {
        if (!target.element) {
            target.element = element;
            // Visual effect for applying element
            return null;
        }

        const reaction = Chemistry.getReaction(target.element, element);
        if (reaction) {
            console.log(`Reaction: ${reaction.type}!`);
            target.element = null; // Consume element

            // Handle Reaction Effects
            if (reaction.type === 'FREEZE') {
                target.isFrozen = true;
                setTimeout(() => target.isFrozen = false, reaction.duration * 1000);
            } else if (reaction.type === 'OVERLOAD') {
                // Explosion logic would go here
            } else if (reaction.type === 'UPDRAFT') {
                // Handled in World
            }

            return reaction;
        }

        target.element = element; // Overwrite if no reaction
        return null;
    }
}
