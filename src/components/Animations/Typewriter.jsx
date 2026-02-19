import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function Typewriter({
    text,
    speed = 30,
    delay = 0,
    className = "",
    cursor = true,
    cursorClassName = "bg-[#e5242c]",
    onComplete
}) {
    const [displayedText, setDisplayedText] = useState("");
    const [isComplete, setIsComplete] = useState(false);
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: true, amount: 0.5 });

    useEffect(() => {
        if (isInView) {
            let timeout;
            let currentText = "";
            let index = 0;

            const type = () => {
                if (index < text.length) {
                    currentText += text[index];
                    setDisplayedText(currentText);
                    index++;
                    timeout = setTimeout(type, speed);
                } else {
                    setIsComplete(true);
                    if (onComplete) onComplete();
                }
            };

            const startTimeout = setTimeout(type, delay);
            return () => {
                clearTimeout(startTimeout);
                clearTimeout(timeout);
            };
        }
    }, [isInView, text, speed, delay, onComplete]);

    return (
        <span
            ref={containerRef}
            className={`inline-block whitespace-pre-wrap ${className}`}
        >
            {displayedText}
            {cursor && !isComplete && (
                <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                    className={`inline-block w-[2px] h-[1.2em] ml-1 align-middle ${cursorClassName}`}
                />
            )}
        </span>
    );
}
