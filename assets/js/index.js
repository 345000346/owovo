// 站点主脚本入口：主题、移动导航、滚动 UI 三块按序启动。
//
// 打包：layouts/_partials/script.html 用 Hugo 内置 esbuild（js.Build）从这里
// 解析 import 图，输出单个 js/site.js（一个请求、源码分文件、作用域天然隔离），
// 不再依赖「三文件顶层标识符不得重名」这种手写约束。
// 启动顺序有意义：theme 先定 data-theme，navigation 依赖已计算出的样式。

import { initTheme } from "./theme.js";
import { initNavigation } from "./navigation.js";
import { initScrollUi } from "./scroll-ui.js";

initTheme();
initNavigation();
initScrollUi();
