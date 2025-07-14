// ==UserScript==
// @name         GPT 大纲生成器
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  为 GPT 对话生成右侧大纲视图，提取问题前16个字作为标题
// @author       YungVenuz
// @license      AGPL-3.0-or-later
// @match        https://chatgpt.com/*
// @match        https://chat.deepseek.com/*
// @match        https://gemini.google.com/*
// @match        https://www.kimi.com/*
// @match        https://yuanbao.tencent.com/*
// @include      https://ying.baichuan-ai.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';


    function $(param) {
        // DOM Ready 逻辑
        if (typeof param === 'function') {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                param();
            } else {
                document.addEventListener('DOMContentLoaded', param);
            }
            return;
        }

        // 选择器逻辑
        if (typeof param === 'string') {
            const elements = document.querySelectorAll(param);
            return {
                elements,
                hide() {
                    this.elements.forEach(el => el.style.display = 'none');
                    return this;
                },
                click(fn) {
                    this.elements.forEach(el => el.addEventListener('click', fn));
                    return this;
                }
            };
        }
    }

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
            this.currentUrl = window.location.href;
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

            // 监听URL变化
            this.observeUrlChanges();
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

            // 获取所有用户消息 - 使用更新后的选择器
            const chatContainer = document.querySelector('.dad65929');
            if (!chatContainer) return;

            // 获取所有直接子div
            const allDivs = Array.from(chatContainer.children).filter(el => el.tagName === 'DIV');
            // 筛选出奇数位置的div（索引从0开始，所以是偶数索引）
            const userMessageContainers = allDivs.filter((_, index) => index % 2 === 0);

            // 从每个容器中提取第一个div作为用户消息
            const userMessages = userMessageContainers.map(container => {
                const firstDiv = container.querySelector('div');
                return firstDiv;
            }).filter(Boolean); // 过滤掉可能的null值

            if (userMessages.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'outline-empty';
                emptyDiv.textContent = '暂无对话内容';
                outlineItems.appendChild(emptyDiv);
                return;
            }

            userMessages.forEach((message, index) => {
                // 提取消息文本
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
     * 监听新消息 - 更新后的DeepSeek版本
     */
        observeNewMessages() {
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;

                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        shouldUpdate = true;
                    }
                });

                if (shouldUpdate) {
                    setTimeout(() => this.generateOutlineItems(), 50);
                }
            });

            // 监听整个聊天容器
            const chatContainer = document.querySelector('.dad65929');
            if (chatContainer) {
                observer.observe(chatContainer, { childList: true, subtree: true });
            }
        }

        /**
     * 监听URL变化
     */
        observeUrlChanges() {
            // 使用setInterval定期检查URL是否变化
            setInterval(() => {
                const currentUrl = window.location.href;
                if (this.currentUrl !== currentUrl) {
                    console.log('URL changed, reinitializing outline generator');
                    this.currentUrl = currentUrl;

                    // 清空现有大纲
                    const outlineItems = this.outlineContainer.querySelector('.outline-items');
                    while (outlineItems && outlineItems.firstChild) {
                        outlineItems.removeChild(outlineItems.firstChild);
                    }

                    // 等待新页面加载完成后重新生成大纲
                    setTimeout(() => this.generateOutlineItems(), 500);
                }
            }, 500); // 每秒检查一次
        }

        /**
     * 高亮当前可见的消息对应的大纲项 - 更新后的DeepSeek版本
     */
        highlightVisibleItem() {
            // 获取所有用户消息
            const chatContainer = document.querySelector('.dad65929');
            if (!chatContainer) return;

            const allDivs = Array.from(chatContainer.children).filter(el => el.tagName === 'DIV');
            const userMessageContainers = allDivs.filter((_, index) => index % 2 === 0);
            const userMessages = userMessageContainers.map(container => {
                return container.querySelector('div');
            }).filter(Boolean);

            if (!userMessages.length) return;

            // 找到当前视口中最靠近中心的消息
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
                const index = userMessages.indexOf(closestMessage);
                const outlineItem = this.outlineContainer.querySelector(`.outline-item[data-index="${index}"]`);
                if (outlineItem) {
                    this.highlightItem(outlineItem);
                }
            }
        }

        /**
     * 处理大纲项点击事件
     */
        handleItemClick(item, message) {
            // 高亮被点击的项
            this.highlightItem(item);

            // 滚动到对应的消息
            if (message) {
                message.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    /**
     * Gemini大纲生成器类 (已修复内容加载延迟的Bug)
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
            // 等待页面主要框架加载完成
            if (!document.querySelector('chat-window')) {
                setTimeout(() => this.init(), 100); // 增加初始检测延迟
                return;
            }

            this.addStyles();
            this.outlineContainer = this.createOutlineContainer();
            this.toggleButton = this.createToggleButton();

            // **【修复】** 不再立即生成大纲，而是等待内容加载
            this.waitForContentAndGenerate();

            // 监听新消息 (此逻辑依然有效)
            this.observeNewMessages();

            // 监听滚动以高亮当前可见的消息
            this.observeScroll();

            // 监听URL变化 (此逻辑依然有效，但其回调函数已被修改)
            this.observeUrlChanges();
        }

        /**
     * 【新增修复方法】轮询等待聊天内容加载完成后再生成大纲
     * @param {number} timeout - 最大等待时间 (毫秒)
     */
        waitForContentAndGenerate(timeout = 7000) {
            // 先清空旧内容，防止切换对话时看到上一个对话的大纲
            const outlineItems = this.outlineContainer.querySelector('.outline-items');
            if (outlineItems) {
                while (outlineItems.firstChild) {
                    outlineItems.removeChild(outlineItems.firstChild);
                }
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'outline-empty';
                emptyDiv.textContent = '正在加载大纲...'; // 提升用户体验
                outlineItems.appendChild(emptyDiv);
            }

            const startTime = Date.now();
            const interval = setInterval(() => {
                // 使用更精确的选择器检测内容是否已加载
                const userMessages = document.querySelectorAll('user-query .query-text');

                // 如果找到内容或者超时，则停止轮询
                if (userMessages.length > 0 || Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    this.generateOutlineItems(); // 无论结果如何，执行生成
                }
            }, 200); // 每200毫秒检查一次
        }


        /**
     * 生成大纲项 - 使用DOM API
     * (选择器根据新结构确认有效)
     */
        generateOutlineItems() {
            const outlineItems = this.outlineContainer.querySelector('.outline-items');
            // 清空现有内容 (包括 "正在加载..." 提示)
            while (outlineItems.firstChild) {
                outlineItems.removeChild(outlineItems.firstChild);
            }

            // 获取所有用户消息 - 使用Gemini特定的选择器
            const userMessages = document.querySelectorAll('user-query');

            if (userMessages.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'outline-empty';
                emptyDiv.textContent = '暂无对话内容';
                outlineItems.appendChild(emptyDiv);
                return;
            }

            userMessages.forEach((message, index) => {
                // 提取消息文本 - 适应Gemini的DOM结构
                const messageText = message.querySelector('.query-text')?.textContent || '';
                const title = this.extractQuestionTitle(messageText);

                // 如果标题为空则跳过 (可能是一些空的交互元素)
                if (!title || title === "空白问题") return;

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
     * (此部分逻辑保持不变，用于处理聊天中的新消息)
     */
        observeNewMessages() {
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                (node.tagName && node.tagName.toLowerCase() === 'user-query')) {
                                shouldUpdate = true;
                                break;
                            }
                        }
                    }
                });

                if (shouldUpdate) {
                    // 使用短延迟，因为这是在已有对话中添加新内容，通常很快
                    setTimeout(() => this.generateOutlineItems(), 100);
                }
            });

            // 监听聊天记录容器
            // 根据新结构，chat-history 是一个更精确的监听目标
            const observeTarget = document.querySelector('div.chat-history');
            if (observeTarget) {
                observer.observe(observeTarget, { childList: true, subtree: true });
            } else {
                // 备用方案
                const chatContainer = document.querySelector('chat-window-content');
                if(chatContainer){
                    observer.observe(chatContainer, { childList: true, subtree: true });
                }
            }
        }

        /**
     * 监听URL变化 - 用于检测对话切换
     * 【修复】将回调函数改为调用新的等待方法
     */
        observeUrlChanges() {
            let lastUrl = location.href;
            const self = this;

            // 核心逻辑：当检测到URL变化时，调用 waitForContentAndGenerate
            const onUrlChange = () => {
                if (location.href !== lastUrl) {
                    lastUrl = location.href;
                    console.log('GPT Outline Generator: URL changed, waiting for content...');
                    self.waitForContentAndGenerate();
                }
            };

            // 使用 MutationObserver 是一种可靠的兜底方案
            const urlObserver = new MutationObserver(onUrlChange);
            urlObserver.observe(document.body, { subtree: true, childList: true });

            // 并通过 history API 更精确地捕获
            const originalPushState = history.pushState;
            history.pushState = function () {
                originalPushState.apply(this, arguments);
                onUrlChange();
            };

            const originalReplaceState = history.replaceState;
            history.replaceState = function () {
                originalReplaceState.apply(this, arguments);
                onUrlChange();
            };

            window.addEventListener('popstate', onUrlChange);
        }
    }
    
    /**
     * 百川AI大纲生成器类 (已根据新版结构和SPA导航更新)
     */
    class BaichuanOutlineGenerator extends ChatGPTOutlineGenerator {
        constructor() {
            super();
            this.observer = null; // To hold the MutationObserver instance
        }

        /**
         * 处理路由变化，重新生成大纲和观察者
         */
        handleRouteChange() {
            // 延迟执行，以确保新页面的DOM内容已加载
            setTimeout(() => {
                this.generateOutlineItems();
                this.resetMessageObserver();
            }, 500);
        }

        /**
         * 监听SPA路由变化 (History API)
         */
        observeSPARoutes() {
            const self = this;
            let lastUrl = location.href;

            // 包装 history.pushState 和 history.replaceState
            const wrapHistoryMethod = (method) => {
                const original = history[method];
                history[method] = function(state) {
                    const result = original.apply(this, arguments);
                    const event = new Event(method.toLowerCase());
                    event.state = state;
                    window.dispatchEvent(event);
                    return result;
                };
            };

            wrapHistoryMethod('pushState');
            wrapHistoryMethod('replaceState');

            // 监听自定义的 pushstate, replacestate 和原生的 popstate 事件
            ['popstate', 'pushstate', 'replacestate'].forEach(eventName => {
                window.addEventListener(eventName, () => {
                    if (location.href !== lastUrl) {
                        lastUrl = location.href;
                        console.log(`URL changed to ${lastUrl}, refreshing outline.`);
                        self.handleRouteChange();
                    }
                });
            });
        }

        /**
         * 初始化大纲生成器 (已更新)
         */
        init() {
            // 等待页面加载完成 - 改为检测是否存在第一条消息
            if (!document.querySelector('[data-type="prompt-item"]')) {
                setTimeout(() => this.init(), 100);
                return;
            }

            // 检查UI元素是否已存在，防止重复创建
            if (!this.styleElement) this.addStyles();
            if (!this.outlineContainer || !document.body.contains(this.outlineContainer)) {
                this.outlineContainer = this.createOutlineContainer();
            }
            if (!this.toggleButton || !document.body.contains(this.toggleButton)) {
                this.toggleButton = this.createToggleButton();
            }

            // 确保大纲是可见的
            this.outlineContainer.style.display = 'block';
            this.toggleButton.style.display = 'none';

            // 初始化大纲
            this.generateOutlineItems();
            // 设置消息监听
            this.resetMessageObserver();
            // 监听滚动
            this.observeScroll();
            // 监听SPA导航
            this.observeSPARoutes();
        }

        /**
         * 生成大纲项 (选择器依然有效)
         */
        generateOutlineItems() {
            // This method from the previous turn is correct and doesn't need changes.
            // It correctly uses '[data-type="prompt-item"]' and '.prompt-text-item'
            const outlineItems = this.outlineContainer.querySelector('.outline-items');
            while (outlineItems.firstChild) {
                outlineItems.removeChild(outlineItems.firstChild);
            }
            const userMessages = document.querySelectorAll('[data-type="prompt-item"]');
            if (userMessages.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'outline-empty';
                emptyDiv.textContent = '暂无对话内容';
                outlineItems.appendChild(emptyDiv);
                return;
            }
            userMessages.forEach((message, index) => {
                const messageText = message.querySelector('.prompt-text-item')?.textContent || '';
                const title = this.extractQuestionTitle(messageText);
                const item = document.createElement('div');
                item.className = 'outline-item';
                item.dataset.index = index;
                item.addEventListener('click', () => this.handleItemClick(item, message));
                const iconSpan = document.createElement('span');
                iconSpan.className = 'outline-item-icon';
                iconSpan.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" fill="currentColor"></path></svg>`;
                const textSpan = document.createElement('span');
                textSpan.className = 'outline-item-text';
                textSpan.textContent = `${index + 1}. ${title}`;
                item.appendChild(iconSpan);
                item.appendChild(textSpan);
                outlineItems.appendChild(item);
            });
            this.highlightVisibleItem();
        }

        /**
         * 重置 MutationObserver 以监听新加载的聊天内容
         */
        resetMessageObserver() {
            // 如果存在旧的观察者，先断开连接
            if (this.observer) {
                this.observer.disconnect();
            }

            // 创建新的观察者实例
            this.observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE && (node.matches && node.matches('[data-type="prompt-item"]') || node.querySelector('[data-type="prompt-item"]'))) {
                                // 发现新消息，延迟更新大纲
                                setTimeout(() => this.generateOutlineItems(), 100);
                                return;
                            }
                        }
                    }
                }
            });

            // 动态查找聊天容器并进行监听，这比硬编码一个ID或class更稳定
            const firstMessage = document.querySelector('[data-type="prompt-item"]');
            if (firstMessage && firstMessage.parentElement) {
                const chatContainer = firstMessage.parentElement;
                this.observer.observe(chatContainer, {
                    childList: true,
                    subtree: true,
                });
            } else {
                console.warn("Outline script could not find chat container to observe.");
            }
        }

        /**
         * 高亮当前可见的消息对应的大纲项 - 百川AI版本
         */
        highlightVisibleItem() {
            const userMessages = document.querySelectorAll('[data-type="prompt-item"]');
            if (!userMessages.length) return;

            let closestMessage = null;
            let closestDistance = Infinity;
            const viewportHeight = window.innerHeight;
            const viewportMiddle = viewportHeight / 2;

            userMessages.forEach(message => {
                const rect = message.getBoundingClientRect();
                const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportMiddle);
                if (rect.top < viewportHeight && rect.bottom > 0 && distance < closestDistance) {
                    closestDistance = distance;
                    closestMessage = message;
                }
            });

            if (closestMessage) {
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
            this.currentUrl = window.location.href;
        }

        /**
         * 初始化大纲生成器
         */
        init() {
            // 等待页面加载完成 - .chat-content-list 依然是有效的容器
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

            // 监听URL变化
            this.observeUrlChanges();
        }

        /**
         * 生成大纲项 (已更新选择器)
         */
        generateOutlineItems() {
            const outlineItems = this.outlineContainer.querySelector('.outline-items');
            // 清空现有内容
            while (outlineItems.firstChild) {
                outlineItems.removeChild(outlineItems.firstChild);
            }

            // 获取所有用户消息 - 使用Kimi新的、更可靠的选择器
            const userMessages = document.querySelectorAll('.chat-content-item-user');

            if (userMessages.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'outline-empty';
                emptyDiv.textContent = '暂无对话内容';
                outlineItems.appendChild(emptyDiv);
                return;
            }

            userMessages.forEach((message, index) => {
                // 提取消息文本 - .user-content 依然有效
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
         * 监听新消息 - Kimi版本 (已更新)
         */
        observeNewMessages() {
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;

                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                // 监听更可靠的父节点类名
                                (node.classList.contains('chat-content-item-user') ||
                                 node.querySelector('.chat-content-item-user'))) {
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
        * 监听URL变化
        */
        observeUrlChanges() {
            // 使用setInterval定期检查URL是否变化
            setInterval(() => {
                const currentUrl = window.location.href;
                if (this.currentUrl !== currentUrl) {
                    console.log('URL changed, reinitializing outline generator');
                    this.currentUrl = currentUrl;

                    // 清空现有大纲
                    const outlineItems = this.outlineContainer.querySelector('.outline-items');
                    if (outlineItems) {
                        while (outlineItems.firstChild) {
                            outlineItems.removeChild(outlineItems.firstChild);
                        }
                    }

                    // 等待新页面加载完成后重新生成大纲
                    setTimeout(() => {
                        this.init(); // Re-run init to find new chat container
                    }, 500);
                }
            }, 500); // 每秒检查一次
        }


        /**
         * 高亮当前可见的消息对应的大纲项 - Kimi版本 (已更新)
         */
        highlightVisibleItem() {
            const userMessages = document.querySelectorAll('.chat-content-item-user');
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
     * 腾讯元宝大纲生成器类 (新增)
    */
    class YuanbaoOutlineGenerator extends ChatGPTOutlineGenerator {
        constructor() {
            super();
            this.currentUrl = window.location.href;
        }

        /**
         * 初始化大纲生成器
         */
        init() {
            // 等待页面加载完成
            if (!document.querySelector('.agent-chat__list')) {
                setTimeout(() => this.init(), 100);
                return;
            }

            this.addStyles();
            this.outlineContainer = this.createOutlineContainer();
            this.toggleButton = this.createToggleButton();

            // 初始化大纲
            setTimeout(() => this.generateOutlineItems(), 100);

            // 监听新消息
            this.observeNewMessages();

            // 监听滚动以高亮当前可见的消息
            this.observeScroll();

            // 监听URL变化，以防万一
            this.observeUrlChanges();
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

            // 获取所有用户消息 - 使用元宝特定的选择器
            const userMessages = document.querySelectorAll('.agent-chat__list__item--human');

            if (userMessages.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'outline-empty';
                emptyDiv.textContent = '暂无对话内容';
                outlineItems.appendChild(emptyDiv);
                return;
            }

            userMessages.forEach((message, index) => {
                // 提取消息文本
                const messageText = message.querySelector('.hyc-content-text')?.textContent || '';
                const title = this.extractQuestionTitle(messageText);

                const item = document.createElement('div');
                item.className = 'outline-item';
                item.dataset.index = index;
                item.dataset.messageId = `yuanbao-message-${index}`;

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
         * 监听新消息 - 元宝版本
         */
        observeNewMessages() {
            const observer = new MutationObserver((mutations) => {
                let shouldUpdate = false;
                mutations.forEach(mutation => {
                    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                        for (const node of mutation.addedNodes) {
                            if (node.nodeType === Node.ELEMENT_NODE &&
                                (node.classList?.contains('agent-chat__list__item--human') || node.querySelector('.agent-chat__list__item--human'))) {
                                shouldUpdate = true;
                                break;
                            }
                        }
                    }
                });

                if (shouldUpdate) {
                    setTimeout(() => this.generateOutlineItems(), 100);
                }
            });

            // 监听整个聊天容器
            const chatContainer = document.querySelector('.agent-chat__list__content');
            if (chatContainer) {
                observer.observe(chatContainer, { childList: true, subtree: true });
            }
        }

        /**
        * 监听URL变化
        */
        observeUrlChanges() {
            setInterval(() => {
                const currentUrl = window.location.href;
                if (this.currentUrl !== currentUrl) {
                    console.log('URL changed, reinitializing outline generator for Yuanbao');
                    this.currentUrl = currentUrl;
                    const outlineItems = this.outlineContainer.querySelector('.outline-items');
                    if (outlineItems) {
                        while (outlineItems.firstChild) {
                            outlineItems.removeChild(outlineItems.firstChild);
                        }
                    }
                    setTimeout(() => this.generateOutlineItems(), 500);
                }
            }, 500);
        }

        /**
         * 高亮当前可见的消息对应的大纲项 - 元宝版本
         */
        highlightVisibleItem() {
            const userMessages = document.querySelectorAll('.agent-chat__list__item--human');
            if (!userMessages.length) return;

            let closestMessage = null;
            let closestDistance = Infinity;
            const viewportHeight = window.innerHeight;
            const viewportMiddle = viewportHeight / 2;

            userMessages.forEach(message => {
                const rect = message.getBoundingClientRect();
                const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportMiddle);

                if (rect.top < viewportHeight && rect.bottom > 0 && distance < closestDistance) {
                    closestDistance = distance;
                    closestMessage = message;
                }
            });

            if (closestMessage) {
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
            'kimi.com': KimiOutlineGenerator,
            'yuanbao.tencent.com': YuanbaoOutlineGenerator // 新增元宝
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
