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

/**
 * 检查是否已获得 host 权限（不会弹出权限请求）
 */
export async function hasHostPermission(): Promise<boolean> {
    try {
        if (typeof chrome !== 'undefined' && chrome.permissions) {
            return new Promise((resolve) => {
                chrome.permissions.contains({ origins: [ALL_URLS_ORIGIN] }, (result) => {
                    resolve(result);
                });
            });
        }
        if (typeof browser !== 'undefined' && browser?.permissions) {
            return await browser.permissions.contains({ origins: [ALL_URLS_ORIGIN] });
        }
    } catch {
        // 非扩展环境（开发模式）
    }
    return false;
}

/**
 * 请求 host 权限（必须在用户手势中调用）
 * @returns 是否成功获得权限
 */
export async function requestHostPermission(): Promise<boolean> {
    try {
        if (typeof chrome !== 'undefined' && chrome.permissions) {
            return new Promise((resolve) => {
                chrome.permissions.request({ origins: [ALL_URLS_ORIGIN] }, (granted) => {
                    resolve(granted);
                });
            });
        }
        if (typeof browser !== 'undefined' && browser?.permissions) {
            return await browser.permissions.request({ origins: [ALL_URLS_ORIGIN] });
        }
    } catch {
        return false;
    }
    return false;
}

/**
 * 确保已获得 host 权限，如果没有则请求
 * 必须在用户手势（如 click 事件处理器）中调用
 * @returns 是否拥有权限
 */
export async function ensureHostPermission(): Promise<boolean> {
    const has = await hasHostPermission();
    if (has) return true;
    return requestHostPermission();
}
