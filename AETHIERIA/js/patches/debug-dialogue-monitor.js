
(function () {
    window.addEventListener('load', () => {
        const debugBox = document.createElement('div');
        debugBox.style.position = 'fixed';
        debugBox.style.top = '10px';
        debugBox.style.right = '10px';
        debugBox.style.background = 'rgba(0,0,0,0.8)';
        debugBox.style.color = 'lime';
        debugBox.style.padding = '10px';
        debugBox.style.zIndex = '99999999';
        debugBox.style.fontFamily = 'monospace';
        debugBox.style.fontSize = '12px';
        debugBox.innerHTML = "WAITING FOR DIALOGUE...";
        document.body.appendChild(debugBox);

        setInterval(() => {
            const dialog = document.getElementById('dialogue-container');
            if (!dialog) {
                debugBox.innerHTML = "❌ #dialogue-container NOT FOUND in DOM";
                return;
            }

            const computed = window.getComputedStyle(dialog);
            const rect = dialog.getBoundingClientRect();

            debugBox.innerHTML = `
                <strong>Dialogue Debugger</strong><br>
                Display: ${dialog.style.display} (Computed: ${computed.display})<br>
                Opacity: ${computed.opacity}<br>
                Visibility: ${computed.visibility}<br>
                Z-Index: ${computed.zIndex}<br>
                Position: ${computed.position}<br>
                Rect: ${Math.round(rect.width)}x${Math.round(rect.height)} at (${Math.round(rect.left)}, ${Math.round(rect.top)})<br>
                Background: ${computed.backgroundColor}<br>
                Children: ${dialog.children.length}
            `;
        }, 500);
    });
})();
