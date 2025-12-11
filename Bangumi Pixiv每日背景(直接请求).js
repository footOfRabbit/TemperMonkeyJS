// ==UserScript==
// @name         Bangumi Pixiv每日背景 (v1.5 API直连版)
// @name:zh-CN   Bangumi Pixiv每日背景 (v1.5 API直连版)
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  【核心重构】抛弃DOM解析，直接调用Pixiv API获取JSON数据，彻底解决CSR渲染无法获取图片的问题。
// @author       Gemini & Sai
// @match        *://bgm.tv/*
// @match        *://chii.in/*
// @connect      www.pixiv.net
// @connect      i.pximg.net
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- 用户自定义配置区域 ---
    const BACKGROUND_TINT_OPACITY = 0.5; // 0.0 ~ 1.0
    const MAIN_OPACITY = 0.75;
    const ITEM_OPACITY = 0.85;
    // --- 自定义区域结束 ---

    // 伪装头 (保持高仿真)
    const COMMON_HEADERS = {
        'sec-ch-ua': '"Google Chrome";v="143", "Chromium";v="143", "Not A(Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'upgrade-insecure-requests': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36',
        'accept-language': 'zh-CN,zh-TW;q=0.9,zh;q=0.8,en-US;q=0.7,en;q=0.6',
        'cache-control': 'no-cache',
        'pragma': 'no-cache'
    };

    /**
     * 步骤一：直接请求 Pixiv 排行榜 API (JSON格式)
     * 运维注：使用 format=json 参数直接获取结构化数据，绕过 React 渲染
     */
    console.log('[BGM背景脚本] 步骤1: 正在调用Pixiv API接口...');
    GM_xmlhttpRequest({
        method: 'GET',
        // 关键点：添加 &format=json，服务器会直接返回 JSON 数据而不是 HTML 页面
        url: 'https://www.pixiv.net/ranking.php?mode=daily&content=illust&format=json',
        headers: {
            ...COMMON_HEADERS,
            'accept': 'application/json, text/javascript, */*; q=0.01', // 声明我们需要 JSON
            'x-requested-with': 'XMLHttpRequest', // 模拟 AJAX 请求
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin'
        },
        onload: function(response) {
            if (response.status !== 200) {
                console.error(`[BGM背景脚本] API请求失败: ${response.status}`);
                return;
            }

            try {
                // 解析 JSON 数据
                const data = JSON.parse(response.responseText);

                // 提取排名第一的数据 (contents 数组的第一个元素)
                if (data && data.contents && data.contents.length > 0) {
                    const firstItem = data.contents[0];
                    const thumbnailUrl = firstItem.url; // 这里的 url 通常是缩略图

                    console.log(`[BGM背景脚本] API返回榜首ID: ${firstItem.illust_id}, 缩略图: ${thumbnailUrl}`);

                    // 转换为高清图 URL (逻辑不变)
                    // 示例输入: https://i.pximg.net/c/240x480/img-master/img/.../xxx_p0_master1200.jpg
                    // 目标输出: https://i.pximg.net/img-master/img/.../xxx_p0_master1200.jpg
                    const masterUrl = thumbnailUrl.replace(/\/c\/[a-zA-Z0-9_]+\/img-master\//, '/img-master/');

                    fetchAndApplyImage(masterUrl);
                } else {
                    console.error('[BGM背景脚本] API返回的 contents 为空。');
                }
            } catch (e) {
                console.error('[BGM背景脚本] JSON解析失败:', e);
                console.log('API响应内容:', response.responseText.substring(0, 500));
            }
        },
        onerror: function(err) {
            console.error('[BGM背景脚本] 网络请求错误:', err);
        }
    });

    /**
     * 步骤二：下载图片并应用 (保持不变)
     */
    function fetchAndApplyImage(imageUrl) {
        console.log(`[BGM背景脚本] 步骤2: 正在下载高清图... ${imageUrl}`);

        GM_xmlhttpRequest({
            method: 'GET',
            url: imageUrl,
            responseType: 'blob',
            headers: {
                ...COMMON_HEADERS,
                'referer': 'https://www.pixiv.net/',
                'priority': 'u=0, i',
                'accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'sec-fetch-dest': 'image',
                'sec-fetch-mode': 'no-cors',
                'sec-fetch-site': 'cross-site'
            },
            onload: function(response) {
                if (response.status !== 200) {
                    console.error(`[BGM背景脚本] 图片下载失败 ${response.status}`);
                    return;
                }
                const objectURL = URL.createObjectURL(response.response);
                console.log('[BGM背景脚本] 步骤3: 图片应用成功。');

                GM_addStyle(`
                    body {
                        background-image: linear-gradient(rgba(255, 255, 255, ${BACKGROUND_TINT_OPACITY}), rgba(255, 255, 255, ${BACKGROUND_TINT_OPACITY})), url("${objectURL}") !important;
                        background-size: cover !important;
                        background-position: center center !important;
                        background-attachment: fixed !important;
                        background-repeat: no-repeat !important;
                    }
                    #main.mainWrapper, #header, #prgManager, #columnHomeB > div, #home_tml, .sideInner, .featuredItems .appItem {
                        background-color: rgba(255, 255, 255, ${MAIN_OPACITY}) !important;
                        border: none !important; box-shadow: none !important; border-radius: 12px;
                    }
                    #prgManagerHeader, #listWrapper, #prgManagerMain, #timeline, .columns .sidePanel, .sidePanelHome {
                        background: transparent !important;
                    }
                    #prgSubjectList li {
                        background-color: rgba(245, 245, 245, ${ITEM_OPACITY}) !important;
                        border-radius: 8px; border: none !important;
                    }
                `);
            }
        });
    }
})();
