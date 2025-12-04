
export class ErrorHandler {
    static init() {
        window.onerror = (message, source, lineno, colno, error) => {
            ErrorHandler.showError(message, source, lineno, colno, error);
            return true; // Prevent default browser console error (optional)
        };

        window.onunhandledrejection = (event) => {
            // Ignore benign PointerLock errors
            if (event.reason && event.reason.name === 'SecurityError' && event.reason.message.includes('lock')) {
                console.warn("Ignored SecurityError (PointerLock):", event.reason);
                return;
            }
            ErrorHandler.showError("Unhandled Promise Rejection", "", 0, 0, event.reason);
        };
    }

    static showError(message, source, lineno, colno, error) {
        console.error("CRITICAL ERROR:", error);

        // Pause Game
        if (window.game) {
            window.game.isRunning = false;
            if (window.game.clock) window.game.clock.stop();
        }

        const popup = document.getElementById('error-popup');
        if (popup) {
            popup.style.display = 'flex';
            const content = document.getElementById('error-content');
            if (content) {
                content.innerHTML = `
                    <strong>Error:</strong> ${message}<br>
                    <small>${source}:${lineno}:${colno}</small><br>
                    <pre>${error && error.stack ? error.stack : ''}</pre>
                `;
            }
        }
    }
}
