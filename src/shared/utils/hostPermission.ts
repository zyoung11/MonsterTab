/**
 * Host 权限管理工具
 * 用于动态请求 <all_urls> host 权限（图标获取等功能需要）
 * 
 * 设计思路：
 * - 权限通过 optional_host_permissions 声明，安装时不会弹出权限提示
 * - 用户首次使用"从网站获取图标"等功能时，动态请求权限
 * - 权限一旦授予，在扩展更新/重装前持续有效
 * - chrome.permissions.request() 必须在用户手势（点击等）中调用
 */

// Firefox browser API 声明
declare const browser: any;

const ALL_URLS_ORIGIN = '<all_urls>';

// ============================================================================
// 请求去重: 避免多个并发的 fetchIconFromNetwork 各自触发权限弹窗
// ============================================================================
let pendingRequest: Promise<boolean> | null = null;
let pendingEnsure: Promise<boolean> | null = null;
let hasPermissionCache: boolean | null = null;
let deniedCooldownUntil = 0;
const DENIED_COOLDOWN = 60 * 1000;

/**
 * 检查是否已获得 host 权限（不会弹出权限请求）
 */
export async function hasHostPermission(): Promise<boolean> {
    try {
        if (typeof chrome !== 'undefined' && chrome.permissions) {
            return new Promise((resolve) => {
                chrome.permissions.contains({ origins: [ALL_URLS_ORIGIN] }, (result) => {
                    hasPermissionCache = result;
                    resolve(result);
                });
            });
        }
        if (typeof browser !== 'undefined' && browser?.permissions) {
            const result = await browser.permissions.contains({ origins: [ALL_URLS_ORIGIN] });
            hasPermissionCache = result;
            return result;
        }
    } catch {
        // 非扩展环境（开发模式）
    }
    return false;
}

/**
 * 请求 host 权限（必须在用户手势中调用）
 * 内置去重: 多个并发调用只会弹出一个权限窗口，后续调用复用同一结果
 * @returns 是否成功获得权限
 */
export async function requestHostPermission(): Promise<boolean> {
    if (hasPermissionCache === true) {
        return true;
    }
    if (Date.now() < deniedCooldownUntil) {
        return false;
    }

    // 如果已有进行中的请求，直接复用
    if (pendingRequest) {
        return pendingRequest;
    }

    const doRequest = async (): Promise<boolean> => {
        try {
            if (typeof chrome !== 'undefined' && chrome.permissions) {
                return new Promise((resolve) => {
                    chrome.permissions.request({ origins: [ALL_URLS_ORIGIN] }, (granted) => {
                        hasPermissionCache = granted;
                        if (!granted) deniedCooldownUntil = Date.now() + DENIED_COOLDOWN;
                        resolve(granted);
                    });
                });
            }
            if (typeof browser !== 'undefined' && browser?.permissions) {
                const granted = await browser.permissions.request({ origins: [ALL_URLS_ORIGIN] });
                hasPermissionCache = granted;
                if (!granted) deniedCooldownUntil = Date.now() + DENIED_COOLDOWN;
                return granted;
            }
        } catch {
            deniedCooldownUntil = Date.now() + DENIED_COOLDOWN;
            return false;
        }
        return false;
    };

    pendingRequest = doRequest().finally(() => {
        pendingRequest = null;
    });

    return pendingRequest;
}

/**
 * 确保已获得 host 权限，如果没有则请求
 * 必须在用户手势（如 click 事件处理器）中调用
 * @returns 是否拥有权限
 */
export async function ensureHostPermission(): Promise<boolean> {
    if (hasPermissionCache === true) return true;
    if (pendingEnsure) return pendingEnsure;

    pendingEnsure = (async () => {
        const has = await hasHostPermission();
        if (has) return true;
        return requestHostPermission();
    })().finally(() => {
        pendingEnsure = null;
    });

    return pendingEnsure;
}
