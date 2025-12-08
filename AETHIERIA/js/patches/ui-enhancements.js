// Patch pour ajouter bouton plein écran à UI.js
// Version simplifiée sans onglets d'inventaire (cause erreur)

console.log('[PATCH] UI Enhancements (Fullscreen Button) loaded');

window.addEventListener('DOMContentLoaded', () => {
    // === BOUTON PLEIN ÉCRAN ===
    const createFullscreenButton = () => {
        // Vérifier si le bouton existe déjà
        if (document.getElementById('fullscreen-btn-patch')) return;

        const btn = document.createElement('button');
        btn.id = 'fullscreen-btn-patch';
        btn.innerHTML = '⛶ Plein Écran';

        // Styles inline forcés
        Object.assign(btn.style, {
            position: 'fixed',
            top: '10px',
            right: '10px',
            zIndex: '99999',
            padding: '10px 15px',
            background: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            border: '1px solid white',
            borderRadius: '4px',
            cursor: 'pointer',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            fontWeight: 'bold',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
        });

        btn.onclick = () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    console.error('[PATCH] Fullscreen error:', err);
                });
            } else {
                document.exitFullscreen();
            }
        };

        // Mettre à jour le texte selon l'état
        document.addEventListener('fullscreenchange', () => {
            btn.innerHTML = document.fullscreenElement ? '⛶ Quitter' : '⛶ Plein Écran';
        });

        document.body.appendChild(btn);
        console.log('[PATCH] Fullscreen button added successfully');
    };

    // Créer le bouton dès que possible
    createFullscreenButton();

    console.log('[PATCH] UI enhancements applied (Fullscreen only)');
});
