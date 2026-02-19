import { useEffect, useRef } from "react";

export default function ClickSpark({ sparkColor = "#e5242c", sparkSize = 10, sparkCount = 8, duration = 400 }) {
    const canvasRef = useRef(null);
    const sparksRef = useRef([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            sparksRef.current = sparksRef.current.filter((spark) => {
                const elapsed = Date.now() - spark.startTime;
                if (elapsed > duration) return false;

                const progress = elapsed / duration;
                const easeOut = 1 - Math.pow(1 - progress, 3);

                ctx.beginPath();
                ctx.strokeStyle = `${sparkColor}${Math.floor((1 - progress) * 255).toString(16).padStart(2, '0')}`;
                ctx.lineWidth = 2 * (1 - progress);

                const currentDist = spark.distance * easeOut;
                const x = spark.x + Math.cos(spark.angle) * currentDist;
                const y = spark.y + Math.sin(spark.angle) * currentDist;

                ctx.moveTo(x, y);
                ctx.lineTo(
                    x + Math.cos(spark.angle) * sparkSize * (1 - progress),
                    y + Math.sin(spark.angle) * sparkSize * (1 - progress)
                );
                ctx.stroke();

                return true;
            });

            requestAnimationFrame(animate);
        };

        const handleMouseDown = (e) => {
            const startTime = Date.now();
            for (let i = 0; i < sparkCount; i++) {
                sparksRef.current.push({
                    x: e.clientX,
                    y: e.clientY,
                    angle: (Math.PI * 2 * i) / sparkCount + Math.random() * 0.5,
                    distance: 30 + Math.random() * 20,
                    startTime,
                });
            }
        };

        window.addEventListener("mousedown", handleMouseDown);
        const animationId = requestAnimationFrame(animate);

        return () => {
            window.removeEventListener("resize", resizeCanvas);
            window.removeEventListener("mousedown", handleMouseDown);
            cancelAnimationFrame(animationId);
        };
    }, [sparkColor, sparkSize, sparkCount, duration]);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none fixed inset-0 z-[10000]"
        />
    );
}
