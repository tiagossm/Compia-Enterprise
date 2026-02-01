import { useEffect, useRef } from 'react';

interface Particle {
    x: number;
    y: number;
    size: number;
    speedX: number;
    speedY: number;
    color: string;
    opacity: number;
}

const ParticleBackground = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let width = window.innerWidth;
        let height = window.innerHeight;

        const particles: Particle[] = [];

        // Antigravity Brand Colors (Blue/Indigo/Slate mix)
        const colors = [
            'rgba(59, 130, 246, 0.8)',   // Blue-500
            'rgba(99, 102, 241, 0.8)',   // Indigo-500
            'rgba(37, 99, 235, 0.8)',    // Blue-600
            'rgba(79, 70, 229, 0.8)',    // Indigo-600
            'rgba(148, 163, 184, 0.5)',  // Slate-400 (subtle)
        ];

        let mouse = { x: -1000, y: -1000 };

        const handleMouseMove = (e: MouseEvent) => {
            mouse.x = e.clientX;
            mouse.y = e.clientY;
        };

        const createParticle = (): Particle => {
            return {
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 5 + 2, // Larger squares (2-7px)
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5 - 0.2,
                color: colors[Math.floor(Math.random() * colors.length)],
                opacity: Math.random() * 0.6 + 0.3 // More opaque
            };
        };

        const init = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            canvas.width = width;
            canvas.height = height;

            const particleCount = Math.floor((width * height) / 15000);

            for (let i = 0; i < particleCount; i++) {
                particles.push(createParticle());
            }
        };

        const animate = () => {
            if (!ctx || !canvas) return;

            ctx.clearRect(0, 0, width, height);

            particles.forEach((p) => {
                // Mouse Interaction (Attraction)
                const dx = mouse.x - p.x;
                const dy = mouse.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const maxDistance = 300; // Much larger radius (was 150)

                if (distance < maxDistance) {
                    const forceDirectionX = dx / distance;
                    const forceDirectionY = dy / distance;
                    const force = (maxDistance - distance) / maxDistance;

                    // Stronger attraction
                    const attractionStrength = 0.3; // Was 0.05
                    p.speedX += forceDirectionX * force * attractionStrength;
                    p.speedY += forceDirectionY * force * attractionStrength;
                }

                // Apply Friction/Damping to stabilize speed (prevent them from flying off too fast)
                p.speedX *= 0.98;
                p.speedY *= 0.98;

                // Move
                p.x += p.speedX;
                p.y += p.speedY;

                // Limit max speed
                const maxSpeed = 4; // Slightly faster limit
                const currentSpeed = Math.sqrt(p.speedX * p.speedX + p.speedY * p.speedY);
                if (currentSpeed > maxSpeed) {
                    p.speedX = (p.speedX / currentSpeed) * maxSpeed;
                    p.speedY = (p.speedY / currentSpeed) * maxSpeed;
                }

                // Wrap around logic
                if (p.x < 0) p.x = width;
                if (p.x > width) p.x = 0;
                if (p.y < 0) p.y = height;
                if (p.y > height) p.y = 0;

                // Draw
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.opacity;
                ctx.beginPath();
                // Drawing squares for "tech" feel instead of circles
                ctx.fillRect(p.x, p.y, p.size, p.size);
            });

            // Connect nearby particles (Constellation effect - subtle)
            /* 
            particles.forEach((a, i) => {
              particles.slice(i + 1).forEach(b => {
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
      
                if (distance < 100) {
                  ctx.strokeStyle = `rgba(148, 163, 184, ${0.1 * (1 - distance / 100)})`;
                  ctx.lineWidth = 0.5;
                  ctx.beginPath();
                  ctx.moveTo(a.x, a.y);
                  ctx.lineTo(b.x, b.y);
                  ctx.stroke();
                }
              });
            });
            */

            animationFrameId.current = requestAnimationFrame(animate);
        };

        const handleResize = () => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            particles.length = 0;
            init();
        };

        init();
        animate();

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none bg-transparent"
        />
    );
};

export default ParticleBackground;
