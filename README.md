# Monster Tab

基于 [Eclipse Tab](https://github.com/ENCRE0520/EclipseTab) 修改的浏览器新标签页扩展

> Eclipse Tab 原作者 [@ENCRE0520](https://github.com/ENCRE0520)，一个很棒的新标签页项目。本项目在其基础上做了以下修改

## 新增功能

- **快捷键角标系统** — 按 `g` 在网站上显示按键角标，数字字母键直接打开，空格聚焦搜索框，Tab 切换空间
- **网站框开关** — 右键菜单或设置里显示隐藏网站框，带收展动画
- **切换空间速度** — 快中慢三档可调，动画节奏随档位缩放
- **搜索供应商管理** — 设置里按需启用搜索引擎，Tab 循环只走启用项
- **单文件备份** — 配置备份为单个 JSON 文件，图标、贴纸、壁纸全部内嵌
- **新标签页键盘直达** — 打开新标签页键盘焦点直接进入页面，快捷键立即可用
- **Tab 键切换搜索引擎** — 搜索框聚焦时按 Tab 快速切换搜索引擎，带弹窗预览和自动关闭
- **贴纸旋转手柄** — 图片和文字贴纸均可通过底部圆形手柄自由旋转角度
- **贴纸缩放手柄** — 文字贴纸也支持右下角拖拽缩放，旋转后拖拽方向跟随贴纸本地坐标

## 安装

从 [Releases](https://github.com/zyoung11/MonsterTab/releases) 下载：

| 文件 | 浏览器 |
|------|--------|
| `extension.zip` | Chrome / Edge / Helium |
| `extension.xpi` | Firefox / Zen Browser |

下载后解压（或直接保留 `.xpi`），在浏览器扩展管理页开启开发者模式，加载已解压的扩展即可

> Firefox 需要打开 `about:config`，将 `xpinstall.signatures.required` 设为 `false`，否则无法加载未签名的 `.xpi` 文件

### Zen Browser

按 Firefox 方式安装后，打开 `about:config`，将 `zen.urlbar.replace-newtab` 设为 `false`

> [!WARNING]
>
> 本项目修改了数据存储键、导出格式、WebDAV 同步目录，因此与原 Eclipse Tab 之间的备份、导出、同步**互不兼容**
