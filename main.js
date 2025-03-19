// ==UserScript==
// @name         GPT 大纲生成器
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  为 GPT 对话生成右侧大纲视图，提取问题前16个字作为标题
// @author       YungVenuz
// @license      AGPL-3.0-or-later
// @match        https://chatgpt.com/*
// @match        https://chat.deepseek.com/*
// @match        https://gemini.google.com/*
// @match        https://kimi.moonshot.cn/*
// @include      https://ying.baichuan-ai.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/cash-dom/dist/cash.min.js
// ==/UserScript==

(function () {
    'use strict';

    /**
     * ChatGPT大纲生成器类
     */
    class ChatGPTOutlineGenerator {
        constructor() {
            this.outlineContainer = null;
            this.toggleButton = null;
            this.styleElement = null;
            this.cssStyles = `
                .outline-container {
                    color: #000000;
                    position: fixed;
                    top: 70px;
                    right: 20px;
                    width: 280px;
                    max-height: calc(100vh - 100px);
                    background-color: rgba(247, 247, 248, 0.85);
                    border-radius: 12px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
                    z-index: 1000;
                    overflow-y: auto;
                    overflow-x: hidden; /* 防止水平滚动 */
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                    font-family: 'Söhne', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;
                    opacity: 0.95;
                    backdrop-filter: blur(5px);
                    -webkit-backdrop-filter: blur(5px);
                }

                .outline-container:hover {
                    opacity: 1;
                    background-color: rgba(247, 247, 248, 0.98);
                    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
                    transform: translateY(-2px);
                }

                .dark .outline-container {
                    background-color: rgba(52, 53, 65, 0.85);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
                }

                .dark .outline-container:hover {
                    background-color: rgba(52, 53, 65, 0.98);
                    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35);
                }

                .outline-header {
                    padding: 16px;
                    font-weight: 600;
                    font-size: 16px;
                    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    position: sticky;
                    top: 0;
                    background: inherit;
                    border-radius: 12px 12px 0 0;
                    z-index: 2;
                }

                .dark .outline-header {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    color: #ececf1;
                }

                .outline-title {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .outline-title-icon {
                    color: #10a37f;
                }

                .outline-items {
                    padding: 8px 0;
                }

                .outline-item {
                    padding: 10px 16px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-size: 14px;
                    border-left: 3px solid transparent;
                    display: flex;
                    align-items: center;
                    margin: 2px 0;
                    border-radius: 0 4px 4px 0;
                    box-sizing: border-box; /* 确保padding不会增加元素宽度 */
                    width: 100%; /* 确保宽度不超过父容器 */
                }

                .outline-item:hover {
                    background-color: rgba(0, 0, 0, 0.05);
                    transform: translateX(2px);
                }

                .dark .outline-item:hover {
                    background-color: rgba(255, 255, 255, 0.05);
                }

                .outline-item.active {
                    border-left-color: #10a37f;
                    background-color: rgba(16, 163, 127, 0.1);
                    font-weight: 500;
                }

                .outline-item-icon {
                    margin-right: 10px;
                    color: #10a37f;
                    transition: transform 0.2s ease;
                }

                .outline-item:hover .outline-item-icon {
                    transform: scale(1.1);
                }

                .outline-item-text {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    flex: 1;
                    line-height: 1.4;
                    max-width: calc(100% - 30px); /* 减去图标和边距的宽度 */
                }

                .dark .outline-item-text {
                    color: #ececf1;
                }

                .outline-toggle {
                    position: fixed;
                    top: 70px;
                    right: 20px;
                    width: 42px;
                    height: 42px;
                    border-radius: 50%;
                    background-color: rgba(16, 163, 127, 0.9);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 1001;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
                    transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
                }

                .outline-toggle:hover {
                    transform: scale(1.08);
                    background-color: #10a37f;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }

                .outline-toggle svg {
                    width: 20px;
                    height: 20px;
                    transition: transform 0.3s ease;
                }

                .outline-toggle:hover svg {
                    transform: rotate(90deg);
                }

                .outline-close {
                    cursor: pointer;
                    opacity: 0.7;
                    transition: all 0.2s ease;
                    padding: 4px;
                    border-radius: 4px;
                }

                .outline-close:hover {
                    opacity: 1;
                    background-color: rgba(0, 0, 0, 0.05);
                }

                .dark .outline-close:hover {
                    background-color: rgba(255, 255, 255, 0.1);
                }

                .outline-empty {
                    padding: 20px 16px;
                    text-align: center;
                    color: #888;
                    font-style: italic;
                    font-size: 14px;
                }

                .dark .outline-empty {
                    color: #aaa;
                }

                @media (max-width: 1400px) {
                    .outline-container {
                        width: 250px;
                    }
                }

                @media (max-width: 1200px) {
                    .outline-container {
                        width: 220px;
                    }
                }

                @media (max-width: 768px) {
                    .outline-container {
                        display: none;
                    }
                }`;
        }

        /**
          * 初始化大纲生成器
          */
        init() {
            // 等待页面加载完成
            if (!document.querySelector('main')) {
                setTimeout(() => this.init(), 50);
                return;
            }

            this.addStyles();
            this.outlineContainer = this.createOutlineContainer();
            this.toggleButton = this.createToggleButton();

            // 初始化大纲
            setTimeout(() => this.generateOutlineItems(), 50);

            // 设置初始暗黑模式状态
            this.outlineContainer.classList.toggle('dark', this.detectDarkMode());

            // 监听暗黑模式变化
            this.observeDarkModeChanges();

            // 监听新消息
            this.observeNewMessages();

            // 监听滚动以高亮当前可见的消息
            this.observeScroll();
        }


        /**
         * 添加样式到页面
         */
        addStyles() {
            this.styleElement = document.createElement('style');
            this.styleElement.textContent = this.cssStyles;
            document.head.appendChild(this.styleElement);
        }

        /**
         * 创建大纲容器 - 使用DOM API
         * @returns {HTMLElement} 大纲容器元素
         */
        createOutlineContainer() {
            const container = document.createElement('div');
            container.className = 'outline-container';

            // 创建头部
            const header = document.createElement('div');
            header.className = 'outline-header';

            // 创建标题
            const title = document.createElement('div');
            title.className = 'outline-title';

            // 创建标题图标
            const titleIcon = document.createElement('span');
            titleIcon.className = 'outline-title-icon';
            const titleSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            titleSvg.setAttribute('width', '16');
            titleSvg.setAttribute('height', '16');
            titleSvg.setAttribute('viewBox', '0 0 24 24');
            titleSvg.setAttribute('fill', 'none');
            const titlePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            titlePath.setAttribute('d', 'M4 6H20M4 12H20M4 18H14');
            titlePath.setAttribute('stroke', 'currentColor');
            titlePath.setAttribute('stroke-width', '2');
            titlePath.setAttribute('stroke-linecap', 'round');
            titlePath.setAttribute('stroke-linejoin', 'round');
            titleSvg.appendChild(titlePath);
            titleIcon.appendChild(titleSvg);

            // 创建标题文本
            const titleText = document.createElement('span');
            titleText.textContent = '对话大纲';

            // 组装标题
            title.appendChild(titleIcon);
            title.appendChild(titleText);

            // 创建关闭按钮
            const closeBtn = document.createElement('span');
            closeBtn.className = 'outline-close';
            const closeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            closeSvg.setAttribute('width', '16');
            closeSvg.setAttribute('height', '16');
            closeSvg.setAttribute('viewBox', '0 0 24 24');
            closeSvg.setAttribute('fill', 'none');
            const closePath1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            closePath1.setAttribute('d', 'M18 6L6 18');
            closePath1.setAttribute('stroke', 'currentColor');
            closePath1.setAttribute('stroke-width', '2');
            closePath1.setAttribute('stroke-linecap', 'round');
            closePath1.setAttribute('stroke-linejoin', 'round');
            const closePath2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            closePath2.setAttribute('d', 'M6 6L18 18');
            closePath2.setAttribute('stroke', 'currentColor');
            closePath2.setAttribute('stroke-width', '2');
            closePath2.setAttribute('stroke-linecap', 'round');
            closePath2.setAttribute('stroke-linejoin', 'round');
            closeSvg.appendChild(closePath1);
            closeSvg.appendChild(closePath2);
            closeBtn.appendChild(closeSvg);

            // 组装头部
            header.appendChild(title);
            header.appendChild(closeBtn);

            // 创建大纲项容器
            const outlineItems = document.createElement('div');
            outlineItems.className = 'outline-items';

            // 组装容器
            container.appendChild(header);
            container.appendChild(outlineItems);

            document.body.appendChild(container);

            // 添加关闭事件
            closeBtn.addEventListener('click', () => {
                container.style.display = 'none';
                this.toggleButton.style.display = 'flex';
            });

            return container;
        }

        /**
         * 创建切换按钮 - 使用DOM API
         * @returns {HTMLElement} 切换按钮元素
         */
        createToggleButton() {
            const button = document.createElement('div');
            button.className = 'outline-toggle';

            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.setAttribute('width', '24');
            svg.setAttribute('height', '24');
            svg.setAttribute('viewBox', '0 0 24 24');
            svg.setAttribute('fill', 'none');

            const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path1.setAttribute('d', 'M4 6H20');
            path1.setAttribute('stroke', 'currentColor');
            path1.setAttribute('stroke-width', '2');
            path1.setAttribute('stroke-linecap', 'round');

            const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path2.setAttribute('d', 'M4 12H20');
            path2.setAttribute('stroke', 'currentColor');
            path2.setAttribute('stroke-width', '2');
            path2.setAttribute('stroke-linecap', 'round');

            const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path3.setAttribute('d', 'M4 18H20');
            path3.setAttribute('stroke', 'currentColor');
            path3.setAttribute('stroke-width', '2');
            path3.setAttribute('stroke-linecap', 'round');

            svg.appendChild(path1);
            svg.appendChild(path2);
            svg.appendChild(path3);
            button.appendChild(svg);

            document.body.appendChild(button);

            // 添加点击事件
            button.addEventListener('click', () => {
                this.outlineContainer.style.display = 'block';
                button.style.display = 'none';

                // 重新生成大纲，确保最新状态
                this.generateOutlineItems();
            });

            return button;
        }

        /**
         * 提取问题文本的前20个字符
         * @param {string} text 问题文本
         * @returns {string} 提取后的标题
         */
        extractQuestionTitle(text) {
            // 去除空白字符
            const trimmed = text.trim();

            // 如果文本为空，返回默认文本
            if (!trimmed) return "空白问题";

            // 提取前20个字符，如果不足20个则全部返回
            return trimmed.length > 20 ? trimmed.substring(0, 20) + '...' : trimmed;
        }


        /**
          * 生成大纲项 - 使用DOM API
          */
        generateOutlineItems() {
            const outlineItems = this.outlineContainer.querySelector('.outline-items');
            // 清空现有内容
            while (outlineItems.firstChild) {
                outlineItems.removeChild(outlineItems.firstChild);
            }

            // 获取所有用户消息
            const userMessages = document.querySelectorAll('[data-message-author-role="user"]');

            if (userMessages.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'outline-empty';
                emptyDiv.textContent = '暂无对话内容';
                outlineItems.appendChild(emptyDiv);
                return;
            }

            userMessages.forEach((message, index) => {
                const messageText = message.querySelector('.whitespace-pre-wrap')?.textContent || '';
                const title = this.extractQuestionTitle(messageText);

                const item = document.createElement('div');
                item.className = 'outline-item';
                item.dataset.index = index;
                item.dataset.messageId = message.id || `message-${index}`;

                // 创建图标
                const iconSpan = document.createElement('span');
                iconSpan.className = 'outline-item-icon';

                const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                iconSvg.setAttribute('width', '16');
                iconSvg.setAttribute('height', '16');
                iconSvg.setAttribute('viewBox', '0 0 24 24');
                iconSvg.setAttribute('fill', 'none');

                const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                iconPath.setAttribute('d', 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z');
                iconPath.setAttribute('stroke', 'currentColor');
                iconPath.setAttribute('fill', 'currentColor');

                iconSvg.appendChild(iconPath);
                iconSpan.appendChild(iconSvg);

                // 创建文本
                const textSpan = document.createElement('span');
                textSpan.className = 'outline-item-text';
                textSpan.textContent = `${index + 1}. ${title}`;

                // 组装项目
                item.appendChild(iconSpan);
                item.appendChild(textSpan);

                // 添加点击事件
                item.addEventListener('click', () => this.handleItemClick(item, message));

                outlineItems.appendChild(item);
            });

            // 检查是否有可见的消息，并高亮对应的大纲项
            this.highlightVisibleItem();
        }

        /**
          * 处理大纲项点击事件
          * @param {HTMLElement} item 点击的大纲项
          * @param {HTMLElement} message 对应的消息元素
          */
        handleItemClick(item, message) {
            // 滚动到对应的消息
            message.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // 高亮当前项
            this.highlightItem(item);

            // 添加临时高亮效果
            message.style.transition = 'background-color 0.5s';
            message.style.backgroundColor = 'rgba(16, 163, 127, 0.1)';
            setTimeout(() => {
                message.style.backgroundColor = '';
            }, 1500);
        }

        /**
         * 高亮指定的大纲项
         * @param {HTMLElement} item 要高亮的大纲项
         */
        highlightItem(item) {
            document.querySelectorAll('.outline-item').forEach(el => {
                el.classList.remove('active');
            });
            item.classList.add('active');
        }

        /**
         * 监听页面滚动，高亮当前可见的消息对应的大纲项
         */
        observeScroll() {
            let scrollTimer = null;
            window.addEventListener('scroll', () => {
                // 使用防抖技术减少滚动事件处理频率
                if (scrollTimer) clearTimeout(scrollTimer);
                scrollTimer = setTimeout(() => {
                    this.highlightVisibleItem();
                }, 100);
            });
        }

        /**
         * 高亮当前可见的消息对应的大纲项
         */
        highlightVisibleItem() {
            const userMessages = document.querySelectorAll('[data-message-author-role="user"]');
            if (!userMessages.length) return;

            // 找到当前视口中最靠近顶部的消息
            let closestMessage = null;
            let closestDistance = Infinity;
            const viewportHeight = window.innerHeight;
            const viewportMiddle = viewportHeight / 2;

            userMessages.forEach(message => {
                const rect = message.getBoundingClientRect();
                // 计算消息中心点到视口中心的距离
                const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportMiddle);

                // 如果消息在视口内且距离更近
                if (rect.top < viewportHeight && rect.bottom > 0 && distance < closestDistance) {
                    closestDistance = distance;
                    closestMessage = message;
                }
            });

            if (closestMessage) {
                // 找到对应的大纲项并高亮
                const index = Array.from(userMessages).indexOf(closestMessage);
                const outlineItem = this.outlineContainer.querySelector(`.outline-item[data-index="${index}"]`);
                if (outlineItem) {
                    this.highlightItem(outlineItem);
                }
            }
        }

        /**
         * 检测暗黑模式
         * @returns {boolean} 是否为暗黑模式
         */
        detectDarkMode() {
            return document.documentElement.classList.contains('dark');
        }

        /**
         * 监听暗黑模式变化
         */
        observeDarkModeChanges() {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.attributeName === 'class') {
                        const isDarkMode = this.detectDarkMode();
                        this.outlineContainer.classList.toggle('dark', isDarkMode);
                    }
                });
            });

            observer.observe(document.documentElement, { attributes: true });
        }

        /**
         * 监听新消息
         */
        observeNewMessages() {
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;

                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                (node.querySelector('[data-message-author-role="user"]') ||
                                    node.hasAttribute && node.hasAttribute('data-message-author-role'))) {
                                shouldUpdate = true;
                                break;
                            }
                        }
                    }
                });

                if (shouldUpdate) {
                    setTimeout(() => this.generateOutlineItems(), 50); // 延迟执行，确保DOM已更新
                }
            });

            // 监听整个聊天容器
            const chatContainer = document.querySelector('main');
            if (chatContainer) {
                observer.observe(chatContainer, { childList: true, subtree: true });
            }
        }
    }

    /**
     * DeepSeek大纲生成器类
     */
    class DeepSeekOutlineGenerator extends ChatGPTOutlineGenerator {
        constructor() {
            super();
            // 继承ChatGPT大纲生成器的所有属性和方法
        }

        /**
         * 初始化大纲生成器
         */
        init() {
            // 等待页面加载完成
            if (!document.querySelector('.dad65929')) {
                setTimeout(() => this.init(), 50);
                return;
            }

            this.addStyles();
            this.outlineContainer = this.createOutlineContainer();
            this.toggleButton = this.createToggleButton();

            // 初始化大纲
            setTimeout(() => this.generateOutlineItems(), 50);

            // 监听新消息
            this.observeNewMessages();

            // 监听滚动以高亮当前可见的消息
            this.observeScroll();
        }

        /**
         * 生成大纲项
         */
        generateOutlineItems() {
            const outlineItems = this.outlineContainer.querySelector('.outline-items');
            // 清空现有内容
            while (outlineItems.firstChild) {
                outlineItems.removeChild(outlineItems.firstChild);
            }

            // 获取所有用户消息 - 使用DeepSeek特定的选择器
            const userMessages = document.querySelectorAll('[class*="fa81"]');

            if (userMessages.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'outline-empty';
                emptyDiv.textContent = '暂无对话内容';
                outlineItems.appendChild(emptyDiv);
                return;
            }

            userMessages.forEach((message, index) => {
                // 提取消息文本 - 适应DeepSeek的DOM结构
                const messageText = message.textContent || '';
                const title = this.extractQuestionTitle(messageText);

                const item = document.createElement('div');
                item.className = 'outline-item';
                item.dataset.index = index;
                item.dataset.messageId = `deepseek-message-${index}`;

                // 创建图标
                const iconSpan = document.createElement('span');
                iconSpan.className = 'outline-item-icon';

                const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                iconSvg.setAttribute('width', '16');
                iconSvg.setAttribute('height', '16');
                iconSvg.setAttribute('viewBox', '0 0 24 24');
                iconSvg.setAttribute('fill', 'none');

                const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                iconPath.setAttribute('d', 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z');
                iconPath.setAttribute('stroke', 'currentColor');
                iconPath.setAttribute('fill', 'currentColor');

                iconSvg.appendChild(iconPath);
                iconSpan.appendChild(iconSvg);

                // 创建文本
                const textSpan = document.createElement('span');
                textSpan.className = 'outline-item-text';
                textSpan.textContent = `${index + 1}. ${title}`;

                // 组装项目
                item.appendChild(iconSpan);
                item.appendChild(textSpan);

                // 添加点击事件
                item.addEventListener('click', () => this.handleItemClick(item, message));

                outlineItems.appendChild(item);
            });

            // 检查是否有可见的消息，并高亮对应的大纲项
            this.highlightVisibleItem();
        }


        /**
         * 监听新消息 - DeepSeek版本
         */
        observeNewMessages() {
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;

                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                (node.classList.contains('fa81') ||
                                    node.querySelector('[class*="fa81"]'))) {
                                shouldUpdate = true;
                                break;
                            }
                        }
                    }
                });

                if (shouldUpdate) {
                    setTimeout(() => this.generateOutlineItems(), 50);
                }
            });

            // 监听整个聊天容器
            const chatContainer = document.querySelector('.dad65929')?.parentElement;
            if (chatContainer) {
                observer.observe(chatContainer, { childList: true, subtree: true });
            }
        }

        /**
         * 高亮当前可见的消息对应的大纲项 - DeepSeek版本
         */
        highlightVisibleItem() {
            const userMessages = document.querySelectorAll('[class*="fa81"]');
            if (!userMessages.length) return;

            // 找到当前视口中最靠近顶部的消息
            let closestMessage = null;
            let closestDistance = Infinity;
            const viewportHeight = window.innerHeight;
            const viewportMiddle = viewportHeight / 2;

            userMessages.forEach(message => {
                const rect = message.getBoundingClientRect();
                // 计算消息中心点到视口中心的距离
                const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportMiddle);

                // 如果消息在视口内且距离更近
                if (rect.top < viewportHeight && rect.bottom > 0 && distance < closestDistance) {
                    closestDistance = distance;
                    closestMessage = message;
                }
            });

            if (closestMessage) {
                // 找到对应的大纲项并高亮
                const index = Array.from(userMessages).indexOf(closestMessage);
                const outlineItem = this.outlineContainer.querySelector(`.outline-item[data-index="${index}"]`);
                if (outlineItem) {
                    this.highlightItem(outlineItem);
                }
            }
        }
    }

    /**
     * Gemini大纲生成器类
     */
    class GeminiOutlineGenerator extends ChatGPTOutlineGenerator {
        constructor() {
            super();
            // 继承ChatGPT大纲生成器的所有属性和方法
        }
        /**
         * 初始化大纲生成器
         */
        init() {
            // 等待页面加载完成
            if (!document.querySelector('chat-window')) {
                setTimeout(() => this.init(), 50);
                return;
            }

            this.addStyles();
            this.outlineContainer = this.createOutlineContainer();
            this.toggleButton = this.createToggleButton();

            // 初始化大纲
            setTimeout(() => this.generateOutlineItems(), 50);

            // 监听新消息
            this.observeNewMessages();

            // 监听滚动以高亮当前可见的消息
            this.observeScroll();
        }


        /**
         * 生成大纲项 - 使用DOM API
         */
        generateOutlineItems() {
            const outlineItems = this.outlineContainer.querySelector('.outline-items');
            // 清空现有内容
            while (outlineItems.firstChild) {
                outlineItems.removeChild(outlineItems.firstChild);
            }

            // 获取所有用户消息 - 使用更新后的Gemini特定的选择器
            const userMessages = document.querySelectorAll('user-query .user-query-bubble-container');

            if (userMessages.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'outline-empty';
                emptyDiv.textContent = '暂无对话内容';
                outlineItems.appendChild(emptyDiv);
                return;
            }

            userMessages.forEach((message, index) => {
                // 提取消息文本 - 适应Gemini的新DOM结构
                const messageText = message.querySelector('.query-text')?.textContent || '';
                const title = this.extractQuestionTitle(messageText);

                const item = document.createElement('div');
                item.className = 'outline-item';
                item.dataset.index = index;
                item.dataset.messageId = `gemini-message-${index}`;

                // 创建图标
                const iconSpan = document.createElement('span');
                iconSpan.className = 'outline-item-icon';

                const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                iconSvg.setAttribute('width', '16');
                iconSvg.setAttribute('height', '16');
                iconSvg.setAttribute('viewBox', '0 0 24 24');
                iconSvg.setAttribute('fill', 'none');

                const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                iconPath.setAttribute('d', 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z');
                iconPath.setAttribute('stroke', 'currentColor');
                iconPath.setAttribute('fill', 'currentColor');

                iconSvg.appendChild(iconPath);
                iconSpan.appendChild(iconSvg);

                // 创建文本
                const textSpan = document.createElement('span');
                textSpan.className = 'outline-item-text';
                textSpan.textContent = `${index + 1}. ${title}`;

                // 组装项目
                item.appendChild(iconSpan);
                item.appendChild(textSpan);

                // 添加点击事件
                item.addEventListener('click', () => this.handleItemClick(item, message));

                outlineItems.appendChild(item);
            });

            // 检查是否有可见的消息，并高亮对应的大纲项
            this.highlightVisibleItem();
        }

        /**
         * 监听新消息 - Gemini版本
         */
        observeNewMessages() {
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;

                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                (node.querySelector('user-query') ||
                                    node.tagName && node.tagName.toLowerCase() === 'user-query')) {
                                shouldUpdate = true;
                                break;
                            }
                        }
                    }
                });

                if (shouldUpdate) {
                    setTimeout(() => this.generateOutlineItems(), 50);
                }
            });

            // 监听整个聊天容器
            const chatContainer = document.querySelector('chat-window-content');
            if (chatContainer) {
                observer.observe(chatContainer, { childList: true, subtree: true });
            }

            // 监听URL变化，因为切换对话可能会改变URL
            this.observeUrlChanges();
        }

        /**
         * 监听URL变化 - 用于检测对话切换
         */
        observeUrlChanges() {
            let lastUrl = location.href;

            // 创建一个新的MutationObserver来监视URL变化
            const urlObserver = new MutationObserver(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    // URL变化后，等待一段时间再更新大纲，确保新对话已加载
                    setTimeout(() => this.generateOutlineItems(), 50);
                }
            });

            // 监听整个文档的变化
            urlObserver.observe(document, { subtree: true, childList: true });

            // 使用history API监听导航事件
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            const self = this;

            history.pushState = function () {
                originalPushState.apply(this, arguments);
                setTimeout(() => self.generateOutlineItems(), 50);
            };

            history.replaceState = function () {
                originalReplaceState.apply(this, arguments);
                setTimeout(() => self.generateOutlineItems(), 50);
            };

            // 监听popstate事件（浏览器的前进/后退按钮）
            window.addEventListener('popstate', () => {
                setTimeout(() => this.generateOutlineItems(), 50);
            });
        }

    }

    /**
     * 百川AI大纲生成器类
     */
    class BaichuanOutlineGenerator extends ChatGPTOutlineGenerator {
        constructor() {
            super();
            // 继承ChatGPT大纲生成器的所有属性和方法
        }

        /**
         * 初始化大纲生成器
         */
        init() {
            // 等待页面加载完成
            if (!document.querySelector('#chat-list')) {
                setTimeout(() => this.init(), 50);
                return;
            }

            this.addStyles();
            this.outlineContainer = this.createOutlineContainer();
            this.toggleButton = this.createToggleButton();

            // 初始化大纲
            setTimeout(() => this.generateOutlineItems(), 50);

            // 监听新消息和对话切换
            this.observeNewMessages();

            // 监听滚动以高亮当前可见的消息
            this.observeScroll();

            // 添加手动刷新按钮
            this.addRefreshButton();
        }

        /**
         * 生成大纲项 - 使用DOM API
         */
        generateOutlineItems() {
            const outlineItems = this.outlineContainer.querySelector('.outline-items');
            // 清空现有内容
            while (outlineItems.firstChild) {
                outlineItems.removeChild(outlineItems.firstChild);
            }

            // 获取所有用户消息 - 使用百川AI特定的选择器
            const userMessages = document.querySelectorAll('#chat-list [data-type="prompt-item"]');

            if (userMessages.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'outline-empty';
                emptyDiv.textContent = '暂无对话内容';
                outlineItems.appendChild(emptyDiv);
                return;
            }

            userMessages.forEach((message, index) => {
                // 提取消息文本 - 适应百川AI的DOM结构
                const messageText = message.querySelector('.prompt-text-item')?.textContent || '';
                const title = this.extractQuestionTitle(messageText);

                const item = document.createElement('div');
                item.className = 'outline-item';
                item.dataset.index = index;
                item.dataset.messageId = `baichuan-message-${index}`;

                // 创建图标
                const iconSpan = document.createElement('span');
                iconSpan.className = 'outline-item-icon';

                const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                iconSvg.setAttribute('width', '16');
                iconSvg.setAttribute('height', '16');
                iconSvg.setAttribute('viewBox', '0 0 24 24');
                iconSvg.setAttribute('fill', 'none');

                const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                iconPath.setAttribute('d', 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z');
                iconPath.setAttribute('stroke', 'currentColor');
                iconPath.setAttribute('fill', 'currentColor');

                iconSvg.appendChild(iconPath);
                iconSpan.appendChild(iconSvg);

                // 创建文本
                const textSpan = document.createElement('span');
                textSpan.className = 'outline-item-text';
                textSpan.textContent = `${index + 1}. ${title}`;

                // 组装项目
                item.appendChild(iconSpan);
                item.appendChild(textSpan);

                // 添加点击事件
                item.addEventListener('click', () => this.handleItemClick(item, message));

                outlineItems.appendChild(item);
            });

            // 检查是否有可见的消息，并高亮对应的大纲项
            this.highlightVisibleItem();
        }

        /**
         * 监听新消息 - 百川AI版本
         */
        observeNewMessages() {
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;

                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                (node.hasAttribute && node.hasAttribute('data-type') &&
                                    node.getAttribute('data-type') === 'prompt-item')) {
                                shouldUpdate = true;
                                break;
                            }
                        }
                    }

                    // 检查属性变化，可能是对话切换导致的变化
                    if (mutation.type === 'attributes' &&
                        (mutation.attributeName === 'data-type' ||
                            mutation.attributeName === 'class')) {
                        shouldUpdate = true;
                    }
                });

                if (shouldUpdate) {
                    setTimeout(() => this.generateOutlineItems(), 50);
                }
            });

            // 监听整个聊天容器
            const chatContainer = document.querySelector('#chat-list');
            if (chatContainer) {
                observer.observe(chatContainer, {
                    childList: true,
                    subtree: true,
                    attributes: true,  // 添加属性监听
                    attributeFilter: ['data-type', 'class'] // 监听特定属性变化
                });
            }

            // 监听URL变化，因为切换对话可能会改变URL
            this.observeUrlChanges();

            // 监听点击事件，可能是通过点击切换对话
            this.observeClickEvents();
        }

        /**
         * 监听URL变化 - 用于检测对话切换
         */
        observeUrlChanges() {
            let lastUrl = location.href;

            // 创建一个新的MutationObserver来监视URL变化
            const urlObserver = new MutationObserver(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    // URL变化后，等待一段时间再更新大纲，确保新对话已加载
                    setTimeout(() => this.generateOutlineItems(), 50);
                }
            });

            // 监听整个文档的变化
            urlObserver.observe(document, { subtree: true, childList: true });

            // 使用history API监听导航事件
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            const self = this;

            history.pushState = function () {
                originalPushState.apply(this, arguments);
                setTimeout(() => self.generateOutlineItems(), 50);
            };

            history.replaceState = function () {
                originalReplaceState.apply(this, arguments);
                setTimeout(() => self.generateOutlineItems(), 50);
            };

            // 监听popstate事件（浏览器的前进/后退按钮）
            window.addEventListener('popstate', () => {
                setTimeout(() => this.generateOutlineItems(), 50);
            });
        }

        /**
         * 监听点击事件 - 用于检测对话切换
         */
        observeClickEvents() {
            // 监听可能导致对话切换的点击事件
            document.addEventListener('click', (event) => {
                // 检查是否点击了对话列表项
                const chatItem = event.target.closest('[role="button"]');
                if (chatItem) {
                    // 延迟更新大纲，确保对话已切换
                    setTimeout(() => this.generateOutlineItems(), 50);
                }
            });
        }

        /**
         * 高亮当前可见的消息对应的大纲项 - 百川AI版本
         */
        highlightVisibleItem() {
            const userMessages = document.querySelectorAll('#chat-list [data-type="prompt-item"]');
            if (!userMessages.length) return;

            // 找到当前视口中最靠近顶部的消息
            let closestMessage = null;
            let closestDistance = Infinity;
            const viewportHeight = window.innerHeight;
            const viewportMiddle = viewportHeight / 2;

            userMessages.forEach(message => {
                const rect = message.getBoundingClientRect();
                // 计算消息中心点到视口中心的距离
                const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportMiddle);

                // 如果消息在视口内且距离更近
                if (rect.top < viewportHeight && rect.bottom > 0 && distance < closestDistance) {
                    closestDistance = distance;
                    closestMessage = message;
                }
            });

            if (closestMessage) {
                // 找到对应的大纲项并高亮
                const index = Array.from(userMessages).indexOf(closestMessage);
                const outlineItem = this.outlineContainer.querySelector(`.outline-item[data-index="${index}"]`);
                if (outlineItem) {
                    this.highlightItem(outlineItem);
                }
            }
        }
    }

    /**
     * Kimi大纲生成器类
     */
    class KimiOutlineGenerator extends ChatGPTOutlineGenerator {
        constructor() {
            super();
            // 继承ChatGPT大纲生成器的所有属性和方法
        }

        /**
         * 初始化大纲生成器
         */
        init() {
            // 等待页面加载完成
            if (!document.querySelector('.chat-content-list')) {
                setTimeout(() => this.init(), 50);
                return;
            }

            this.addStyles();
            this.outlineContainer = this.createOutlineContainer();
            this.toggleButton = this.createToggleButton();

            // 初始化大纲
            setTimeout(() => this.generateOutlineItems(), 50);

            // 监听新消息
            this.observeNewMessages();

            // 监听滚动以高亮当前可见的消息
            this.observeScroll();
        }

        /**
         * 生成大纲项
         */
        generateOutlineItems() {
            const outlineItems = this.outlineContainer.querySelector('.outline-items');
            // 清空现有内容
            while (outlineItems.firstChild) {
                outlineItems.removeChild(outlineItems.firstChild);
            }

            // 获取所有用户消息 - 使用Kimi特定的选择器
            const userMessages = document.querySelectorAll('.segment-user');

            if (userMessages.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'outline-empty';
                emptyDiv.textContent = '暂无对话内容';
                outlineItems.appendChild(emptyDiv);
                return;
            }

            userMessages.forEach((message, index) => {
                // 提取消息文本 - 适应Kimi的DOM结构
                const messageText = message.querySelector('.user-content')?.textContent || '';
                const title = this.extractQuestionTitle(messageText);

                const item = document.createElement('div');
                item.className = 'outline-item';
                item.dataset.index = index;
                item.dataset.messageId = `kimi-message-${index}`;

                // 创建图标
                const iconSpan = document.createElement('span');
                iconSpan.className = 'outline-item-icon';

                const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                iconSvg.setAttribute('width', '16');
                iconSvg.setAttribute('height', '16');
                iconSvg.setAttribute('viewBox', '0 0 24 24');
                iconSvg.setAttribute('fill', 'none');

                const iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                iconPath.setAttribute('d', 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z');
                iconPath.setAttribute('stroke', 'currentColor');
                iconPath.setAttribute('fill', 'currentColor');

                iconSvg.appendChild(iconPath);
                iconSpan.appendChild(iconSvg);

                // 创建文本
                const textSpan = document.createElement('span');
                textSpan.className = 'outline-item-text';
                textSpan.textContent = `${index + 1}. ${title}`;

                // 组装项目
                item.appendChild(iconSpan);
                item.appendChild(textSpan);

                // 添加点击事件
                item.addEventListener('click', () => this.handleItemClick(item, message));

                outlineItems.appendChild(item);
            });

            // 检查是否有可见的消息，并高亮对应的大纲项
            this.highlightVisibleItem();
        }


        /**
         * 监听新消息 - Kimi版本
         */
        observeNewMessages() {
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;

                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                (node.classList.contains('chat-content-item') ||
                                    node.querySelector('.segment-user'))) {
                                shouldUpdate = true;
                                break;
                            }
                        }
                    }
                });

                if (shouldUpdate) {
                    setTimeout(() => this.generateOutlineItems(), 50);
                }
            });

            // 监听整个聊天容器
            const chatContainer = document.querySelector('.chat-content-list');
            if (chatContainer) {
                observer.observe(chatContainer, { childList: true, subtree: true });
            }

            // 监听URL变化，因为切换对话可能会改变URL
            this.observeUrlChanges();
        }

        /**
         * 监听URL变化 - 用于检测对话切换
         */
        observeUrlChanges() {
            let lastUrl = location.href;

            // 创建一个新的MutationObserver来监视URL变化
            const urlObserver = new MutationObserver(() => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    // URL变化后，等待一段时间再更新大纲，确保新对话已加载
                    setTimeout(() => this.generateOutlineItems(), 50);
                }
            });

            // 监听整个文档的变化
            urlObserver.observe(document, { subtree: true, childList: true });

            // 使用history API监听导航事件
            const originalPushState = history.pushState;
            const originalReplaceState = history.replaceState;
            const self = this;

            history.pushState = function () {
                originalPushState.apply(this, arguments);
                setTimeout(() => self.generateOutlineItems(), 50);
            };

            history.replaceState = function () {
                originalReplaceState.apply(this, arguments);
                setTimeout(() => self.generateOutlineItems(), 50);
            };

            // 监听popstate事件（浏览器的前进/后退按钮）
            window.addEventListener('popstate', () => {
                setTimeout(() => this.generateOutlineItems(), 50);
            });
        }

        /**
         * 高亮当前可见的消息对应的大纲项 - Kimi版本
         */
        highlightVisibleItem() {
            const userMessages = document.querySelectorAll('.segment-user');
            if (!userMessages.length) return;

            // 找到当前视口中最靠近顶部的消息
            let closestMessage = null;
            let closestDistance = Infinity;
            const viewportHeight = window.innerHeight;
            const viewportMiddle = viewportHeight / 2;

            userMessages.forEach(message => {
                const rect = message.getBoundingClientRect();
                // 计算消息中心点到视口中心的距离
                const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportMiddle);

                // 如果消息在视口内且距离更近
                if (rect.top < viewportHeight && rect.bottom > 0 && distance < closestDistance) {
                    closestDistance = distance;
                    closestMessage = message;
                }
            });

            if (closestMessage) {
                // 找到对应的大纲项并高亮
                const index = Array.from(userMessages).indexOf(closestMessage);
                const outlineItem = this.outlineContainer.querySelector(`.outline-item[data-index="${index}"]`);
                if (outlineItem) {
                    this.highlightItem(outlineItem);
                }
            }
        }
    }

    /**
     * 插件管理器类 - 用于管理多个插件
     */
    class PluginManager {
        constructor() {
            this.plugins = [];
        }

        /**
         * 注册插件
         * @param {Object} plugin 插件实例
         */
        register(plugin) {
            this.plugins.push(plugin);
            return this;
        }

        /**
         * 初始化所有插件
         */
        initAll() {
            this.plugins.forEach(plugin => {
                if (typeof plugin.init === 'function') {
                    setTimeout(() => plugin.init(), 100); // 延迟启动，确保页面已加载
                }
            });
        }
    }

    /**
     * 创建并启动插件管理器
     */
    $(function () {
        // 添加延迟，确保所有DOM元素都已经渲染完成
        // 创建插件管理器
        const pluginManager = new PluginManager();

        // 定义支持的网站及其对应的生成器类
        const generatorMap = {
            'chatgpt.com': ChatGPTOutlineGenerator,
            'chat.deepseek.com': DeepSeekOutlineGenerator,
            'gemini.google.com': GeminiOutlineGenerator,
            'ying.baichuan-ai.com': BaichuanOutlineGenerator,
            'kimi.moonshot.cn': KimiOutlineGenerator
        };

        // 获取当前网站域名
        const currentUrl = window.location.href;

        // 遍历支持的网站，找到匹配的生成器并注册
        for (const [domain, GeneratorClass] of Object.entries(generatorMap)) {
            if (currentUrl.includes(domain)) {
                // 注册对应的大纲生成器插件
                pluginManager.register(new GeneratorClass());
                break; // 找到匹配的生成器后退出循环
            }
        }

        // 初始化所有插件
        pluginManager.initAll();
    });

})();
