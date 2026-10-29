import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { KeyHintEntry } from '../types';
import styles from './KeyHintOverlay.module.css';

interface HintTarget {
    key: string;
    selector: string;
}

interface KeyHintOverlayProps {
    isOpen: boolean;
    entries: KeyHintEntry[];
}

/**
 * 快捷打开角标覆盖层
 * 在目标元素左上角显示按键标记，每帧跟随目标位置，不拦截页面交互
 */
export const KeyHintOverlay: React.FC<KeyHintOverlayProps> = ({ isOpen, entries }) => {
    const overlayRef = useRef<HTMLDivElement>(null);

    const targets = useMemo<HintTarget[]>(() => {
        const list: HintTarget[] = [
            { key: 'Space', selector: '[data-search-input]' },
            { key: 'Tab', selector: '[data-space-switch]' },
        ];
        for (const entry of entries) {
            list.push({ key: entry.key, selector: `[data-item-id="${entry.item.id}"]` });
        }
        return list;
    }, [entries]);

    useLayoutEffect(() => {
        if (!isOpen) return;

        let raf = 0;
        const tick = () => {
            const overlay = overlayRef.current;
            if (overlay) {
                const spans = overlay.querySelectorAll<HTMLElement>('[data-mark-index]');
                for (let i = 0; i < targets.length; i++) {
                    const span = spans[i];
                    if (!span) continue;
                    const el = document.querySelector(targets[i].selector);
                    if (el) {
                        const rect = el.getBoundingClientRect();
                        span.style.display = '';
                        span.style.left = `${Math.round(rect.left)}px`;
                        span.style.top = `${Math.round(rect.top)}px`;
                    } else {
                        span.style.display = 'none';
                    }
                }
            }
            raf = requestAnimationFrame(tick);
        };

        tick();

        return () => cancelAnimationFrame(raf);
    }, [isOpen, targets]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} ref={overlayRef}>
            {targets.map((target, index) => (
                <span
                    key={`${target.key}-${index}`}
                    className={styles.mark}
                    data-mark-index={index}
                >
                    {target.key}
                </span>
            ))}
        </div>
    );
};
