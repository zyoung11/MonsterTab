import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './SuggestionsList.module.css';
import { scaleFadeIn, scaleFadeOut } from '@/shared/utils/animations';

interface SuggestionsListProps {
    suggestions: string[];
    activeIndex: number;
    onSelect: (suggestion: string) => void;
    onHover: (index: number) => void;
    isExiting?: boolean;
    anchorRect: DOMRect | null;
}

export const SuggestionsList: React.FC<SuggestionsListProps> = ({
    suggestions,
    activeIndex,
    onSelect,
    onHover,
    isExiting = false,
    anchorRect,
}) => {
    const listRef = useRef<HTMLUListElement>(null);
    const hasEnteredRef = useRef(false);
    const [position, setPosition] = useState<React.CSSProperties>({});

    useEffect(() => {
        if (anchorRect) {
            const openDownward = window.innerHeight - anchorRect.bottom >= 320;
            setPosition({
                position: 'fixed',
                left: `${anchorRect.left}px`,
                width: `${anchorRect.width}px`,
                ...(openDownward
                    ? { top: `${anchorRect.bottom}px`, transformOrigin: 'top center', flexDirection: 'column' }
                    : { bottom: `${window.innerHeight - anchorRect.top}px`, transformOrigin: 'bottom center', flexDirection: 'column-reverse' }),
            });
        }
    }, [anchorRect]);

    // 入场动画
    useEffect(() => {
        if (listRef.current && !isExiting && anchorRect && !hasEnteredRef.current) {
            hasEnteredRef.current = true;
            scaleFadeIn(listRef.current);
        }
    }, [anchorRect, isExiting]);

    // 出场动画
    useEffect(() => {
        if (isExiting && listRef.current) {
            scaleFadeOut(listRef.current, 300);
        }
    }, [isExiting]);

    if (suggestions.length === 0 || !anchorRect) return null;

    return createPortal(
        <ul
            ref={listRef}
            className={styles.suggestionsList}
            style={position}
        >
            {suggestions.map((suggestion, index) => (
                <li
                    key={index}
                    className={`${styles.suggestionItem} ${index === activeIndex ? styles.active : ''}`}
                    onClick={() => onSelect(suggestion)}
                    onMouseEnter={() => onHover(index)}
                >
                    <span className={styles.suggestionText}>{suggestion}</span>
                </li>
            ))}
        </ul>,
        document.body
    );
};
