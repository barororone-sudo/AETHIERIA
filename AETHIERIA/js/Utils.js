// js/Utils.js
import * as THREE from 'three';

export const Utils = {
    // Clamp a value between min and max
    clamp: (value, min, max) => {
        return Math.max(min, Math.min(max, value));
    },

    // Linear interpolation
    lerp: (start, end, t) => {
        return start * (1 - t) + end * t;
    },

    // Convert degrees to radians
    degToRad: (degrees) => {
        return degrees * (Math.PI / 180);
    },

    // Random float between min and max
    randomRange: (min, max) => {
        return Math.random() * (max - min) + min;
    },

    // --- GRAPHICS HELPERS ---

    // Generate a 4-tone gradient map for Toon Shader
    createGradientMap: (colors = [0.0, 0.3, 0.6, 1.0]) => {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 1;
        const context = canvas.getContext('2d');

        // Draw the bands
        const step = canvas.width / colors.length;
        colors.forEach((c, i) => {
            const val = Math.floor(c * 255);
            context.fillStyle = `rgb(${val}, ${val}, ${val})`;
            context.fillRect(i * step, 0, step, 1);
        });

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.NearestFilter;
        texture.magFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        return texture;
    },

    // Create a procedural noise texture for normal/bump mapping
    createNoiseTexture: (width = 256, height = 256, scale = 1.0) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const val = Math.random() * 255 * scale;
            data[i] = val;     // R
            data[i + 1] = val; // G
            data[i + 2] = val; // B
            data[i + 3] = 255; // A
        }

        ctx.putImageData(imageData, 0, 0);

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    },

    // --- EASING FUNCTIONS ---
    easeOutBack: (x) => {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
    },
    easeOutElastic: (x) => {
        const c4 = (2 * Math.PI) / 3;
        return x === 0
            ? 0
            : x === 1
                ? 1
                : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
    },
    easeInOutQuad: (x) => {
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    },

    // Create an inverted hull mesh for outlines
    createOutlineMesh: (geometry, thickness = 0.02, color = 0x000000) => {
        const outlineMaterial = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.BackSide
        });
        const outlineMesh = new THREE.Mesh(geometry, outlineMaterial);
        outlineMesh.scale.setScalar(1 + thickness);
        return outlineMesh;
    },

    // --- NOISE ---
    Noise: {
        p: [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
            190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56, 87, 174, 20,
            125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220,
            105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200,
            196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126,
            255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70,
            221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97,
            228, 251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199,
            106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128,
            195, 78, 66, 215, 61, 156, 180],
        perm: [],
        init: function () {
            for (let i = 0; i < 256; i++) this.perm[i] = this.p[i];
            for (let i = 0; i < 256; i++) this.perm[256 + i] = this.p[i];
        },
        fade: function (t) { return t * t * t * (t * (t * 6 - 15) + 10); },
        lerp: function (t, a, b) { return a + t * (b - a); },
        grad: function (hash, x, y, z) {
            const h = hash & 15;
            const u = h < 8 ? x : y, v = h < 4 ? y : h == 12 || h == 14 ? x : z;
            return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
        },
        perlin2: function (x, y) {
            if (this.perm.length === 0) this.init();
            const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
            x -= Math.floor(x); y -= Math.floor(y);
            const u = this.fade(x), v = this.fade(y);
            const A = this.perm[X] + Y, AA = this.perm[A], AB = this.perm[A + 1],
                B = this.perm[X + 1] + Y, BA = this.perm[B], BB = this.perm[B + 1];
            return this.lerp(v, this.lerp(u, this.grad(this.perm[AA], x, y, 0), this.grad(this.perm[BA], x - 1, y, 0)),
                this.lerp(u, this.grad(this.perm[AB], x, y - 1, 0), this.grad(this.perm[BB], x - 1, y - 1, 0)));
        }
    }
};
