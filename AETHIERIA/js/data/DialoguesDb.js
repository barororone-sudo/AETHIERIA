export const DialoguesDb = {
    'lumina_intro': {
        start: {
            text: "Salutations, ECHO-7. Je suis Lumina, ton interface de navigation. Le monde a bien changé depuis ta mise en veille.",
            next: 'intro_2'
        },
        intro_2: {
            text: "Tes systèmes sont encore instables. Je détecte une arme rudimentaire à proximité. Va la chercher.",
            next: 'intro_3'
        },
        intro_3: {
            text: "Attention, les gardiens de ce monde ne te reconnaissent plus comme un allié.",
            choices: [
                { text: "Compris.", next: 'end' },
                { text: "Où suis-je ?", next: 'explanation' }
            ]
        },
        explanation: {
            text: "Nous sommes dans les Plaines d'Aethieria. Autrefois un havre de paix, aujourd'hui un champ de ruines.",
            next: 'intro_3'
        },
        end: {
            text: "Bonne chance, unité."
        }
    },
    'lumina_sword_found': {
        start: {
            text: "Excellente trouvaille. Cette épée est vieille, mais elle tranchera le métal rouillé.",
            next: 'sword_2'
        },
        sword_2: {
            text: "Maintenant, dirige-toi vers le pont. Le Gardien doit être neutralisé pour accéder à la Tour.",
            choices: [
                { text: "Je suis prêt.", next: 'end' }
            ]
        },
        end: {
            text: "Que le code soit avec toi."
        }
    },
    'lumina_act1_end': {
        start: {
            text: "Tour activée. Analyse des données... Terminé. Je capte un signal étrange venant de la Forêt à l'Est.",
            next: 'act1_2'
        },
        act1_2: {
            text: "C'est une signature énergétique corrompue. Nous devons enquêter.",
            choices: [
                { text: "En route pour la Forêt.", next: 'end' }
            ]
        },
        end: {
            text: "Reste sur tes gardes. Les ombres cachent bien des dangers."
        }
    }
};
