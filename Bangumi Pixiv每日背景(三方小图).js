// ==UserScript==
// @name         Bangumi Pixiv每日背景 (v4.3 带注释版)
// @name:zh-CN   Bangumi Pixiv每日背景 (v4.3 带注释版)
// @namespace    http://tampermonkey.net/
// @version      4.3
// @description  【最终稳定版】通过 mokeyjay 提供的代理API获取Pixiv日榜第一的图片并解决图片403防盗链问题，实现稳定背景更换。
// @author       Gemini & Sai (基于 mokeyjay 的API)
// @match        *://bgm.tv/*
// @match        *://chii.in/*
// @connect      pixiv.mokeyjay.com
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

// 这是一个立即执行函数表达式 (IIFE)，是油猴脚本的标准写法。
// 它可以创建一个独立的作用域，避免脚本中的变量与网页自身的变量产生冲突。
(function() {
    'use strict'; // 启用JavaScript的“严格模式”，让代码更规范、更安全。

    // --- 用户自定义配置区域 ---
    // 你可以在这里轻松修改背景的透明度，数值越小，内容区域就越透明。
    // 数值范围: 0.0 (完全透明) 到 1.0 (完全不透明)。
    const MAIN_OPACITY = 0.35; // 主要内容区域的不透明度 (例如：个人主页的进度管理模块)。
    const ITEM_OPACITY = 0.2; // 列表项等次要区域的不透明度 (例如：首页的“在看”列表中的每一项)。
    // --- 自定义区域结束 ---

    // 定义要请求的代理API地址。
    const PROXY_API_URL = 'https://pixiv.mokeyjay.com/?r=api/pixiv-json';

    // 使用Tampermonkey提供的GM_xmlhttpRequest函数发起一个网络请求。
    // 这个函数可以跨域请求数据，是油猴脚本获取外部信息的关键。
    GM_xmlhttpRequest({
        method: 'GET', // 使用GET方法请求数据。
        url: PROXY_API_URL, // 请求的目标URL。
        responseType: 'json', // 告诉Tampermonkey期望返回的是JSON数据，它会自动帮忙解析。
        timeout: 20000, // 设置请求超时时间为20秒（20000毫秒），防止网络卡顿时无限等待。

        // onload回调函数：当服务器成功返回数据后，此函数内的代码会被执行。
        onload: function(response) {
            // 首先检查HTTP状态码。200表示请求成功。
            if (response.status !== 200) {
                console.error(`[BGM背景脚本] API请求失败，状态码: ${response.status}。`);
                return; // 如果失败，则打印错误信息并终止脚本。
            }

            // 获取已自动解析为JSON对象的响应数据。
            const apiResponse = response.response;

            // 从返回的数据中安全地获取日榜第一名的项目。
            // `?.` 是可选链操作符，可以避免因中间属性不存在（如`data`不存在）而导致整个脚本报错。
            // 这行代码的意思是：如果`apiResponse`存在，则访问它的`data`属性；如果`data`属性存在且是数组，则取第一个元素（索引为0）。
            const firstItem = apiResponse?.data?.[0];

            // 确认成功获取到了第一名的项目，并且该项目包含`url`属性。
            if (firstItem && firstItem.url) {
                // 将我们需要的图片URL赋值给一个新变量。
                const imageUrl = firstItem.url;
                // 在控制台打印获取到的URL，方便调试。
                console.log('[BGM背景脚本] 成功获取代理后的图片URL:', imageUrl);

                // 调用Tampermonkey的GM_addStyle函数，将一段CSS代码动态注入到当前页面。
                GM_addStyle(`
                    /* 设置body元素的背景图片 */
                    body {
                        background-image: url("${imageUrl}") !important; /* 使用模板字符串将获取到的图片URL嵌入CSS */
                        background-size: cover !important; /* 背景图等比缩放，铺满整个屏幕 */
                        background-position: center center !important; /* 背景图居中显示 */
                        background-attachment: fixed !important; /* 背景图固定，不随页面滚动 */
                        background-repeat: no-repeat !important; /* 背景图不重复 */
                    }

                    /* --- 半透明样式，让内容区域浮在背景之上，同时保持可读性 --- */
                    /* 选择所有主要的内容模块 */
                    #main.mainWrapper, #header, #prgManager, #columnHomeB > div, #home_tml, .sideInner, .featuredItems .appItem {
                        background-color: rgba(255, 255, 255, ${MAIN_OPACITY}) !important; /* 使用之前定义的变量设置半透明白色背景 */
                        border: none !important; /* 移除边框，使其更好地融入背景 */
                        box-shadow: none !important; /* 移除阴影 */
                        border-radius: 12px; /* 添加圆角，使其看起来更柔和 */
                    }

                    /* --- 其他细节优化 --- */
                    /* 将一些模块的内层背景也设为透明 */
                    #prgManagerHeader, #listWrapper, #prgManagerMain, #timeline, .columns .sidePanel, .sidePanelHome {
                        background: transparent !important;
                    }

                    /* 单独设置进度列表中每个条目的背景 */
                    #prgSubjectList li {
                        background-color: rgba(245, 245, 245, ${ITEM_OPACITY}) !important;
                        border-radius: 8px;
                        border: none !important;
                    }
                `);
            } else {
                // 如果API返回的数据结构不对或内容为空，则在控制台打印错误信息。
                console.error('[BGM背景脚本] API返回的数据格式不正确或为空，无法找到图片URL。', apiResponse);
            }
        },

        // onerror回调函数：当请求发生网络层面的错误时（例如，DNS解析失败、无法连接服务器）执行。
        onerror: function(error) {
            console.error('[BGM背景脚本] 请求代理API时发生网络错误:', error);
        },

        // ontimeout回调函数：当请求时间超过了上面设定的timeout值后执行。
        ontimeout: function() {
            console.error('[BGM背景脚本] 请求代理API超时。');
        }
    });
})(); // IIFE的结束括号，表示函数定义后立即执行。
