import React, { useEffect, useState } from 'react';
import { PAGE_LOADING_EVENT } from '@/shared/constants/events';
import styles from './LoadBar.module.css';

export const LoadBar: React.FC = () => {
    const [active, setActive] = useState(false);

    useEffect(() => {
        let timer = 0;
        const handleLoading = () => {
            window.clearTimeout(timer);
            setActive(false);
            window.requestAnimationFrame(() => {
                setActive(true);
                timer = window.setTimeout(() => setActive(false), 800);
            });
        };
        window.addEventListener(PAGE_LOADING_EVENT, handleLoading);
        return () => {
            window.removeEventListener(PAGE_LOADING_EVENT, handleLoading);
            window.clearTimeout(timer);
        };
    }, []);

    if (!active) return null;

    return (
        <div className={styles.loadBar}>
            <div className={styles.loadBarFill} />
        </div>
    );
};
