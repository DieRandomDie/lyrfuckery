// ==UserScript==
// @name         Lyrania Mod Suite
// @namespace    https://lyrania.co.uk/
// @namespace    https://dev.lyrania.co.uk/
// @version      2.6.0
// @description  A configurable collection of chat, timer, statistics, and interface improvements for Lyrania.
// @author       Eric Salazar
// @match        https://lyrania.co.uk/game.php*
// @match        https://dev.lyrania.co.uk/game.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lyrania.co.uk
// @homepageURL  https://github.com/DieRandomDie/lyrfuckery
// @supportURL   https://github.com/DieRandomDie/lyrfuckery/issues
// @updateURL    https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-mod-suite.user.js
// @downloadURL  https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-mod-suite.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
    'use strict';

    // ========================================================================
    // MOD TOGGLES
    // Change a setting to false to disable that mod, or true to enable it.
    // ========================================================================
    const MODS = Object.freeze({
        // Adds the channel-selection sidebar and All-view visibility controls.
        chatChannelSidebar: true,

        // Opens profile, whisper, mail, and transfer actions from player names.
        chatQuickMenu: true,

        // Shows the scheduled Triple DP hour using Lyrania's London time.
        tripleDpHour: true,

        // Calculates today's average kills per elapsed server hour.
        killsPerHour: true,

        // Hides Double, Triple, and Quad DP timers while they are inactive.
        hideInactiveDpTimers: true,

        // Replaces Buffer XP percentage with projected level information.
        bufferXp: true,

        // Tracks loot totals locally and displays chat beside the Loot Log.
        persistentLootLog: true,

        // Prevents normal auto-battles and boss battles from running together.
        preventOverlappingBattles: true,

        // Summarizes dungeon rooms and hides non-chest map icons.
        dungeonMapSummary: true
    });

    const SCRIPT_ID = 'lyrania-chat-enhancements';
    const SCRIPT_NAME = 'Lyrania Mod Suite';
    const SCRIPT_VERSION = '2.6.0';
    const SCRIPT_DOWNLOAD_URL = 'https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-mod-suite.user.js';
    const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
    const UPDATE_CHECK_STORAGE_KEY = 'lyrania-mod-suite:update-check';
    const UPDATE_DISMISSED_STORAGE_KEY = 'lyrania-mod-suite:update-dismissed';
    const CHANNEL_CLASS_NAMES = {
        '0': 'mainchatcolor',
        l: 'gameschatcolor',
        g: 'guildchatcolor',
        o: 'officerchatcolor',
        t: 'tradechatcolor',
        au: 'auctionchatcolor',
        p: 'pubchatcolor',
        a: 'areachatcolor',
        w: 'whisperchatcolor'
    };
    const NATIVE_CHAT_CONTROLS = Object.freeze({
        '0': { buttonId: 'mainchatbutton', command: 'killchat' },
        l: { buttonId: 'Litechatbutton', command: 'gamesroom' },
        g: { buttonId: 'guildchatbutton', command: 'guildchat' },
        t: { buttonId: 'tradechatbutton', command: 'trade' },
        au: { buttonId: 'auctionchatbutton', command: 'auction' },
        p: { buttonId: 'pubchatbutton', command: 'pub' },
        a: { buttonId: 'areachatbutton', command: 'area' },
        global: { buttonId: 'globalschatbutton', command: 'killglobals' }
    });

    let selectedChannel = 'all';
    let showGlobalChat = true;
    const enabledAllChannels = new Set();
    let quickMenu = null;

    function addStyles() {
        const style = document.createElement('style');
        style.id = `${SCRIPT_ID}-styles`;
        style.textContent = `
            #chat_row.${SCRIPT_ID}-layout {
                display: flex !important;
                align-items: stretch;
                gap: 8px;
                overflow: visible;
            }

            #${SCRIPT_ID}-channels {
                box-sizing: border-box;
                flex: 0 0 auto;
                align-self: stretch;
                width: max-content;
                min-width: 145px;
                margin-top: 10px;
                padding: 8px;
                border: 1px solid rgba(255, 255, 255, 0.65);
                border-radius: 10px;
                background: rgba(0, 0, 0, 0.78);
                overflow-x: hidden;
                overflow-y: auto;
                scrollbar-gutter: stable;
            }

            #${SCRIPT_ID}-channels .lyrania-chat-filter {
                display: block;
                width: 100%;
                margin: 0 0 4px;
                padding: 4px 6px;
                border: 0;
                border-radius: 4px;
                color: #fff;
                background: transparent;
                font: inherit;
                text-align: left;
                white-space: nowrap;
                cursor: pointer;
            }

            #${SCRIPT_ID}-channels .lyrania-channel-row {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 34px;
                gap: 3px;
                align-items: center;
                margin-bottom: 4px;
            }

            #${SCRIPT_ID}-channels .lyrania-channel-row.lyrania-no-toggle {
                grid-template-columns: minmax(0, 1fr);
            }

            #${SCRIPT_ID}-channels .lyrania-channel-row .lyrania-chat-filter {
                margin: 0;
            }

            #${SCRIPT_ID}-channels .lyrania-channel-toggle {
                box-sizing: border-box;
                min-width: 34px;
                padding: 4px 2px;
                border: 1px solid rgba(255, 255, 255, 0.35);
                border-radius: 4px;
                color: #aaa;
                background: #111;
                font: inherit;
                font-size: 10px;
                line-height: 1;
                cursor: pointer;
            }

            #${SCRIPT_ID}-channels .lyrania-channel-toggle.is-enabled {
                color: #fff;
                background: #286b35;
            }

            #${SCRIPT_ID}-channels .lyrania-chat-filter:hover,
            #${SCRIPT_ID}-channels .lyrania-chat-filter:focus-visible {
                background: #222;
                outline: 1px solid rgba(255, 255, 255, 0.35);
            }

            #${SCRIPT_ID}-channels .lyrania-chat-filter.is-selected {
                background: #555;
            }

            #${SCRIPT_ID}-channels .lyrania-special-row {
                margin-top: 7px;
                border-top: 1px solid rgba(255, 255, 255, 0.25);
                padding-top: 8px;
            }

            #chat > .chatToggleButton {
                display: none !important;
            }

            #chat_row.${SCRIPT_ID}-layout > #chat {
                box-sizing: border-box;
                flex: 1 1 auto;
                min-width: 0;
                width: auto !important;
            }

            #${SCRIPT_ID}-quick-menu {
                position: fixed;
                z-index: 2147483647;
                min-width: 135px;
                padding: 5px;
                border: 1px solid rgba(255, 255, 255, 0.8);
                border-radius: 6px;
                color: #fff;
                background: #050505;
                box-shadow: 0 4px 14px rgba(0, 0, 0, 0.55);
            }

            #${SCRIPT_ID}-quick-menu button {
                display: block;
                width: 100%;
                padding: 5px 7px;
                border: 0;
                border-radius: 3px;
                color: #fff;
                background: transparent;
                font: inherit;
                text-align: left;
                white-space: nowrap;
                cursor: pointer;
            }

            #${SCRIPT_ID}-quick-menu button:hover,
            #${SCRIPT_ID}-quick-menu button:focus-visible {
                background: #333;
                outline: none;
            }

            @media (max-width: 760px) {
                #${SCRIPT_ID}-channels {
                    padding: 6px;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function normalizeChannelLabel(label) {
        const corrections = {
            GamesRoom: 'Games Room',
            gboss: 'Guild Boss',
            NewPlayers: 'New Players',
            Icedraffle: 'Iced Raffle',
            CatsCafe: 'Cats Cafe'
        };
        return corrections[label.trim()] || label.trim();
    }

    function setSelectedButton(sidebar) {
        sidebar.querySelectorAll('.lyrania-channel-select[data-channel]').forEach((button) => {
            const selected = button.dataset.channel === selectedChannel;
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
    }

    function isNativeChatEnabled(channel) {
        const control = NATIVE_CHAT_CONTROLS[channel];
        const button = control && document.getElementById(control.buttonId);
        if (!button) return true;

        const color = getComputedStyle(button).backgroundColor.replace(/\s+/g, '').toLowerCase();
        return color !== 'rgb(0,0,0)'
            && color !== 'rgba(0,0,0,0)'
            && color !== 'transparent';
    }

    function ensureNativeChatEnabled(channel) {
        const control = NATIVE_CHAT_CONTROLS[channel];
        if (!control || isNativeChatEnabled(channel)) return;
        callGameFunction('commands', control.command);
    }

    function updateChannelToggle(button, enabled) {
        button.classList.toggle('is-enabled', enabled);
        button.setAttribute('aria-pressed', String(enabled));
        button.textContent = enabled ? 'On' : 'Off';
        button.title = enabled ? 'Shown in All' : 'Hidden from All';
    }

    function isGlobalOrBossAnnouncement(line) {
        if (line.querySelector(`
            .globalchatcolor,
            [class*="boss" i],
            [class*="motd" i],
            [class*="bonus" i]
        `)) {
            return true;
        }

        const text = line.textContent.replace(/\s+/g, ' ').trim();
        if (/\bmessage\s+of\s+the\s+day\s*:/i.test(text)
            || /(?:^|\s)g?motd\s*:/i.test(text)
            || /\bauto\s+reconciliation\b/i.test(text)
            || /\brecovered\s+[\d,]+\s+auto\s+battles?\s+while\s+(?:your\s+game\s+tab\s+was\s+inactive|you\s+were\s+offline)\b/i.test(text)
            || /\bbonus\s+(?:effect|event|modifier|active|activated)\b/i.test(text)) {
            return true;
        }

        // Bonus system notices do not have a player-name element. This catches
        // alternate bonus wording without hiding normal player conversations.
        if (!line.querySelector('.chatname') && /\bbonus(?:es)?\b/i.test(text)) {
            return true;
        }

        return Array.from(line.querySelectorAll('a[href]')).some((link) => {
            const href = (link.getAttribute('href') || '').replace(/\s+/g, '').toLowerCase();
            return href.includes('performnav(9)')
                || href.includes('contract()')
                || href.includes('boss');
        });
    }

    function lineMatchesSelectedChannel(line, channelSelect) {
        if (selectedChannel === 'all') {
            if (isGlobalOrBossAnnouncement(line)) return showGlobalChat;
            if (line.querySelector('.whisperchatcolor')) return true;

            for (const [channel, className] of Object.entries(CHANNEL_CLASS_NAMES)) {
                if (channel !== 'w' && line.querySelector(`.${className}`)) {
                    return enabledAllChannels.has(channel);
                }
            }

            for (const option of Array.from(channelSelect.options)) {
                if (line.textContent.includes(`[ ${option.text.trim()} ]`)) {
                    return enabledAllChannels.has(option.value);
                }
            }
            return true;
        }

        // Whispers remain visible in every filtered view so replies are not missed.
        if (line.querySelector('.whisperchatcolor')) {
            return true;
        }

        if (selectedChannel === 'global') return isGlobalOrBossAnnouncement(line);

        const className = CHANNEL_CLASS_NAMES[selectedChannel];
        if (className) {
            return Boolean(line.querySelector(`.${className}`));
        }

        const option = Array.from(channelSelect.options).find(
            (item) => item.value === selectedChannel
        );
        return Boolean(option && line.textContent.includes(`[ ${option.text.trim()} ]`));
    }

    function filterChat() {
        const channelSelect = document.getElementById('chatchannel');
        if (!channelSelect) return;

        document.querySelectorAll('#chatwindow .chatline').forEach((line) => {
            line.style.display = lineMatchesSelectedChannel(line, channelSelect) ? '' : 'none';
        });
    }

    function createChannelSidebar(chatRow, channelSelect) {
        const sidebar = document.createElement('aside');
        sidebar.id = `${SCRIPT_ID}-channels`;
        sidebar.setAttribute('aria-label', 'Chat channels');

        const channels = Array.from(channelSelect.options, (option) => ({
                value: option.value,
                label: normalizeChannelLabel(option.text)
            }));

        const allButton = document.createElement('button');
        allButton.type = 'button';
        allButton.className = 'lyrania-chat-filter lyrania-channel-select';
        allButton.dataset.channel = 'all';
        allButton.textContent = 'All';
        allButton.addEventListener('click', () => {
            selectedChannel = 'all';
            channelSelect.value = '0';
            setSelectedButton(sidebar);
            filterChat();
        });
        sidebar.appendChild(allButton);

        function addChannelRow(value, label, enabled, extraClass = '', toggleable = true) {
            if (enabled) enabledAllChannels.add(value);

            const row = document.createElement('div');
            row.className = `lyrania-channel-row ${extraClass}`.trim();

            const selectButton = document.createElement('button');
            selectButton.type = 'button';
            selectButton.className = 'lyrania-chat-filter lyrania-channel-select';
            selectButton.dataset.channel = value;
            selectButton.textContent = label;
            selectButton.addEventListener('click', () => {
                ensureNativeChatEnabled(value);
                selectedChannel = value;
                channelSelect.value = value === 'global' ? '0' : value;
                setSelectedButton(sidebar);
                filterChat();
            });

            row.appendChild(selectButton);
            if (!toggleable) {
                row.classList.add('lyrania-no-toggle');
                sidebar.appendChild(row);
                return;
            }

            const toggleButton = document.createElement('button');
            toggleButton.type = 'button';
            toggleButton.className = 'lyrania-channel-toggle';
            updateChannelToggle(toggleButton, enabled);
            toggleButton.addEventListener('click', () => {
                const nextEnabled = !enabledAllChannels.has(value);
                if (nextEnabled) {
                    enabledAllChannels.add(value);
                    ensureNativeChatEnabled(value);
                } else {
                    enabledAllChannels.delete(value);
                }
                if (value === 'global') showGlobalChat = nextEnabled;
                updateChannelToggle(toggleButton, nextEnabled);
                filterChat();
            });

            row.appendChild(toggleButton);
            sidebar.appendChild(row);
        }

        const numberedChannels = channels.filter(({ value }) => /^\d+$/.test(value.trim()));
        const standardChannels = channels.filter(({ value }) => !/^\d+$/.test(value.trim()));

        standardChannels.forEach(({ value, label }) => {
            const enabled = NATIVE_CHAT_CONTROLS[value]
                ? isNativeChatEnabled(value)
                : true;
            addChannelRow(value, label, enabled);
        });

        numberedChannels.forEach(({ value, label }) => {
            addChannelRow(value, label, true);
        });

        addChannelRow('w', 'Whispers', true, 'lyrania-special-row', false);
        ensureNativeChatEnabled('global');
        showGlobalChat = true;
        addChannelRow('global', 'Global Chat', true);

        chatRow.classList.add(`${SCRIPT_ID}-layout`);
        chatRow.insertBefore(sidebar, chatRow.firstChild);
        channelSelect.hidden = true;
        document.querySelectorAll('#chat > .chatToggleButton').forEach((button) => {
            button.hidden = true;
        });

        const chat = document.getElementById('chat');
        if (chat) {
            const constrainSidebarHeight = () => {
                const availableHeight = Math.max(100, Math.floor(chat.getBoundingClientRect().height - 10));
                sidebar.style.height = `${availableHeight}px`;
                sidebar.style.maxHeight = `${availableHeight}px`;
            };
            constrainSidebarHeight();
            new ResizeObserver(constrainSidebarHeight).observe(chat);
            window.addEventListener('resize', constrainSidebarHeight);
        }
        setSelectedButton(sidebar);
    }

    function setChatCommand(command, playerName) {
        const input = document.getElementById('inputchat');
        if (!input) return;
        input.value = `/${command} ${playerName} `;
        input.style.color = '#DD77DD';
        input.focus();
    }

    function callGameFunction(functionName, ...args) {
        const gameFunction = window[functionName];
        if (typeof gameFunction === 'function') {
            gameFunction(...args);
        } else {
            console.warn(`[${SCRIPT_ID}] The game function "${functionName}" is unavailable.`);
        }
    }

    function closeQuickMenu() {
        quickMenu?.remove();
        quickMenu = null;
    }

    function addQuickMenuAction(menu, label, action) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            closeQuickMenu();
            action();
        });
        menu.appendChild(button);
    }

    function openQuickMenu(chatName) {
        closeQuickMenu();

        const playerName = chatName.textContent.trim();
        if (!playerName) return;

        const menu = document.createElement('div');
        menu.id = `${SCRIPT_ID}-quick-menu`;
        menu.setAttribute('role', 'menu');

        addQuickMenuAction(menu, 'View Profile', () => callGameFunction('profile', playerName));
        addQuickMenuAction(menu, 'Whisper', () => setChatCommand('w', playerName));
        addQuickMenuAction(menu, 'Send Mail', () => callGameFunction('post', 0, playerName, ''));
        addQuickMenuAction(menu, 'Wire Platinum', () => setChatCommand('wire', playerName));
        addQuickMenuAction(menu, 'Wire Jade', () => setChatCommand('wirejade', playerName));
        addQuickMenuAction(menu, 'Wire Item', () => setChatCommand('wireitem', playerName));

        document.body.appendChild(menu);
        quickMenu = menu;

        const nameRect = chatName.getBoundingClientRect();
        const menuRect = menu.getBoundingClientRect();
        const left = Math.min(nameRect.right + 5, window.innerWidth - menuRect.width - 6);
        const top = Math.min(nameRect.top, window.innerHeight - menuRect.height - 6);
        menu.style.left = `${Math.max(6, left)}px`;
        menu.style.top = `${Math.max(6, top)}px`;
        menu.querySelector('button')?.focus();
    }

    function installQuickMenu() {
        document.addEventListener('click', (event) => {
            const chatName = event.target.closest?.('#chatwindow .chatname');
            if (chatName) {
                event.preventDefault();
                event.stopPropagation();
                openQuickMenu(chatName);
                return;
            }

            if (!event.target.closest?.(`#${SCRIPT_ID}-quick-menu`)) {
                closeQuickMenu();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') closeQuickMenu();
        });

        window.addEventListener('resize', closeQuickMenu);
        window.addEventListener('scroll', closeQuickMenu, true);
    }

    function initializeChatMods() {
        const wantsSidebar = MODS.chatChannelSidebar;
        const wantsQuickMenu = MODS.chatQuickMenu;
        if (!wantsSidebar && !wantsQuickMenu) return true;

        const chatRow = document.getElementById('chat_row');
        const chatWindow = document.getElementById('chatwindow');
        const channelSelect = document.getElementById('chatchannel');
        if (!chatRow || !chatWindow || !channelSelect) return false;

        if (!document.getElementById(`${SCRIPT_ID}-styles`)) addStyles();

        if (wantsSidebar && !document.getElementById(`${SCRIPT_ID}-channels`)) {
            createChannelSidebar(chatRow, channelSelect);

            const observer = new MutationObserver(filterChat);
            observer.observe(chatWindow, { childList: true });
            filterChat();
        }

        if (wantsQuickMenu && !document.documentElement.dataset.lyraniaQuickMenu) {
            document.documentElement.dataset.lyraniaQuickMenu = 'installed';
            installQuickMenu();
        }
        return true;
    }

    function getLondonTime() {
        const parts = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Europe/London',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hourCycle: 'h23'
        }).formatToParts(new Date());
        const value = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
        return {
            day: value('day'),
            hour: value('hour'),
            minute: value('minute'),
            second: value('second')
        };
    }

    function getTripleDpHour() {
        const london = getLondonTime();
        const currentHour = london.hour + london.minute / 60 + london.second / 3600;
        const scheduledHours = { 0: 4, 1: 20, 2: 16, 3: 12, 4: 8 };
        const scheduledHour = scheduledHours[london.day % 5];

        if (currentHour >= scheduledHour && currentHour < scheduledHour + 1) {
            return 'Now';
        }

        const displayHour = currentHour >= scheduledHour + 1
            ? (scheduledHour + 20) % 24
            : scheduledHour;
        return `${String(displayHour).padStart(2, '0')}:00:00`;
    }

    function initializeTripleDpHour() {
        if (!MODS.tripleDpHour) return true;
        if (document.getElementById(`${SCRIPT_ID}-triple-hour`)) return true;

        const serverTimeRow = document.getElementById('serverTime')?.parentElement;
        if (!serverTimeRow) return false;

        const row = document.createElement('div');
        row.id = `${SCRIPT_ID}-triple-hour`;
        row.innerHTML = 'Triple DP Hour: <span>--:--:--</span>';
        serverTimeRow.insertAdjacentElement('afterend', row);

        const output = row.querySelector('span');
        const update = () => { output.textContent = getTripleDpHour(); };
        update();
        window.setInterval(update, 1000);
        return true;
    }

    function parseFormattedNumber(value) {
        const number = Number(String(value ?? '').replace(/[^\d.-]/g, ''));
        return Number.isFinite(number) ? number : 0;
    }

    function initializeKillsPerHour() {
        if (!MODS.killsPerHour) return true;
        if (document.getElementById(`${SCRIPT_ID}-kph`)) return true;

        const sideCounter = document.getElementById('sidecounter');
        if (!sideCounter) return false;

        const row = document.createElement('div');
        row.innerHTML = `Kills Per Hour: <span id="${SCRIPT_ID}-kph">0.0</span>`;
        sideCounter.appendChild(row);

        const update = () => {
            const kills = parseFormattedNumber(document.getElementById('killscount')?.textContent);
            const timeParts = (document.getElementById('serverTime')?.textContent || '')
                .split(':')
                .map(Number);
            if (timeParts.length !== 3 || timeParts.some((part) => !Number.isFinite(part))) return;

            const elapsedHours = timeParts[0] + timeParts[1] / 60 + timeParts[2] / 3600;
            const output = document.getElementById(`${SCRIPT_ID}-kph`);
            if (output) output.textContent = elapsedHours > 0 ? (kills / elapsedHours).toFixed(1) : '0.0';
        };
        update();
        window.setInterval(update, 1000);
        return true;
    }

    function initializeInactiveDpTimerHider() {
        if (!MODS.hideInactiveDpTimers) return true;
        const bonusDisplay = document.getElementById('bonusdisplays');
        if (!bonusDisplay) return false;
        if (bonusDisplay.dataset.lyraniaInactiveDpHider) return true;
        bonusDisplay.dataset.lyraniaInactiveDpHider = 'installed';

        const timers = [
            ['doubledp', 'ddpword'],
            ['tripledp', 'tdpword'],
            ['quaddp', 'qdpword']
        ];
        const update = () => {
            timers.forEach(([timerId, rowId]) => {
                const timer = document.getElementById(timerId);
                const row = document.getElementById(rowId);
                if (timer && row) row.hidden = timer.textContent.trim().toLowerCase() === 'inactive';
            });
        };

        new MutationObserver(update).observe(bonusDisplay, {
            childList: true,
            characterData: true,
            subtree: true
        });
        update();
        return true;
    }

    function projectedBufferLevel(level, bufferXp) {
        if (level < 1) return 1;
        const discriminant = ((2 * level) - 1) ** 2 + (8 * bufferXp) / 25;
        return Math.max(1, (1 + Math.sqrt(Math.max(0, discriminant))) / 2);
    }

    function parseCompactExperience(numberText, suffix = '') {
        const multipliers = {
            '': 1,
            k: 1_000,
            m: 1_000_000,
            b: 1_000_000_000,
            t: 1_000_000_000_000
        };
        const number = Number(String(numberText).replace(/,/g, ''));
        const multiplier = multipliers[String(suffix).trim().toLowerCase()];
        return Number.isFinite(number) && multiplier
            ? Math.round(number * multiplier)
            : 0;
    }

    function findLatestActionXp() {
        const rows = Array.from(document.querySelectorAll('#content .lrow, #main .lrow'));
        for (const row of rows) {
            const match = row.textContent.match(
                /(?:Exp|Experience)\s*:\s*([\d,.]+)\s*([KMBT]?)\b/i
            );
            if (match) return parseCompactExperience(match[1], match[2]);
        }
        return 0;
    }

    function renderBufferXp(updateArguments) {
        const level = parseFormattedNumber(updateArguments[11]);
        const bufferXp = parseFormattedNumber(updateArguments[12]);
        const output = document.getElementById('expli');
        if (!level || !output) return;

        const projectedLevel = projectedBufferLevel(level, bufferXp);
        const endingLevel = Math.floor(projectedLevel + Number.EPSILON);
        const actionXp = findLatestActionXp();
        const nextLevel = level + 1;
        const nextLevelXpCost = 25 * nextLevel;
        const bufferAfterAction = bufferXp + actionXp - nextLevelXpCost;
        const levelsPerAction = actionXp > 0
            ? projectedBufferLevel(nextLevel, bufferAfterAction) - projectedLevel - 1
            : 0;
        const requiredXp = 25 * level;
        const roundedChange = Math.abs(levelsPerAction) < 0.005 ? 0 : levelsPerAction;
        const changePrefix = roundedChange > 0 ? '+' : '';
        const actionText = actionXp > 0
            ? ` (${changePrefix}${roundedChange.toFixed(2)} per action)`
            : '';

        output.innerHTML = '';
        const value = document.createElement('span');
        value.dataset.tippyContent = `${bufferXp.toLocaleString()}/${requiredXp.toLocaleString()} XP`;
        value.textContent = `${endingLevel.toLocaleString()}${actionText}`;
        output.appendChild(value);
    }

    function initializeBufferXp() {
        if (!MODS.bufferXp) return true;
        if (window.updategems?.lyraniaBufferXpWrapper) return true;
        if (typeof window.updategems !== 'function' || !document.getElementById('expli')) return false;

        const originalUpdateGems = window.updategems;
        const wrappedUpdateGems = async function (...args) {
            const result = await originalUpdateGems.apply(this, args);
            renderBufferXp(args);
            return result;
        };
        wrappedUpdateGems.lyraniaBufferXpWrapper = true;
        window.updategems = wrappedUpdateGems;

        const label = document.getElementById('expli')?.previousElementSibling;
        if (label) label.textContent = 'Buffer Level:';
        return true;
    }

    const LOOT_TYPES = Object.freeze({
        jade: 'Jade',
        fragments: 'Fragments',
        gold: 'Currency',
        tokens: 'Tokens',
        diamonds: 'Diamonds',
        sapphires: 'Sapphires',
        rubies: 'Rubies',
        emeralds: 'Emeralds',
        opals: 'Opals',
        health: 'Health',
        attack: 'Attack',
        defence: 'Defence',
        accuracy: 'Accuracy',
        evasion: 'Evasion'
    });

    function emptyLootTotals() {
        return Object.fromEntries(Object.keys(LOOT_TYPES).map((key) => [key, {
            total: 0,
            base: 0,
            bonus: 0,
            drops: 0
        }]));
    }

    function getLootStorageKey() {
        const account = window.userId || window.username || 'unknown-account';
        return `lyrania-mod-suite:loot-statistics:${account}`;
    }

    function newLootState() {
        return { version: 1, totalDrops: 0, loot: emptyLootTotals() };
    }

    function loadLootState() {
        const cleanState = newLootState();
        try {
            const saved = JSON.parse(localStorage.getItem(getLootStorageKey()));
            if (!saved || typeof saved !== 'object') return cleanState;

            cleanState.totalDrops = Math.max(0, Number(saved.totalDrops) || 0);
            Object.keys(cleanState.loot).forEach((key) => {
                const values = saved.loot?.[key];
                if (!values) return;
                ['total', 'base', 'bonus', 'drops'].forEach((field) => {
                    cleanState.loot[key][field] = Math.max(0, Number(values[field]) || 0);
                });
            });
        } catch (error) {
            console.warn(`[${SCRIPT_ID}] Saved loot statistics could not be loaded.`, error);
        }
        return cleanState;
    }

    function saveLootState(state) {
        try {
            localStorage.setItem(getLootStorageKey(), JSON.stringify(state));
        } catch (error) {
            console.warn(`[${SCRIPT_ID}] Loot statistics could not be saved.`, error);
        }
    }

    function addLoot(state, type, base, bonus = 0) {
        const entry = state.loot[type];
        if (!entry) return false;

        const safeBase = Math.max(0, Number(base) || 0);
        const safeBonus = Math.max(0, Number(bonus) || 0);
        entry.base += safeBase;
        entry.bonus += safeBonus;
        entry.total += safeBase + safeBonus;
        entry.drops += 1;
        state.totalDrops += 1;
        return true;
    }

    function parseCurrency(text) {
        const multipliers = { p: 1_000_000, g: 10_000, s: 100, c: 1 };
        let total = 0;
        const pattern = /([\d,]+(?:\.\d+)?)\s*([pgsc])\b/gi;
        let match;
        while ((match = pattern.exec(text)) !== null) {
            total += parseFormattedNumber(match[1]) * multipliers[match[2].toLowerCase()];
        }
        return total;
    }

    function detectLootType(text) {
        const lower = text.toLowerCase();
        if (lower.includes('jade')) return 'jade';
        if (lower.includes('fragment')) return 'fragments';
        if (lower.includes('diamond')) return 'diamonds';
        if (lower.includes('sapphire')) return 'sapphires';
        if (lower.includes('ruby') || lower.includes('rubies')) return 'rubies';
        if (lower.includes('emerald')) return 'emeralds';
        if (lower.includes('opal')) return 'opals';
        return null;
    }

    function plainTextFromHtml(html) {
        const container = document.createElement('div');
        container.innerHTML = String(html ?? '');
        return container.textContent.replace(/\s+/g, ' ').trim();
    }

    function parseLootLine(rawLine, state) {
        const text = plainTextFromHtml(rawLine);
        if (!text || /^welcome to lyrania!?$/i.test(text)) return false;

        const statMatch = text.match(/\bgained\s+([\d,]+)\s+(Health|Attack|Defence|Accuracy|Evasion)\b/i);
        if (statMatch) {
            const amount = parseFormattedNumber(statMatch[1]);
            const type = statMatch[2].toLowerCase();
            return addLoot(state, type, Math.min(1, amount), Math.max(0, amount - 1));
        }

        if (/\btoken(?:s| source)?\b/i.test(text)) {
            const tokenPatterns = [
                /\(([\d,]+)\s+token source\b/i,
                /\bfound\s+(?:an?\s+)?([\d,]+)\s+tokens?\b/i,
                /\b([\d,]+)\s+tokens?\b/i
            ];
            for (const pattern of tokenPatterns) {
                const match = text.match(pattern);
                if (match) return addLoot(state, 'tokens', parseFormattedNumber(match[1]));
            }
        }

        const containsCurrency = /\b(?:platinum|gold|silver|copper)\b/i.test(text);
        if (containsCurrency) {
            const details = text.match(/\(([^)]*)\)/)?.[1] || text;
            const [basePart, ...bonusParts] = details.split('+');
            const base = parseCurrency(basePart);
            const bonus = parseCurrency(bonusParts.join(' '));
            if (base || bonus) return addLoot(state, 'gold', base, bonus);
        }

        const lootType = detectLootType(text);
        const amountMatch = text.match(/\(\s*([\d,]+)\s*\+\s*([\d,]+)\s+(?:level\s+)?bonus\s*\)/i);
        if (lootType && amountMatch) {
            return addLoot(
                state,
                lootType,
                parseFormattedNumber(amountMatch[1]),
                parseFormattedNumber(amountMatch[2])
            );
        }

        return false;
    }

    function formatCurrency(value) {
        let remaining = Math.floor(Number(value) || 0);
        const platinum = Math.floor(remaining / 1_000_000);
        remaining %= 1_000_000;
        const gold = Math.floor(remaining / 10_000);
        remaining %= 10_000;
        const silver = Math.floor(remaining / 100);
        const copper = remaining % 100;
        return `${platinum.toLocaleString()}p ${gold}g ${silver}s ${copper}c`;
    }

    function renderLootStatistics(state) {
        const summary = document.getElementById(`${SCRIPT_ID}-loot-summary`);
        if (!summary) return;

        const rows = Object.entries(LOOT_TYPES).map(([key, label]) => {
            const entry = state.loot[key];
            const formatter = key === 'gold' ? formatCurrency : (value) => value.toLocaleString();
            return `
                <tr>
                    <th scope="row">${label}</th>
                    <td>${formatter(entry.total)}</td>
                    <td>${formatter(entry.base)}</td>
                    <td>${formatter(entry.bonus)}</td>
                    <td>${entry.drops.toLocaleString()}</td>
                </tr>`;
        }).join('');

        summary.innerHTML = `
            <div class="lyrania-loot-heading">
                <strong>Loot Statistics</strong>
                <button type="button" id="${SCRIPT_ID}-loot-reset">Reset</button>
            </div>
            <div class="lyrania-loot-total">Total tracked drops: ${state.totalDrops.toLocaleString()}</div>
            <table>
                <thead><tr><th>Type</th><th>Total</th><th>Base</th><th>Bonus</th><th>Drops</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>`;

        document.getElementById(`${SCRIPT_ID}-loot-reset`)?.addEventListener('click', () => {
            if (!window.confirm('Reset all saved loot statistics for this account?')) return;
            const resetState = newLootState();
            Object.assign(state, resetState);
            saveLootState(state);
            renderLootStatistics(state);
        });
    }

    function addLootLogStyles() {
        if (document.getElementById(`${SCRIPT_ID}-loot-styles`)) return;
        const style = document.createElement('style');
        style.id = `${SCRIPT_ID}-loot-styles`;
        style.textContent = `
            #chattabs.${SCRIPT_ID}-chat-loot-split > #chatpanes {
                display: grid;
                grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
                gap: 8px;
                align-items: stretch;
                height: 100%;
            }
            #${SCRIPT_ID}-chat-column {
                display: grid;
                grid-template-rows: auto minmax(0, 1fr);
                min-width: 0;
                height: 100%;
            }
            #${SCRIPT_ID}-chat-composer {
                display: flex;
                align-items: stretch;
                gap: 4px;
                min-width: 0;
                padding-right: 8px;
                border-right: 1px solid rgba(255, 255, 255, 0.4);
            }
            #${SCRIPT_ID}-chat-composer > #inputchat {
                box-sizing: border-box;
                flex: 1 1 auto;
                min-width: 0;
                width: auto !important;
            }
            #${SCRIPT_ID}-chat-composer > #chatbutton {
                box-sizing: border-box;
                flex: 0 0 auto;
            }
            #chattabs.${SCRIPT_ID}-chat-loot-split > nav {
                display: none !important;
            }
            #chattabs.${SCRIPT_ID}-chat-loot-split #chatwindow {
                display: block !important;
                width: auto !important;
                min-width: 0;
                height: 100% !important;
                padding-right: 8px;
                border-right: 1px solid rgba(255, 255, 255, 0.4);
            }
            #chattabs.${SCRIPT_ID}-chat-loot-split #lootlog.${SCRIPT_ID}-loot-layout {
                display: grid !important;
                grid-template-columns: 1fr;
                grid-template-rows: auto minmax(70px, 1fr);
                gap: 8px;
                width: auto !important;
                min-width: 0;
                height: 100% !important;
                align-self: stretch;
                overflow: hidden;
            }
            #${SCRIPT_ID}-loot-summary,
            #${SCRIPT_ID}-loot-messages {
                box-sizing: border-box;
                min-width: 0;
                height: 100%;
                overflow: auto;
            }
            #${SCRIPT_ID}-loot-summary {
                height: auto;
                overflow: visible;
                padding-bottom: 6px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.4);
            }
            #${SCRIPT_ID}-loot-summary .lyrania-loot-heading {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 8px;
                margin-bottom: 4px;
            }
            #${SCRIPT_ID}-loot-summary button {
                padding: 2px 8px;
                border: 1px solid rgba(255, 255, 255, 0.5);
                border-radius: 4px;
                color: #fff;
                background: #222;
                cursor: pointer;
            }
            #${SCRIPT_ID}-loot-summary button:hover { background: #444; }
            #${SCRIPT_ID}-loot-summary .lyrania-loot-total { margin-bottom: 6px; }
            #${SCRIPT_ID}-loot-summary table {
                width: 100%;
                border-collapse: collapse;
                font-size: 11px;
            }
            #${SCRIPT_ID}-loot-summary th,
            #${SCRIPT_ID}-loot-summary td {
                padding: 2px 4px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                text-align: right;
                white-space: nowrap;
            }
            #${SCRIPT_ID}-loot-summary th:first-child { text-align: left; }
        `;
        document.head.appendChild(style);
    }

    function initializePersistentLootLog() {
        if (!MODS.persistentLootLog) return true;
        const lootLog = document.getElementById('lootlog');
        const chatTabs = document.getElementById('chattabs');
        const chatPanes = document.getElementById('chatpanes');
        const chatWindow = document.getElementById('chatwindow');
        const chatInput = document.getElementById('inputchat');
        const chatButton = document.getElementById('chatbutton');
        if (!lootLog || !chatTabs || !chatPanes || !chatWindow || !chatInput || !chatButton
            || typeof window.lootlog !== 'function') return false;
        if (window.lootlog.lyraniaPersistentLootWrapper) return true;

        addLootLogStyles();
        lootLog.classList.add(`${SCRIPT_ID}-loot-layout`);
        chatTabs.classList.add(`${SCRIPT_ID}-chat-loot-split`);

        const chatColumn = document.createElement('section');
        chatColumn.id = `${SCRIPT_ID}-chat-column`;
        const composer = document.createElement('div');
        composer.id = `${SCRIPT_ID}-chat-composer`;
        chatPanes.insertBefore(chatColumn, chatWindow);
        composer.append(chatInput, chatButton);
        chatColumn.append(composer, chatWindow);

        const summary = document.createElement('section');
        summary.id = `${SCRIPT_ID}-loot-summary`;
        const messages = document.createElement('section');
        messages.id = `${SCRIPT_ID}-loot-messages`;

        Array.from(lootLog.children).forEach((child) => messages.appendChild(child));
        lootLog.append(summary, messages);

        const state = loadLootState();
        renderLootStatistics(state);

        const originalLootLog = window.lootlog;
        const wrappedLootLog = function (line) {
            const result = originalLootLog.apply(this, arguments);
            Array.from(lootLog.children)
                .filter((child) => child.classList.contains('lootlogitem'))
                .forEach((child) => messages.prepend(child));

            if (parseLootLine(line, state)) {
                saveLootState(state);
                renderLootStatistics(state);
            }
            return result;
        };
        wrappedLootLog.lyraniaPersistentLootWrapper = true;
        window.lootlog = wrappedLootLog;
        return true;
    }

    function initializeCombatOverlapGuard() {
        if (!MODS.preventOverlappingBattles) return true;
        if (window.__lyraniaCombatOverlapGuard) return true;

        const requiredFunctions = [
            'scheduleServerAction',
            'clearServerAction',
            'auto',
            'improvedauto',
            'boss',
            'gboss'
        ];
        if (!window.jQuery || requiredFunctions.some((name) => typeof window[name] !== 'function')) {
            return false;
        }

        window.__lyraniaCombatOverlapGuard = true;
        const scheduledNormalActions = new Set();
        const scheduledBossActions = new Set();
        const activeNormalRequests = new Set();
        const activeBossRequests = new Set();
        let combatMode = null;
        let pendingNormalStart = false;
        let pendingBossStart = false;

        try {
            const currentNavigation = document.getElementById('mainnav')?.value;
            if (currentNavigation === '9' || document.getElementById('attackboss')) {
                combatMode = 'boss';
            } else if ((typeof autoing !== 'undefined' && autoing)
                || (typeof funcheck !== 'undefined' && funcheck)) {
                combatMode = 'normal';
            }
        } catch (_error) {
            combatMode = null;
        }

        function classifyRequest(url) {
            const cleanUrl = String(url || '').split('?')[0].toLowerCase();
            if (/(?:^|\/)(?:bosses|gboss|loot_aboss)\.php$/.test(cleanUrl)) return 'boss';
            if (/(?:^|\/)(?:auto|improvedauto|battle|improvedbattle|dungeonbattle|improveddungeonbattle)\.php$/.test(cleanUrl)) {
                return 'normal';
            }
            return null;
        }

        window.jQuery(document).on(
            'ajaxSend.lyraniaCombatGuard',
            (_event, request, settings) => {
                const type = classifyRequest(settings?.url);
                const requestSet = type === 'normal'
                    ? activeNormalRequests
                    : type === 'boss'
                        ? activeBossRequests
                        : null;
                if (!requestSet) return;
                requestSet.add(request);
                request.always(() => requestSet.delete(request));
            }
        );

        const originalScheduleServerAction = window.scheduleServerAction;
        window.scheduleServerAction = function (delay, callback) {
            const callbackSource = Function.prototype.toString.call(callback);
            const type = /\b(?:boss|gboss)\s*\(/.test(callbackSource)
                ? 'boss'
                : /\b(?:fun|dungeonbattle|improveddungeonbattle)\s*\(/.test(callbackSource)
                    ? 'normal'
                    : null;
            const actionSet = type === 'boss'
                ? scheduledBossActions
                : type === 'normal'
                    ? scheduledNormalActions
                    : null;
            let handle;
            const guardedCallback = function () {
                if (actionSet) actionSet.delete(handle);
                if ((type === 'normal' && combatMode === 'boss')
                    || (type === 'boss' && combatMode === 'normal')) return;
                return callback.apply(this, arguments);
            };
            handle = originalScheduleServerAction.call(this, delay, guardedCallback);
            if (actionSet) actionSet.add(handle);
            return handle;
        };

        function cancelScheduledActions(actionSet) {
            actionSet.forEach((handle) => window.clearServerAction(handle));
            actionSet.clear();
        }

        function cancelNormalBattleWork(notifyServer = false) {
            try {
                if (typeof clearAutoBattleResumeState === 'function') clearAutoBattleResumeState();
                if (typeof autotimer !== 'undefined' && autotimer) {
                    window.clearServerAction(autotimer);
                    autotimer = null;
                }
                if (typeof varstopauto !== 'undefined') varstopauto = 1;
                if (typeof autoing !== 'undefined') autoing = 0;
                if (typeof am !== 'undefined') am = 0;
            } catch (error) {
                console.warn(`[${SCRIPT_ID}] Normal auto-battle state could not be fully cleared.`, error);
            }
            cancelScheduledActions(scheduledNormalActions);
            if (notifyServer) {
                fetch('stopauto.php', { method: 'GET', credentials: 'same-origin' }).catch(() => {});
            }
        }

        function cancelBossBattleWork() {
            try {
                if (typeof stopboss !== 'undefined') stopboss = 1;
            } catch (error) {
                console.warn(`[${SCRIPT_ID}] Boss auto-battle state could not be fully cleared.`, error);
            }
            cancelScheduledActions(scheduledBossActions);
        }

        function waitForRequestsToFinish(requestSet, callback) {
            if (requestSet.size === 0) {
                callback();
                return;
            }
            window.setTimeout(() => waitForRequestsToFinish(requestSet, callback), 50);
        }

        function hasNormalAutoWork() {
            if (activeNormalRequests.size > 0 || scheduledNormalActions.size > 0 || pendingNormalStart) {
                return true;
            }
            try {
                const scheduledAutoExists = typeof autotimer !== 'undefined'
                    && autotimer
                    && !autotimer.cancelled;
                return Boolean(scheduledAutoExists
                    || (typeof autoing !== 'undefined' && autoing)
                    || (typeof funcheck !== 'undefined' && funcheck)
                    || (typeof am !== 'undefined' && Number(am) > 0));
            } catch (_error) {
                return false;
            }
        }

        function wrapNormalAuto(functionName) {
            const original = window[functionName];
            const wrapped = function (...args) {
                if (combatMode !== 'boss') {
                    if (hasNormalAutoWork()) return undefined;
                    combatMode = 'normal';
                    return original.apply(this, args);
                }
                if (pendingNormalStart) return undefined;

                pendingNormalStart = true;
                combatMode = 'normal';
                cancelBossBattleWork();
                const context = this;
                waitForRequestsToFinish(activeBossRequests, () => {
                    pendingNormalStart = false;
                    cancelBossBattleWork();
                    original.apply(context, args);
                });
                return undefined;
            };
            wrapped.lyraniaCombatGuardWrapper = true;
            window[functionName] = wrapped;
        }

        function wrapBossBattle(functionName) {
            const original = window[functionName];
            const wrapped = function (...args) {
                if (combatMode === 'boss') return original.apply(this, args);
                if (pendingBossStart) return undefined;

                pendingBossStart = true;
                combatMode = 'boss';
                cancelNormalBattleWork(true);
                const context = this;
                waitForRequestsToFinish(activeNormalRequests, () => {
                    pendingBossStart = false;
                    cancelNormalBattleWork(false);

                    // A normal-auto shutdown can leave the game's shared boss
                    // stop flag set. Clear it only for this new boss sequence;
                    // recursive boss attacks still retain the game's own state.
                    if (typeof stopboss !== 'undefined') stopboss = 0;

                    // The delayed call must not make the game's action lock
                    // disable whichever control received focus in the meantime.
                    if (document.activeElement instanceof HTMLElement) {
                        document.activeElement.blur();
                    }
                    original.apply(context, args);
                });
                return undefined;
            };
            wrapped.lyraniaCombatGuardWrapper = true;
            window[functionName] = wrapped;
        }

        wrapNormalAuto('auto');
        wrapNormalAuto('improvedauto');
        wrapBossBattle('boss');
        wrapBossBattle('gboss');
        return true;
    }

    function enhanceDungeonMap() {
        const container = document.getElementById('dungeonmapcontainer');
        const labels = document.querySelectorAll('.dungeonmapRoomType');
        if (!container || labels.length < 4) return false;

        let mobsLeft = 0;
        let regularRooms = 0;
        let challengeRooms = 0;
        let emptyRooms = 0;

        const roomElements = Array.from(container.querySelectorAll('div div'))
            .filter((element) => !element.querySelector('img'));

        roomElements.forEach((room) => {
            room.style.color = 'white';
            const mobCount = Number.parseInt(room.textContent.trim(), 10);

            if (!Number.isFinite(mobCount) || mobCount <= 0) {
                emptyRooms += 1;
                return;
            }

            mobsLeft += mobCount;
            const strokeColor = getComputedStyle(room).webkitTextStrokeColor;
            if (strokeColor === 'rgb(255, 215, 0)') regularRooms += 1;
            if (strokeColor === 'rgb(139, 0, 0)') challengeRooms += 1;
        });

        labels[0].textContent = `Mobs Left (${mobsLeft}) | `;
        labels[1].textContent = `Regular Rooms (${regularRooms}) | `;
        labels[2].textContent = `Challenge Rooms (${challengeRooms}) | `;
        labels[3].textContent = `Empty Rooms (${emptyRooms})`;

        container.querySelectorAll('img').forEach((image) => {
            let pathname = '';
            try {
                pathname = new URL(image.src, window.location.href).pathname;
            } catch (_error) {
                pathname = image.getAttribute('src') || '';
            }

            const isChest = pathname.endsWith('/images/dungeons/open-chest.svg')
                || pathname.endsWith('/images/dungeons/chest.svg');
            if (!isChest) image.style.opacity = '0';
        });

        return true;
    }

    function waitForDungeonMap() {
        if (enhanceDungeonMap()) return;

        let scheduled = false;
        const observer = new MutationObserver(() => {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => {
                scheduled = false;
                if (enhanceDungeonMap()) observer.disconnect();
            });
        });

        observer.observe(document.body, { childList: true, subtree: true });
        window.setTimeout(() => observer.disconnect(), 15000);
    }

    function initializeDungeonMapSummary() {
        if (!MODS.dungeonMapSummary) return true;
        if (window.dungeonmap?.lyraniaDungeonMapSummaryWrapper) return true;
        if (typeof window.dungeonmap !== 'function') return false;

        const originalDungeonMap = window.dungeonmap;
        const wrappedDungeonMap = function (...args) {
            const result = originalDungeonMap.apply(this, args);
            waitForDungeonMap();
            return result;
        };
        wrappedDungeonMap.lyraniaDungeonMapSummaryWrapper = true;
        window.dungeonmap = wrappedDungeonMap;
        return true;
    }

    function parseVersion(version) {
        const match = String(version || '').trim().match(/^\d+(?:\.\d+)*$/);
        return match ? match[0].split('.').map(Number) : null;
    }

    function compareVersions(leftVersion, rightVersion) {
        const left = parseVersion(leftVersion);
        const right = parseVersion(rightVersion);
        if (!left || !right) return 0;

        const length = Math.max(left.length, right.length);
        for (let index = 0; index < length; index += 1) {
            const difference = (left[index] || 0) - (right[index] || 0);
            if (difference !== 0) return Math.sign(difference);
        }
        return 0;
    }

    function readUpdateCheckState() {
        try {
            const saved = JSON.parse(localStorage.getItem(UPDATE_CHECK_STORAGE_KEY));
            return saved && typeof saved === 'object' ? saved : {};
        } catch (_error) {
            return {};
        }
    }

    function writeUpdateCheckState(state) {
        try {
            localStorage.setItem(UPDATE_CHECK_STORAGE_KEY, JSON.stringify(state));
        } catch (_error) {
            // Updating still works through the userscript manager without storage.
        }
    }

    function showModUpdateNotification(latestVersion) {
        if (compareVersions(latestVersion, SCRIPT_VERSION) <= 0) return;
        try {
            if (localStorage.getItem(UPDATE_DISMISSED_STORAGE_KEY) === latestVersion) return;
        } catch (_error) {
            // Continue without persisted dismissal state.
        }
        if (document.getElementById(`${SCRIPT_ID}-update-banner`)) return;

        const banner = document.createElement('aside');
        banner.id = `${SCRIPT_ID}-update-banner`;
        banner.setAttribute('role', 'status');
        banner.style.cssText = [
            'position:fixed',
            'right:16px',
            'bottom:16px',
            'z-index:1000000',
            'box-sizing:border-box',
            'width:min(390px,calc(100vw - 32px))',
            'padding:14px',
            'border:1px solid #ffcc33',
            'border-radius:6px',
            'background:#161616',
            'color:#fff',
            'font:14px/1.4 Arial,sans-serif',
            'text-align:left',
            'box-shadow:0 6px 22px rgba(0,0,0,.55)'
        ].join(';');

        const heading = document.createElement('strong');
        heading.textContent = `${SCRIPT_NAME} update available`;
        heading.style.cssText = 'display:block;margin-bottom:6px;color:#ffcc33;font-size:15px';

        const message = document.createElement('div');
        message.textContent = `Version ${latestVersion} is available. You have ${SCRIPT_VERSION}.`;
        message.style.marginBottom = '10px';

        const installLink = document.createElement('a');
        installLink.href = SCRIPT_DOWNLOAD_URL;
        installLink.target = '_blank';
        installLink.rel = 'noopener noreferrer';
        installLink.textContent = 'Install update';
        installLink.style.cssText = 'display:inline-block;margin-right:10px;padding:6px 10px;border-radius:4px;background:#ffcc33;color:#111;text-decoration:none;font-weight:bold';

        const dismissButton = document.createElement('button');
        dismissButton.type = 'button';
        dismissButton.textContent = 'Later';
        dismissButton.style.cssText = 'padding:5px 10px;border:1px solid #777;border-radius:4px;background:#333;color:#fff;cursor:pointer';
        dismissButton.addEventListener('click', () => {
            try {
                localStorage.setItem(UPDATE_DISMISSED_STORAGE_KEY, latestVersion);
            } catch (_error) {
                // The banner can still be dismissed for the current page.
            }
            banner.remove();
        });

        banner.append(heading, message, installLink, dismissButton);
        document.body.appendChild(banner);

        if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
            const notification = new Notification(`${SCRIPT_NAME} update`, {
                body: `Version ${latestVersion} is ready to install.`,
                icon: 'https://lyrania.co.uk/favicon.ico'
            });
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
        }
    }

    async function checkForModUpdate(force = false) {
        const state = readUpdateCheckState();
        if (state.latestVersion) showModUpdateNotification(state.latestVersion);

        const checkedAt = Number(state.checkedAt) || 0;
        if (!force && Date.now() - checkedAt < UPDATE_CHECK_INTERVAL_MS) return;

        try {
            const response = await fetch(`${SCRIPT_DOWNLOAD_URL}?update-check=${Date.now()}`, {
                cache: 'no-store',
                credentials: 'omit'
            });
            if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}`);

            const source = await response.text();
            const versionMatch = source.match(/^\/\/\s*@version\s+([^\s]+)\s*$/m);
            if (!versionMatch || !parseVersion(versionMatch[1])) {
                throw new Error('The published userscript has no valid @version value.');
            }

            const latestVersion = versionMatch[1];
            writeUpdateCheckState({ checkedAt: Date.now(), latestVersion });
            showModUpdateNotification(latestVersion);
        } catch (error) {
            writeUpdateCheckState({ ...state, checkedAt: Date.now() });
            console.warn(`[${SCRIPT_ID}] Could not check GitHub for an update.`, error);
        }
    }

    const initializers = [
        initializeChatMods,
        initializeTripleDpHour,
        initializeKillsPerHour,
        initializeInactiveDpTimerHider,
        initializeBufferXp,
        initializePersistentLootLog,
        initializeCombatOverlapGuard,
        initializeDungeonMapSummary
    ];

    function initializeEnabledMods() {
        return initializers.every((initializeMod) => initializeMod());
    }

    if (!initializeEnabledMods()) {
        const startupObserver = new MutationObserver(() => {
            if (initializeEnabledMods()) startupObserver.disconnect();
        });
        startupObserver.observe(document.documentElement, { childList: true, subtree: true });
    }

    checkForModUpdate();
    window.setInterval(checkForModUpdate, UPDATE_CHECK_INTERVAL_MS);
})();
