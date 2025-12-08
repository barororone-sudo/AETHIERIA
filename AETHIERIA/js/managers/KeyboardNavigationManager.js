// js/managers/KeyboardNavigationManager.js

/**
 * Gestionnaire de navigation au clavier pour les éléments UI
 * Permet de naviguer avec les flèches et confirmer avec Entrée
 */
export class KeyboardNavigationManager {
    constructor() {
        this.focusedIndex = 0;
        this.elements = [];
        this.isActive = false;
        this.container = null;

        this.init();
    }

    init() {
        window.addEventListener('keydown', (e) => {
            if (!this.isActive || this.elements.length === 0) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.navigate(-1);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.navigate(1);
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.navigateGrid(-1);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.navigateGrid(1);
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.confirm();
                    break;
                case 'Escape':
                    e.preventDefault();
                    this.deactivate();
                    break;
            }
        });
    }

    /**
     * Active la navigation sur un conteneur
     */
    activate(container, selector = 'button, .profile-card, .inventory-slot, .zelda-btn, .btn-action') {
        this.container = container;
        this.elements = Array.from(container.querySelectorAll(selector));

        // Filtrer les éléments visibles et non désactivés
        this.elements = this.elements.filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                !el.disabled &&
                !el.classList.contains('disabled');
        });

        if (this.elements.length > 0) {
            this.isActive = true;
            this.focusedIndex = 0;
            this.updateFocus();
        }
    }

    /**
     * Désactive la navigation
     */
    deactivate() {
        this.isActive = false;
        this.removeFocus();
        this.elements = [];
        this.container = null;
    }

    /**
     * Navigation verticale (haut/bas)
     */
    navigate(direction) {
        this.removeFocus();

        this.focusedIndex += direction;

        // Wrap around
        if (this.focusedIndex < 0) {
            this.focusedIndex = this.elements.length - 1;
        } else if (this.focusedIndex >= this.elements.length) {
            this.focusedIndex = 0;
        }

        this.updateFocus();
    }

    /**
     * Navigation en grille (gauche/droite)
     * Détecte automatiquement le nombre de colonnes
     */
    navigateGrid(direction) {
        if (this.elements.length === 0) return;

        // Détecter si on est dans une grille
        const currentEl = this.elements[this.focusedIndex];
        const parent = currentEl.parentElement;
        const computedStyle = window.getComputedStyle(parent);

        // Si c'est une grille CSS
        if (computedStyle.display === 'grid') {
            const columns = computedStyle.gridTemplateColumns.split(' ').length;
            this.removeFocus();
            this.focusedIndex += direction;

            // Wrap around
            if (this.focusedIndex < 0) {
                this.focusedIndex = this.elements.length - 1;
            } else if (this.focusedIndex >= this.elements.length) {
                this.focusedIndex = 0;
            }

            this.updateFocus();
        } else {
            // Sinon, navigation linéaire
            this.navigate(direction);
        }
    }

    /**
     * Confirmer l'élément sélectionné
     */
    confirm() {
        if (this.focusedIndex >= 0 && this.focusedIndex < this.elements.length) {
            const element = this.elements[this.focusedIndex];

            // Déclencher le clic
            element.click();

            // Effet visuel
            element.style.transform = 'scale(0.95)';
            setTimeout(() => {
                element.style.transform = '';
            }, 100);
        }
    }

    /**
     * Met à jour le focus visuel
     */
    updateFocus() {
        if (this.focusedIndex >= 0 && this.focusedIndex < this.elements.length) {
            const element = this.elements[this.focusedIndex];
            element.classList.add('keyboard-focused');
            element.focus();

            // Scroll into view si nécessaire
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }

    /**
     * Retire le focus visuel
     */
    removeFocus() {
        this.elements.forEach(el => {
            el.classList.remove('keyboard-focused');
        });
    }

    /**
     * Rafraîchir la liste des éléments (utile si le DOM change)
     */
    refresh() {
        if (this.container) {
            const currentElement = this.elements[this.focusedIndex];
            this.activate(this.container);

            // Essayer de garder le même élément focusé
            if (currentElement) {
                const newIndex = this.elements.indexOf(currentElement);
                if (newIndex !== -1) {
                    this.focusedIndex = newIndex;
                    this.updateFocus();
                }
            }
        }
    }
}
