const isGecko = /Firefox|Zen/.test(navigator.userAgent);

/**
 * 在 Gecko 上用标签页替换保证页面获得键盘焦点，失败时按次数重试
 */
function relayOnce(attempt) {
    const api = typeof browser !== 'undefined' ? browser : chrome;
    api.tabs.getCurrent().then((tab) => {
        if (!tab) {
            throw new Error('no-tab');
        }
        return api.tabs.create({
            url: api.runtime.getURL('index.html') + '#kb',
            index: tab.index,
            windowId: tab.windowId,
            cookieStoreId: tab.cookieStoreId,
        }).then(() => api.tabs.remove(tab.id));
    }).catch(() => {
        if (attempt < 10) {
            window.setTimeout(() => relayOnce(attempt + 1), 50);
        } else {
            console.warn('[MonsterTab] relay failed, fallback to direct load');
            location.replace('index.html');
        }
    });
}

/**
 * 入口：Blink 立即跳转，Gecko 延迟执行标签页替换避开焦点流程
 */
function relayStart() {
    if (!isGecko) {
        location.replace('index.html');
        return;
    }
    const schedule = () => window.setTimeout(() => relayOnce(0), 150);
    if (document.visibilityState === 'hidden') {
        const onVisible = () => {
            window.removeEventListener('pageshow', onVisible);
            document.removeEventListener('visibilitychange', onVisible);
            schedule();
        };
        window.addEventListener('pageshow', onVisible);
        document.addEventListener('visibilitychange', onVisible);
        return;
    }
    schedule();
}

relayStart();
