import { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

export default function DecryptedText({
    text,
    speed = 50,
    maxIterations = 10,
    sequential = false,
    revealDirection = 'start',
    useOriginalCharsOnly = false,
    className = "",
    parentClassName = "",
    animateOn = 'view' // 'view' or 'hover'
}) {
    const [displayText, setDisplayText] = useState(text);
    const [isHovered, setIsHovered] = useState(false);
    const [isRevealing, setIsRevealing] = useState(false);
    const containerRef = useRef(null);
    const isInView = useInView(containerRef, { once: true, amount: 0.5 });

    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';

    useEffect(() => {
        const shouldAnimate = (animateOn === 'view' && isInView) || (animateOn === 'hover' && isHovered);

        if (shouldAnimate && !isRevealing) {
            setIsRevealing(true);
            let iteration = 0;
            const interval = setInterval(() => {
                setDisplayText(prevText => {
                    return text.split('').map((char, index) => {
                        if (char === ' ') return ' ';
                        if (iteration > maxIterations) return char;
                        if (sequential && iteration > index) return char;

                        return characters[Math.floor(Math.random() * characters.length)];
                    }).join('');
                });

                iteration++;
                if (iteration > maxIterations + (sequential ? text.length : 0)) {
                    clearInterval(interval);
                    setDisplayText(text);
                    setIsRevealing(false);
                }
            }, speed);

            return () => clearInterval(interval);
        }
    }, [isInView, isHovered, text, speed, maxIterations, sequential, animateOn, isRevealing]);

    return (
        <span
            ref={containerRef}
            className={`inline-block whitespace-pre-wrap ${parentClassName}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span className={className}>{displayText}</span>
        </span>
    );
}
