export default function Skeleton({ className = "", circle = false, width, height }) {
    const style = {
        width: width || '100%',
        height: height || '1rem',
        borderRadius: circle ? '9999px' : '0.75rem'
    };

    return (
        <div
            className={`skeleton ${className}`}
            style={style}
            aria-hidden="true"
        />
    );
}
