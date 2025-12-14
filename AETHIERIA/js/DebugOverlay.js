
export class DebugOverlay {
    constructor(game) {
        this.game = game;
        this.el = document.createElement('div');
        Object.assign(this.el.style, {
            position: 'fixed',
            bottom: '10px',
            left: '10px',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: '#00ff00',
            fontFamily: 'monospace',
            fontSize: '12px',
            padding: '10px',
            pointerEvents: 'none',
            zIndex: '99999',
            whiteSpace: 'pre',
            border: '1px solid #00ff00'
        });
        document.body.appendChild(this.el);
        this.update();
    }

    update() {
        requestAnimationFrame(() => this.update());

        if (!this.game.world) {
            this.el.innerText = "Waiting for World...";
            return;
        }

        const towers = this.game.world.towers || [];
        const waypoints = this.game.world.waypoints || [];
        const map = this.game.ui ? this.game.ui.mapManager : null;
        let iconCount = 0;
        let scale = 0;
        let mapSize = 0;

        if (map) {
            iconCount = map.iconLayer ? map.iconLayer.children.length : 0;
            scale = map.viewState ? map.viewState.scale : 0;
            mapSize = map.mapSize;
        }

        const cities = this.game.world.cities || [];

        const towerIds = towers.map(t => t.id).join(', ');

        this.el.innerText = `DEBUG INFO:
        Towers Spawned: ${towers.length}
        Cities Spawned: ${cities.length}
        Waypoints Spawned: ${waypoints.length}
        Map Icons (Total): ${iconCount}
        Map Scale: ${scale.toFixed(3)}
        Map Size: ${mapSize}
        
        Tower IDs:
        ${towerIds}
        `;

    }
}
