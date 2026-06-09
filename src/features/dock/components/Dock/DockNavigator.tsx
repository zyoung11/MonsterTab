import React, { useRef, useCallback } from 'react';
import { Space } from '@/shared/types';
import { useLanguage } from '@/shared/context/LanguageContext';
import styles from './DockNavigator.module.css';

/** 长按触发阈值 (ms) */
const LONG_PRESS_DURATION = 200;

interface DockNavigatorProps {
    /** 当前空间对象 */
    currentSpace: Space;

    /** 空间总数 */
    totalSpaces: number;

    /** 当前空间在列表中的索引 (用于分页点) */
    currentIndex: number;

    /** 左键点击: 触发切换 */
    onSwitch: () => void;

    /** 右键点击: 打开管理菜单 */
    onContextMenu: (event: React.MouseEvent) => void;

    /** 长按触发: 弹出空间快速切换器 */
    onLongPress?: () => void;

    /** 是否禁用 (动画进行中) */
    disabled?: boolean;
}

/**
 * DockNavigator - 空间导航器
 * 显示当前空间名称，支持单击切换、长按弹出空间选择器、右键管理
 * 
 * 长按检测逻辑：
 * - mousedown 启动 200ms 计时器
 * - 鼠标移动和离开 Navigator 不会取消计时器（支持按住直接上滑）
 * - 如果 200ms 内松手（mouseup），视为短按 → 切换下一个空间
 * - 如果 200ms 后还没松手，触发 onLongPress → 弹出选择器
 */
export function DockNavigator({
    currentSpace,
    totalSpaces,
    currentIndex,
    onSwitch,
    onContextMenu,
    onLongPress,
    disabled = false,
}: DockNavigatorProps) {
    const { t } = useLanguage();

    // 长按检测相关 refs
    const longPressTimerRef = useRef<number | null>(null);
    const isLongPressRef = useRef(false);

    const clearLongPress = useCallback(() => {
        if (longPressTimerRef.current !== null) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return; // 仅左键
        if (disabled || totalSpaces <= 1) return;

        isLongPressRef.current = false;

        longPressTimerRef.current = window.setTimeout(() => {
            isLongPressRef.current = true;
            longPressTimerRef.current = null;
            onLongPress?.();
        }, LONG_PRESS_DURATION);
    }, [disabled, totalSpaces, onLongPress]);

    // mouseup 监听全局，这样即使鼠标已经滑出 Navigator 也能检测到
    const handleGlobalMouseUp = useCallback(() => {
        // 如果长按计时器还在运行（未达到长按阈值），视为短按
        if (longPressTimerRef.current !== null) {
            clearLongPress();
            if (!disabled && totalSpaces > 1) {
                onSwitch();
            }
        }
        isLongPressRef.current = false;
    }, [clearLongPress, disabled, totalSpaces, onSwitch]);

    // mousedown 时注册一次性全局 mouseup 监听
    const handleMouseDownWrapper = useCallback((e: React.MouseEvent) => {
        handleMouseDown(e);
        // 注册一次性全局 mouseup，确保鼠标滑出后松手也能检测
        const onUp = () => {
            handleGlobalMouseUp();
            document.removeEventListener('mouseup', onUp);
        };
        document.addEventListener('mouseup', onUp);
    }, [handleMouseDown, handleGlobalMouseUp]);

    const handleClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        clearLongPress();
        onContextMenu(e);
    }, [clearLongPress, onContextMenu]);

    return (
        <div
            className={`${styles.navigator} ${disabled ? styles.disabled : ''}`}
            onClick={handleClick}
            onMouseDown={handleMouseDownWrapper}
            onContextMenu={handleContextMenu}
            title={`${t.space.tooltip}: ${currentSpace.name}\n${t.space.switch}\n${t.space.manage}`}
        >
            {/* 空间名称 */}
            <span className={styles.spaceName}>{currentSpace.name}</span>

            {/* 分页指示点 */}
            {totalSpaces > 1 && (
                <div className={styles.dots}>
                    {Array.from({ length: totalSpaces }).map((_, index) => (
                        <span
                            key={index}
                            className={`${styles.dot} ${index === currentIndex ? styles.dotActive : ''}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
