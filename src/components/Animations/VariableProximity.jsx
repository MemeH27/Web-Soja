import { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function VariableProximity({
    label,
    fromFontVariationSettings,
    toFontVariationSettings,
    containerRef,
    radius = 100,
    falloff = 'linear',
    className = '',
    onClick,
    ...props
}) {
    const letterRefs = useRef([]);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e) => {
            setMousePos({ x: e.clientX, y: e.clientY });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const parsedSettings = useMemo(() => {
        const parse = (s) => Object.fromEntries(s.split(',').map((x) => x.trim().split(' ').map((y) => y.replace(/"/g, ''))));
        return { from: parse(fromFontVariationSettings), to: parse(toFontVariationSettings) };
    }, [fromFontVariationSettings, toFontVariationSettings]);

    const words = useMemo(() => label.split(' '), [label]);

    return (
        <span
            className={`variable-proximity ${className}`}
            onClick={onClick}
            style={{ display: 'inline-block' }}
            {...props}
        >
            {words.map((word, wordIndex) => (
                <span key={wordIndex} style={{ display: 'inline-block', whiteSpace: 'nowrap', marginRight: '0.25em' }}>
                    {word.split('').map((letter, letterIndex) => {
                        const index = label.split('').slice(0, label.indexOf(word) + letterIndex).length;
                        return (
                            <motion.span
                                key={letterIndex}
                                ref={(el) => (letterRefs.current[index] = el)}
                                style={{ display: 'inline-block' }}
                                animate={{
                                    fontWeight: 400 + (index % 5) * 100 // Fallback if variable fonts are not present
                                }}
                            >
                                {letter}
                            </motion.span>
                        );
                    })}
                </span>
            ))}
        </span>
    );
}
