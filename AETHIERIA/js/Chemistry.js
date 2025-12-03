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
    static getReaction(element1, element2) {
        if (!element1 || !element2) return null;
        const e1 = element1.toLowerCase();
        const e2 = element2.toLowerCase();

        // FREEZE (Hydro + Cryo)
        if ((e1 === Elements.HYDRO && e2 === Elements.CRYO) || (e1 === Elements.CRYO && e2 === Elements.HYDRO)) {
            return { type: 'FREEZE', duration: 3.0 };
        }

        // OVERLOAD (Pyro + Electro)
        if ((e1 === Elements.PYRO && e2 === Elements.ELECTRO) || (e1 === Elements.ELECTRO && e2 === Elements.PYRO)) {
            return { type: 'OVERLOAD', damage: 50, force: 10 };
        }

        // MELT (Pyro + Cryo)
        if ((e1 === Elements.PYRO && e2 === Elements.CRYO) || (e1 === Elements.CRYO && e2 === Elements.PYRO)) {
            return { type: 'MELT', multiplier: 2.0 };
        }

        // VAPORIZE (Pyro + Hydro)
        if ((e1 === Elements.PYRO && e2 === Elements.HYDRO) || (e1 === Elements.HYDRO && e2 === Elements.PYRO)) {
            return { type: 'VAPORIZE', multiplier: 1.5 };
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
