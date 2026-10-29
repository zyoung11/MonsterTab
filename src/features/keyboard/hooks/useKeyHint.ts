import { useCallback, useEffect, useMemo, useState } from 'react';
import { DockItem } from '@/shared/types';
import { KeyHintEntry } from '../types';

const ITEM_KEYS = [
    '1', '2', '3', '4', '5', '6', '7', '8', '9', '0',
    'a', 'b', 'c', 'd', 'e', 'f', 'h', 'i', 'j', 'k', 'l', 'm',
    'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
];

interface UseKeyHintOptions {
    items: DockItem[];
    disabled: boolean;
    onOpenItem: (item: DockItem) => void;
    onFocusSearch: () => void;
    onSwitchSpace: () => void;
}

interface KeyHintResult {
    isHintOpen: boolean;
    entries: KeyHintEntry[];
    closeHint: () => void;
}

/**
 * 键盘快捷打开系统
 * 非输入状态下按 g 打开小框，按分配键触发目标，Esc 关闭
 */
export function useKeyHint({ items, disabled, onOpenItem, onFocusSearch, onSwitchSpace }: UseKeyHintOptions): KeyHintResult {
    const [isHintOpen, setIsHintOpen] = useState(false);

    const entries = useMemo<KeyHintEntry[]>(
        () => items.slice(0, ITEM_KEYS.length).map((item, index) => ({ key: ITEM_KEYS[index], item })),
        [items]
    );

    const closeHint = useCallback(() => setIsHintOpen(false), []);

    useEffect(() => {
        if (disabled) setIsHintOpen(false);
    }, [disabled]);

    useEffect(() => {
        const isTyping = () => {
            const active = document.activeElement as HTMLElement | null;
            return !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
            if (disabled) return;

            const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;

            if (isTyping() || document.querySelector('[data-modal="true"]')) {
                if (isHintOpen) setIsHintOpen(false);
                return;
            }

            if (key === 'g') {
                event.preventDefault();
                setIsHintOpen((open) => !open);
                return;
            }

            if (!isHintOpen) return;

            if (key === 'Escape') {
                event.preventDefault();
                setIsHintOpen(false);
                return;
            }
            if (key === ' ') {
                event.preventDefault();
                setIsHintOpen(false);
                onFocusSearch();
                return;
            }
            if (key === 'Tab') {
                event.preventDefault();
                onSwitchSpace();
                return;
            }

            const entry = entries.find((candidate) => candidate.key === key);
            if (entry) {
                event.preventDefault();
                setIsHintOpen(false);
                onOpenItem(entry.item);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isHintOpen, entries, disabled, onOpenItem, onFocusSearch, onSwitchSpace]);

    return { isHintOpen, entries, closeHint };
}
