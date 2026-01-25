import { useRef, useEffect } from 'react';

const DreamCanvas = ({ active }) => {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;

        let time = 0;

        // Particles/Blobs
        const blobs = Array.from({ length: 5 }, (_, i) => ({
            x: Math.random() * width,
            y: Math.random() * height,
            r: Math.random() * 100 + 100,
            dx: (Math.random() - 0.5) * 2,
            dy: (Math.random() - 0.5) * 2,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`
        }));

        const animate = () => {
            ctx.clearRect(0, 0, width, height);

            // Background dissolve
            ctx.fillStyle = '#080810';
            ctx.fillRect(0, 0, width, height);

            // Composite mode for dreamy effect
            ctx.globalCompositeOperation = 'screen';

            if (active) {
                time += 0.01;
            }

            blobs.forEach(blob => {
                // Move
                if (active) {
                    blob.x += blob.dx + Math.sin(time) * 2;
                    blob.y += blob.dy + Math.cos(time) * 2;
                }

                // Bounce
                if (blob.x < 0 || blob.x > width) blob.dx *= -1;
                if (blob.y < 0 || blob.y > height) blob.dy *= -1;

                // Draw with gradient
                const gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r * (active ? 1.5 : 1));
                gradient.addColorStop(0, blob.color);
                gradient.addColorStop(1, 'transparent');

                ctx.fillStyle = gradient;
                ctx.beginPath();
                ctx.arc(blob.x, blob.y, blob.r * 2, 0, Math.PI * 2);
                ctx.fill();
            });

            // Filter layer for blur
            // Note: Canvas filter is heavy, used sparingly or fake it with CSS backdrop filter on a top layer

            requestAnimationFrame(animate);
        };

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', handleResize);
        animate();

        return () => window.removeEventListener('resize', handleResize);
    }, [active]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                zIndex: -1,
                filter: 'blur(80px)', // The "Oneiric" blur trick
                opacity: 0.8
            }}
        />
    );
};

export default DreamCanvas;
