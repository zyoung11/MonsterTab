import React, { useEffect, useState } from 'react';
import { PAGE_LOADING_EVENT } from '@/shared/constants/events';
import type { LinkOrigin } from '@/shared/utils/openLink';
import styles from './Shockwave.module.css';

interface ShockwaveEntry {
    id: number;
    x: number;
    y: number;
}

export const Shockwave: React.FC = () => {
    const [waves, setWaves] = useState<ShockwaveEntry[]>([]);

    useEffect(() => {
        const handleLoading = (event: Event) => {
            const origin = (event as CustomEvent<LinkOrigin | undefined>).detail;
            const x = origin?.x ?? window.innerWidth / 2;
            const y = origin?.y ?? window.innerHeight / 2;
            const id = Date.now() + Math.random();
            setWaves((prev) => [...prev, { id, x, y }]);
            window.setTimeout(() => {
                setWaves((prev) => prev.filter((wave) => wave.id !== id));
            }, 900);

            const targets = document.querySelectorAll(
                '[data-item-id], [data-sticker-id], [data-search-input], [data-space-switch], [data-shock-target]'
            );
            for (const target of targets) {
                const rect = target.getBoundingClientRect();
                const dx = rect.left + rect.width / 2 - x;
                const dy = rect.top + rect.height / 2 - y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < 48) continue;
                target.animate([
                    { scale: '1 1', translate: '0px 0px', rotate: '0deg' },
                    { scale: '0.86 1.16', translate: '0px -14px', rotate: '-2.5deg', offset: 0.35 },
                    { scale: '1.08 0.94', translate: '0px 5px', rotate: '1.5deg', offset: 0.7 },
                    { scale: '1 1', translate: '0px 0px', rotate: '0deg' },
                ], {
                    duration: 620,
                    delay: Math.min(distance / 4, 650),
                    easing: 'cubic-bezier(0.33, 1, 0.68, 1)',
                    fill: 'backwards',
                });
            }
        };
        window.addEventListener(PAGE_LOADING_EVENT, handleLoading);
        return () => window.removeEventListener(PAGE_LOADING_EVENT, handleLoading);
    }, []);

    return (
        <div className={styles.shockLayer}>
            {waves.map((wave) => (
                <React.Fragment key={wave.id}>
                    <span
                        className={styles.shockwave}
                        style={{ left: wave.x, top: wave.y }}
                    />
                    <span
                        className={`${styles.shockwave} ${styles.shockwaveSecond}`}
                        style={{ left: wave.x, top: wave.y }}
                    />
                </React.Fragment>
            ))}
        </div>
    );
};
