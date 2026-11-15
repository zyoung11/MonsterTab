import { PAGE_LOADING_EVENT } from '@/shared/constants/events';

const FEEDBACK_DELAY = 400;

export interface LinkOrigin {
    x: number;
    y: number;
}

interface TransitionSnapshot {
    inlineCss: string;
    links: string;
    base: string;
    theme: string;
    htmlStyle: string;
    bodyStyle: string;
    bodyHtml: string;
}

function collectTransitionSnapshot(): TransitionSnapshot {
    const doc = document.documentElement;
    const theme = doc.getAttribute('data-theme') || '';
    let inlineCss = '';
    let links = '';
    for (const sheet of Array.from(document.styleSheets)) {
        try {
            for (const rule of Array.from((sheet as CSSStyleSheet).cssRules)) {
                inlineCss += rule.cssText + '\n';
            }
        } catch {
            if (sheet.href) {
                links += `<link rel="stylesheet" href="${sheet.href}">`;
            }
        }
    }
    const background = getComputedStyle(doc).getPropertyValue('--background-custom').trim();
    const fallback = theme === 'dark' ? '#1c1c1e' : '#f3f3f3';
    const bodyClone = document.body.cloneNode(true) as HTMLElement;
    for (const script of Array.from(bodyClone.querySelectorAll('script'))) {
        script.remove();
    }
    return {
        inlineCss,
        links,
        base: background || fallback,
        theme,
        htmlStyle: doc.getAttribute('style') || '',
        bodyStyle: document.body.getAttribute('style') || '',
        bodyHtml: bodyClone.innerHTML,
    };
}

function writeTransitionPage(win: Window, snapshot: TransitionSnapshot): void {
    const target = win.document;
    target.documentElement.style.background = '#000';
    target.body.style.background = '#000';
    target.body.style.margin = '0';
    if (snapshot.links) {
        target.head.insertAdjacentHTML('beforeend', snapshot.links);
    }
    const style = target.createElement('style');
    style.textContent =
        snapshot.inlineCss +
        `html,body{height:100%;margin:0;background:${snapshot.base};background-size:cover}` +
        `#snapshot{min-height:100%;animation:exitFade 1.4s cubic-bezier(.55,0,.75,.2) forwards}` +
        `#veil{position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;animation:veilIn 1.4s cubic-bezier(.55,0,.75,.2) forwards}` +
        `@keyframes veilIn{0%{opacity:0}45%{opacity:.3}100%{opacity:.92}}` +
        `@keyframes exitFade{` +
        `0%{filter:blur(14px) brightness(.55) contrast(.82);opacity:.95;transform:scale(1.06) translate(4px,-3px) rotate(.8deg)}` +
        `35%{filter:blur(32px) brightness(.4) contrast(.74);opacity:.78;transform:scale(1.13) translate(-9px,7px) rotate(-1.4deg)}` +
        `70%{filter:blur(56px) brightness(.28) contrast(.66);opacity:.5;transform:scale(1.22) translate(11px,-9px) rotate(1.8deg)}` +
        `100%{filter:blur(76px) brightness(.22) contrast(.62);opacity:0;transform:scale(1.3) translate(-7px,5px) rotate(-1deg)}}`;
    target.head.appendChild(style);
    target.documentElement.setAttribute('style', snapshot.htmlStyle);
    if (snapshot.theme) {
        target.documentElement.setAttribute('data-theme', snapshot.theme);
    }
    target.body.setAttribute('style', snapshot.bodyStyle);
    const snapshotEl = target.createElement('div');
    snapshotEl.id = 'snapshot';
    snapshotEl.innerHTML = snapshot.bodyHtml;
    target.body.appendChild(snapshotEl);
    const veil = target.createElement('div');
    veil.id = 'veil';
    target.body.appendChild(veil);
}

function playScreenFade(): void {
    const root = document.getElementById('root');
    if (!root) return;
    root.animate([
        {
            filter: 'blur(0px) brightness(1) contrast(1)',
            transform: 'scale(1) translate(0px, 0px) rotate(0deg)',
            offset: 0,
        },
        {
            filter: 'blur(12px) brightness(0.62) contrast(0.86)',
            transform: 'scale(1.05) translate(-5px, 4px) rotate(-0.8deg)',
            offset: 0.3,
        },
        {
            filter: 'blur(28px) brightness(0.42) contrast(0.78)',
            transform: 'scale(1.1) translate(9px, -7px) rotate(1.4deg)',
            offset: 0.55,
        },
        {
            filter: 'blur(50px) brightness(0.3) contrast(0.7)',
            transform: 'scale(1.16) translate(-12px, 9px) rotate(-2deg)',
            offset: 0.8,
        },
        {
            filter: 'blur(68px) brightness(0.24) contrast(0.66)',
            transform: 'scale(1.22) translate(8px, -6px) rotate(1.2deg)',
            offset: 1,
        },
    ], { duration: 700, easing: 'cubic-bezier(0.55, 0, 0.75, 0.2)' });
}

export function openLink(url: string, newTab: boolean, origin?: LinkOrigin): void {
    window.dispatchEvent(new CustomEvent(PAGE_LOADING_EVENT, { detail: origin }));
    playScreenFade();
    window.setTimeout(() => {
        if (newTab) {
            const snapshot = collectTransitionSnapshot();
            const win = window.open('about:blank', '_blank');
            if (win) {
                writeTransitionPage(win, snapshot);
                void fetch(url, { mode: 'no-cors' }).catch(() => undefined);
                win.location.replace(url);
                return;
            }
        }
        window.open(url, newTab ? '_blank' : '_self');
    }, FEEDBACK_DELAY);
}
