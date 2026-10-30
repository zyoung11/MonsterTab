import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { KeyHintEntry } from '../types';
import styles from './KeyHintOverlay.module.css';

/**
 * 判断元素是否真实可见，包括透明度和祖先隐藏
 */
function isElementVisible(el: Element): boolean {
    const checker = el as Element & { checkVisibility?: (options?: { checkOpacity?: boolean; checkVisibilityCSS?: boolean }) => boolean };
    if (typeof checker.checkVisibility === 'function') {
        return checker.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    }
    return true;
}

interface HintTarget {
    key: string;
    selector: string;
    hideWhenTargetHidden: boolean;
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
            { key: 'Space', selector: '[data-search-input]', hideWhenTargetHidden: false },
            { key: 'Tab', selector: '[data-space-switch]', hideWhenTargetHidden: true },
        ];
        for (const entry of entries) {
            list.push({ key: entry.key, selector: `[data-item-id="${entry.item.id}"]`, hideWhenTargetHidden: false });
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
                    const rect = el?.getBoundingClientRect();
                    const targetVisible = !!el && !!rect && rect.width > 0 && rect.height > 0 &&
                        (!targets[i].hideWhenTargetHidden || isElementVisible(el));
                    if (targetVisible && rect) {
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
