export default function ShinyText({ text, disabled = false, speed = 5, className = "" }) {
    const animationDuration = `${speed}s`;

    return (
        <span
            className={`shiny-text ${disabled ? "" : "animate-shiny"} ${className}`}
            style={{
                backgroundImage: 'linear-gradient(120deg, rgba(255, 255, 255, 0) 40%, rgba(255, 255, 255, 0.8) 50%, rgba(255, 255, 255, 0) 60%)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                display: 'inline-block',
                animationDuration: animationDuration,
            }}
        >
            {text}
        </span>
    );
}
