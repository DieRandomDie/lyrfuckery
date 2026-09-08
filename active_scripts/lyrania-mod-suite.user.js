// ==UserScript==
// @name         Lyrania Mod Suite
// @namespace    https://lyrania.co.uk/
// @namespace    https://dev.lyrania.co.uk/
// @version      2.21.3
// @description  A configurable collection of chat, timer, statistics, inventory, and interface improvements for Lyrania.
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
  "use strict";

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

    // Preserves action cooldowns across menus and queues the next action.
    actionTimerFix: true,

    // Replaces Buffer XP percentage with projected level information.
    bufferXp: true,

    // Tracks loot totals locally and displays chat beside the Loot Log.
    persistentLootLog: true,

    // Keeps all six simplified-inventory tabs in a permanent responsive panel.
    persistentInventory: true,

    // Gives inventory its own request so it cannot interrupt battle actions.
    isolatedInventoryRequests: true,

    // Closes genuine game popups when a click starts and ends outside them.
    popupOutsideClose: true,

    // Summarizes dungeon rooms and hides non-chest map icons.
    dungeonMapSummary: true,
  });

  const SCRIPT_ID = "lyrania-chat-enhancements";
  const SCRIPT_NAME = "Lyrania Mod Suite";
  const SCRIPT_VERSION = "2.21.3";
  const SCRIPT_DOWNLOAD_URL =
    "https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-mod-suite.user.js";
  const REMOTE_THEME_URL =
    "https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-modern-responsive-theme.css?v=1.6.6";
  const REMOTE_THEME_CACHE_KEY = "lyrania-mod-suite:remote-theme-cache";
  const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const UPDATE_CHECK_STORAGE_KEY = "lyrania-mod-suite:update-check";
  const UPDATE_DISMISSED_STORAGE_KEY = "lyrania-mod-suite:update-dismissed";
  const GAME_VERSION = detectGameVersion();
  const GAME_MAJOR_VERSION = parseVersion(GAME_VERSION)?.[0] || 0;
  const LONDON_TIME_FORMATTER = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    hourCycle: "h23",
  });
  const TRIPLE_DP_INTERVAL_HOURS = 20;
  const CHANNEL_CLASS_NAMES = Object.freeze({
    0: "mainchatcolor",
    l: "gameschatcolor",
    g: "guildchatcolor",
    o: "officerchatcolor",
    t: "tradechatcolor",
    au: "auctionchatcolor",
    p: "pubchatcolor",
    a: "areachatcolor",
    w: "whisperchatcolor",
  });
  const CHANNEL_CLASS_ENTRIES = Object.entries(CHANNEL_CLASS_NAMES);
  const NATIVE_CHAT_CONTROLS = Object.freeze({
    0: { buttonId: "mainchatbutton", command: "killchat" },
    l: { buttonId: "Litechatbutton", command: "gamesroom" },
    g: { buttonId: "guildchatbutton", command: "guildchat" },
    t: { buttonId: "tradechatbutton", command: "trade" },
    au: { buttonId: "auctionchatbutton", command: "auction" },
    p: { buttonId: "pubchatbutton", command: "pub" },
    a: { buttonId: "areachatbutton", command: "area" },
    global: { buttonId: "globalschatbutton", command: "killglobals" },
  });
  const CHANNEL_LABELS = Object.freeze({
    GamesRoom: "Games Room",
    gboss: "Guild Boss",
    NewPlayers: "New Players",
    Icedraffle: "Iced Raffle",
    CatsCafe: "Cats Cafe",
  });

  let selectedChannel = "all";
  let showGlobalChat = true;
  const enabledAllChannels = new Set();
  const serverClockSubscribers = new Set();
  let chatChannelMarkers = [];
  let quickMenu = null;
  let serverClockObserver = null;

  function createButton(label, className = "") {
    const button = document.createElement("button");
    Object.assign(button, { type: "button", className, textContent: label });
    return button;
  }

  function detectGameVersion() {
    const titleVersion = document.title.match(
      /(?:^|\s)Lyrania\s+(\d+(?:\.\d+)*)\b/i,
    )?.[1];

    for (const candidate of [window.lyrversion, titleVersion]) {
      const parsed = parseVersion(candidate);
      if (parsed) return parsed.join(".");
    }
    return "unknown";
  }

  function initializeGameVersionCompatibility() {
    // Lyrania 4 moved the game and chat rows out of #holder for its native
    // layouts. The mod's responsive grid intentionally retains the 3.1 shell,
    // so restore that hierarchy before any other mod initializes. On 3.1 this
    // branch is never entered and the original DOM is left untouched.
    if (GAME_MAJOR_VERSION !== 4) return true;

    document.documentElement.dataset.lyraniaGameVersion = GAME_VERSION;
    document.documentElement.dataset.lyraniaGameMajor = String(
      GAME_MAJOR_VERSION,
    );

    const holder = document.getElementById("holder");
    const gameRow = document.getElementById("middlesection");
    const chatRow = document.getElementById("chat_row");
    if (!holder || !gameRow || !chatRow) return false;

    if (gameRow.parentElement !== holder) holder.appendChild(gameRow);
    if (chatRow.parentElement !== holder) holder.appendChild(chatRow);

    // Keep the original popup geometry, but place its top-level containers
    // after the game shell so 4.0's newer stacking contexts cannot paint over
    // them. Reordering existing body children does not change their layout.
    const popupContainer = document.getElementById("popupcontainer");
    const popupCloser = document.getElementById("popupcloser");
    if (popupContainer?.parentElement === document.body) {
      if (popupCloser?.parentElement === document.body) {
        document.body.appendChild(popupCloser);
      }
      document.body.appendChild(popupContainer);
    }
    popupContainer?.style.setProperty(
      "z-index",
      "2147483000",
      "important",
    );
    popupCloser?.style.setProperty(
      "z-index",
      "2147482999",
      "important",
    );

    // The theme keeps the centered 3.1 popup geometry, so prevent 4.0's
    // top-bar drag handler from writing a conflicting inline position.
    const popupTopbar = document.getElementById("popuptopbar");
    if (popupTopbar && !popupTopbar.dataset.lyraniaFixedPopup) {
      popupTopbar.dataset.lyraniaFixedPopup = "true";
      popupTopbar.addEventListener(
        "pointerdown",
        (event) => {
          if (
            event.target.closest?.("a, button, input, select, option, label")
          ) {
            return;
          }
          event.stopImmediatePropagation();
        },
        true,
      );
    }
    return true;
  }

  function plainText(value) {
    const source = String(value ?? "");
    return source.includes("<")
      ? new DOMParser().parseFromString(source, "text/html").body.textContent
      : source;
  }

  function installRemoteTheme(cssText) {
    const css = String(cssText || "").trim();
    if (css.length < 100 || !css.includes("{") || css.startsWith("```"))
      return false;

    let style = document.getElementById(`${SCRIPT_ID}-remote-theme`);
    if (!style) {
      style = document.createElement("style");
      style.id = `${SCRIPT_ID}-remote-theme`;
      document.head.appendChild(style);
    }
    style.textContent = css;
    return true;
  }

  async function loadRemoteTheme() {
    let cachedCss = "";
    try {
      const cached = JSON.parse(localStorage.getItem(REMOTE_THEME_CACHE_KEY));
      if (cached?.url === REMOTE_THEME_URL && typeof cached.css === "string") {
        cachedCss = cached.css;
        installRemoteTheme(cachedCss);
      }
    } catch (_error) {
      // Continue with the network copy when browser storage is unavailable.
    }

    try {
      const response = await fetch(REMOTE_THEME_URL, {
        cache: "no-cache",
        credentials: "omit",
      });
      if (!response.ok)
        throw new Error(`GitHub returned HTTP ${response.status}`);

      const css = await response.text();
      if (!installRemoteTheme(css))
        throw new Error("The downloaded theme was not valid CSS text.");
      try {
        localStorage.setItem(
          REMOTE_THEME_CACHE_KEY,
          JSON.stringify({
            url: REMOTE_THEME_URL,
            css,
          }),
        );
      } catch (_error) {
        // The live theme still works when browser storage is unavailable.
      }
    } catch (error) {
      if (!cachedCss)
        console.warn(`[${SCRIPT_ID}] Could not load the remote theme.`, error);
    }
  }

  function normalizeChannelLabel(label) {
    const trimmed = label.trim();
    return CHANNEL_LABELS[trimmed] || trimmed;
  }

  function setSelectedButton(sidebar) {
    sidebar
      .querySelectorAll(".lyrania-channel-select[data-channel]")
      .forEach((button) => {
        const selected = button.dataset.channel === selectedChannel;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      });
  }

  function isNativeChatEnabled(channel) {
    const control = NATIVE_CHAT_CONTROLS[channel];
    const button = control && document.getElementById(control.buttonId);
    if (!button) return true;

    const color = getComputedStyle(button)
      .backgroundColor.replace(/\s+/g, "")
      .toLowerCase();
    return (
      color !== "rgb(0,0,0)" &&
      color !== "rgba(0,0,0,0)" &&
      color !== "transparent"
    );
  }

  function ensureNativeChatEnabled(channel) {
    const control = NATIVE_CHAT_CONTROLS[channel];
    if (!control || isNativeChatEnabled(channel)) return;
    callGameFunction("commands", control.command);
  }

  function updateChannelToggle(button, enabled) {
    button.classList.toggle("is-enabled", enabled);
    button.setAttribute("aria-pressed", String(enabled));
    button.textContent = enabled ? "On" : "Off";
    button.title = enabled ? "Shown in All" : "Hidden from All";
  }

  function isGlobalOrBossAnnouncement(line) {
    if (
      line.querySelector(`
            .globalchatcolor,
            [class*="boss" i],
            [class*="motd" i],
            [class*="bonus" i]
        `)
    ) {
      return true;
    }

    const text = line.textContent.replace(/\s+/g, " ").trim();
    if (
      /\bmessage\s+of\s+the\s+day\s*:/i.test(text) ||
      /(?:^|\s)g?motd\s*:/i.test(text) ||
      /\bauto\s+reconciliation\b/i.test(text) ||
      /\brecovered\s+[\d,]+\s+auto\s+battles?\s+while\s+(?:your\s+game\s+tab\s+was\s+inactive|you\s+were\s+offline)\b/i.test(
        text,
      ) ||
      /\bbonus\s+(?:effect|event|modifier|active|activated)\b/i.test(text)
    ) {
      return true;
    }

    // Bonus system notices do not have a player-name element. This catches
    // alternate bonus wording without hiding normal player conversations.
    if (!line.querySelector(".chatname") && /\bbonus(?:es)?\b/i.test(text)) {
      return true;
    }

    for (const link of line.querySelectorAll("a[href]")) {
      const href = (link.getAttribute("href") || "")
        .replace(/\s+/g, "")
        .toLowerCase();
      if (
        href.includes("performnav(9)") ||
        href.includes("contract()") ||
        href.includes("boss")
      )
        return true;
    }
    return false;
  }

  function lineMatchesSelectedChannel(line) {
    if (selectedChannel === "all") {
      if (isGlobalOrBossAnnouncement(line)) return showGlobalChat;
      if (line.querySelector(".whisperchatcolor")) return true;

      for (const [channel, className] of CHANNEL_CLASS_ENTRIES) {
        if (channel !== "w" && line.querySelector(`.${className}`)) {
          return enabledAllChannels.has(channel);
        }
      }

      for (const channel of chatChannelMarkers) {
        if (line.textContent.includes(channel.marker)) {
          return enabledAllChannels.has(channel.value);
        }
      }
      return true;
    }

    // Whispers remain visible in every filtered view so replies are not missed.
    if (line.querySelector(".whisperchatcolor")) {
      return true;
    }

    if (selectedChannel === "global") return isGlobalOrBossAnnouncement(line);

    const className = CHANNEL_CLASS_NAMES[selectedChannel];
    if (className) {
      return Boolean(line.querySelector(`.${className}`));
    }

    const channel = chatChannelMarkers.find(
      (item) => item.value === selectedChannel,
    );
    return Boolean(channel && line.textContent.includes(channel.marker));
  }

  function updateChatLineVisibility(line) {
    line.hidden = !lineMatchesSelectedChannel(line);
  }

  function filterChat() {
    const chatWindow = document.getElementById("chatwindow");
    if (!chatWindow) return;

    chatWindow.querySelectorAll(".chatline").forEach((line) => {
      updateChatLineVisibility(line);
    });
  }

  function filterAddedChatLines(records) {
    records.forEach((record) => {
      record.addedNodes.forEach((node) => {
        if (node.nodeType === 1 && node.matches(".chatline")) {
          updateChatLineVisibility(node);
        }
        node.querySelectorAll?.(".chatline").forEach((line) => {
          updateChatLineVisibility(line);
        });
      });
    });
  }

  function createChannelSidebar(chatRow, channelSelect) {
    const sidebar = document.createElement("aside");
    sidebar.id = `${SCRIPT_ID}-channels`;
    sidebar.setAttribute("aria-label", "Chat channels");

    const channels = Array.from(channelSelect.options, (option) => ({
      value: option.value,
      label: normalizeChannelLabel(option.text),
      marker: `[ ${option.text.trim()} ]`,
    }));
    chatChannelMarkers = channels.map(({ value, marker }) => ({
      value,
      marker,
    }));

    const allButton = createButton(
      "All",
      "lyrania-chat-filter lyrania-channel-select",
    );
    allButton.dataset.channel = "all";
    allButton.addEventListener("click", () => {
      selectedChannel = "all";
      channelSelect.value = "0";
      setSelectedButton(sidebar);
      filterChat();
    });
    sidebar.appendChild(allButton);

    function addChannelRow(
      value,
      label,
      enabled,
      extraClass = "",
      toggleable = true,
    ) {
      if (enabled) enabledAllChannels.add(value);

      const row = document.createElement("div");
      row.className = `lyrania-channel-row ${extraClass}`.trim();

      const selectButton = createButton(
        label,
        "lyrania-chat-filter lyrania-channel-select",
      );
      selectButton.dataset.channel = value;
      selectButton.addEventListener("click", () => {
        ensureNativeChatEnabled(value);
        selectedChannel = value;
        channelSelect.value = value === "global" ? "0" : value;
        setSelectedButton(sidebar);
        filterChat();
      });

      row.appendChild(selectButton);
      if (!toggleable) {
        row.classList.add("lyrania-no-toggle");
        sidebar.appendChild(row);
        return;
      }

      const toggleButton = createButton("", "lyrania-channel-toggle");
      updateChannelToggle(toggleButton, enabled);
      toggleButton.addEventListener("click", () => {
        const nextEnabled = !enabledAllChannels.has(value);
        if (nextEnabled) {
          enabledAllChannels.add(value);
          ensureNativeChatEnabled(value);
        } else {
          enabledAllChannels.delete(value);
        }
        if (value === "global") showGlobalChat = nextEnabled;
        updateChannelToggle(toggleButton, nextEnabled);
        filterChat();
      });

      row.appendChild(toggleButton);
      sidebar.appendChild(row);
    }

    const numberedChannels = channels.filter(({ value }) =>
      /^\d+$/.test(value.trim()),
    );
    const standardChannels = channels.filter(
      ({ value }) => !/^\d+$/.test(value.trim()),
    );

    standardChannels.forEach(({ value, label }) => {
      const enabled = NATIVE_CHAT_CONTROLS[value]
        ? isNativeChatEnabled(value)
        : true;
      addChannelRow(value, label, enabled);
    });

    numberedChannels.forEach(({ value, label }) => {
      addChannelRow(value, label, true);
    });

    addChannelRow("w", "Whispers", true, "lyrania-special-row", false);
    ensureNativeChatEnabled("global");
    showGlobalChat = true;
    addChannelRow("global", "Global Chat", true);

    chatRow.classList.add(`${SCRIPT_ID}-layout`);
    chatRow.insertBefore(sidebar, chatRow.firstChild);
    channelSelect.hidden = true;

    const chat = document.getElementById("chat");
    if (chat) {
      const constrainSidebarHeight = () => {
        const availableHeight = Math.max(
          100,
          Math.floor(chat.getBoundingClientRect().height - 10),
        );
        sidebar.style.height = `${availableHeight}px`;
        sidebar.style.maxHeight = `${availableHeight}px`;
      };
      constrainSidebarHeight();
      new ResizeObserver(constrainSidebarHeight).observe(chat);
    }
    setSelectedButton(sidebar);
  }

  function setChatCommand(command, playerName) {
    const input = document.getElementById("inputchat");
    if (!input) return;
    input.value = `/${command} ${playerName} `;
    input.style.color = "#DD77DD";
    input.focus();
  }

  function callGameFunction(functionName, ...args) {
    const gameFunction = window[functionName];
    if (typeof gameFunction === "function") {
      gameFunction(...args);
    } else {
      console.warn(
        `[${SCRIPT_ID}] The game function "${functionName}" is unavailable.`,
      );
    }
  }

  function closeQuickMenu() {
    quickMenu?.remove();
    quickMenu = null;
  }

  function addQuickMenuAction(menu, label, action) {
    const button = createButton(label);
    button.addEventListener("click", (event) => {
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

    const menu = document.createElement("div");
    menu.id = `${SCRIPT_ID}-quick-menu`;
    menu.setAttribute("role", "menu");

    addQuickMenuAction(menu, "View Profile", () =>
      callGameFunction("profile", playerName),
    );
    addQuickMenuAction(menu, "Whisper", () => setChatCommand("w", playerName));
    addQuickMenuAction(menu, "Send Mail", () =>
      callGameFunction("post", 0, playerName, ""),
    );
    addQuickMenuAction(menu, "Wire Platinum", () =>
      setChatCommand("wire", playerName),
    );
    addQuickMenuAction(menu, "Wire Jade", () =>
      setChatCommand("wirejade", playerName),
    );
    addQuickMenuAction(menu, "Wire Item", () =>
      setChatCommand("wireitem", playerName),
    );

    document.body.appendChild(menu);
    quickMenu = menu;

    const nameRect = chatName.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const left = Math.min(
      nameRect.right + 5,
      window.innerWidth - menuRect.width - 6,
    );
    const top = Math.min(
      nameRect.top,
      window.innerHeight - menuRect.height - 6,
    );
    menu.style.left = `${Math.max(6, left)}px`;
    menu.style.top = `${Math.max(6, top)}px`;
    menu.querySelector("button")?.focus();
  }

  function installQuickMenu() {
    document.addEventListener("click", (event) => {
      const chatName = event.target.closest?.("#chatwindow .chatname");
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

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeQuickMenu();
    });

    window.addEventListener("resize", closeQuickMenu);
    window.addEventListener("scroll", closeQuickMenu, true);
  }

  function initializeChatMods() {
    const wantsSidebar = MODS.chatChannelSidebar;
    const wantsQuickMenu = MODS.chatQuickMenu;
    if (!wantsSidebar && !wantsQuickMenu) return true;

    const chatWindow = document.getElementById("chatwindow");
    if (!chatWindow) return false;

    if (wantsSidebar && !document.getElementById(`${SCRIPT_ID}-channels`)) {
      const chatRow = document.getElementById("chat_row");
      const channelSelect = document.getElementById("chatchannel");
      if (!chatRow || !channelSelect) return false;
      createChannelSidebar(chatRow, channelSelect);

      const observer = new MutationObserver(filterAddedChatLines);
      observer.observe(chatWindow, { childList: true });
      filterChat();
    }

    if (wantsQuickMenu && !document.documentElement.dataset.lyraniaQuickMenu) {
      document.documentElement.dataset.lyraniaQuickMenu = "installed";
      installQuickMenu();
    }
    return true;
  }

  function getEstimatedServerTimestamp() {
    try {
      const timestamp = Number(window.estimatedServerNow?.());
      if (Number.isFinite(timestamp) && timestamp > 0) return timestamp;
    } catch (_error) {
      // Fall back to the browser clock until server synchronization completes.
    }
    return Date.now();
  }

  function getLondonTime(timestamp = getEstimatedServerTimestamp()) {
    return Object.fromEntries(
      LONDON_TIME_FORMATTER.formatToParts(new Date(timestamp))
        .filter(({ type }) => type !== "literal")
        .map(({ type, value }) => [type, Number(value)]),
    );
  }

  function formatTripleDpHour(hour) {
    return `${String(hour).padStart(2, "0")}:00:00`;
  }

  function getDisplayedServerTime() {
    const match = document
      .getElementById("serverTime")
      ?.textContent.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    if (!match) return null;

    const [, hour, minute, second] = match.map(Number);
    if (hour > 23 || minute > 59 || second > 59) return null;
    return { hour, minute, second };
  }

  function getTripleDpHour(timestamp = getEstimatedServerTimestamp()) {
    const london = getLondonTime(timestamp);
    const serverTime = getDisplayedServerTime() || london;
    const elapsedHours = (london.day - 1) * 24 + serverTime.hour;
    const hoursSinceTripleDp = elapsedHours % TRIPLE_DP_INTERVAL_HOURS;
    if (hoursSinceTripleDp === 0) return "Now";

    const nextStart =
      elapsedHours + TRIPLE_DP_INTERVAL_HOURS - hoursSinceTripleDp;
    const hoursInMonth =
      new Date(Date.UTC(london.year, london.month, 0)).getUTCDate() * 24;

    // The cycle starts over at 00:00 UK server time on the first of every month.
    return formatTripleDpHour(nextStart >= hoursInMonth ? 0 : nextStart % 24);
  }

  function subscribeToServerClock(callback) {
    const serverTime = document.getElementById("serverTime");
    if (!serverTime) return false;

    serverClockSubscribers.add(callback);
    if (!serverClockObserver) {
      serverClockObserver = new MutationObserver(() => {
        serverClockSubscribers.forEach((subscriber) => subscriber());
      });
      serverClockObserver.observe(serverTime, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
    callback();
    return true;
  }

  function initializeTripleDpHour() {
    if (!MODS.tripleDpHour) return true;
    if (document.getElementById(`${SCRIPT_ID}-triple-hour`)) return true;

    const serverTimeRow = document.getElementById("serverTime")?.parentElement;
    if (!serverTimeRow) return false;

    const row = document.createElement("div");
    row.id = `${SCRIPT_ID}-triple-hour`;
    row.innerHTML = "Triple DP Hour: <span>--:--:--</span>";
    serverTimeRow.insertAdjacentElement("afterend", row);

    const output = row.querySelector("span");
    let lastMinute = "";
    return subscribeToServerClock(() => {
      const serverMinute = document
        .getElementById("serverTime")
        ?.textContent.slice(0, 5);
      if (serverMinute && serverMinute === lastMinute) return;
      lastMinute = serverMinute;
      const display = getTripleDpHour();
      if (output.textContent !== display) output.textContent = display;
    });
  }

  function parseFormattedNumber(value) {
    const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(number) ? number : 0;
  }

  function initializeKillsPerHour() {
    if (!MODS.killsPerHour) return true;
    if (document.getElementById(`${SCRIPT_ID}-kph`)) return true;

    const sideCounter = document.getElementById("sidecounter");
    if (!sideCounter) return false;

    const serverTime = document.getElementById("serverTime");
    const killCount = document.getElementById("killscount");
    if (!serverTime || !killCount) return false;

    const row = document.createElement("div");
    row.innerHTML = `Kills Per Hour: <span id="${SCRIPT_ID}-kph">0.0</span>`;
    sideCounter.appendChild(row);

    const output = row.querySelector("span");
    const update = () => {
      const kills = parseFormattedNumber(killCount.textContent);
      const time = getDisplayedServerTime();
      if (!time) return;
      const elapsedHours = time.hour + time.minute / 60 + time.second / 3600;
      const display =
        elapsedHours > 0 ? (kills / elapsedHours).toFixed(1) : "0.0";
      if (output.textContent !== display) output.textContent = display;
    };
    return subscribeToServerClock(update);
  }

  function initializeInactiveDpTimerHider() {
    if (!MODS.hideInactiveDpTimers) return true;
    const bonusDisplay = document.getElementById("bonusdisplays");
    if (!bonusDisplay) return false;
    if (bonusDisplay.dataset.lyraniaInactiveDpHider) return true;
    bonusDisplay.dataset.lyraniaInactiveDpHider = "installed";

    const update = () => {
      ["doubledp", "tripledp", "quaddp"].forEach((id) => {
        const timer = document.getElementById(id);
        if (timer?.parentElement) {
          timer.parentElement.hidden =
            timer.textContent.trim().toLowerCase() === "inactive";
        }
      });
    };

    new MutationObserver(update).observe(bonusDisplay, {
      childList: true,
      characterData: true,
      subtree: true,
    });
    update();
    return true;
  }

  function initializeActionTimerFix() {
    if (!MODS.actionTimerFix || window.__lyraniaActionTimerFixInstalled)
      return true;

    const actionFunctions = [
      "auto",
      "improvedauto",
      "battle",
      "improvedbattle",
      "dungeonbattle",
      "improveddungeonbattle",
    ];
    const menuFunctions = ["moblist", "improvedmoblist", "map", "gmap"];
    const requiredFunctions = [
      "timer",
      "timer2",
      "finishActionTimer",
      "scheduleServerAction",
      "clearServerAction",
      "performnav",
      "guildpage",
      "boss",
      "gboss",
      ...actionFunctions,
      ...menuFunctions,
    ];
    if (
      !window.jQuery ||
      requiredFunctions.some((name) => typeof window[name] !== "function")
    )
      return false;

    window.__lyraniaActionTimerFixInstalled = true;
    const originalTimer = window.timer;
    const originalSchedule = window.scheduleServerAction;
    const originalFinishTimer = window.finishActionTimer;
    const actionSchedules = new Set();
    const controlSelector = [
      "#content .kung_fu_button",
      "#content #bb",
      "#content #attackboss",
      '#content [onclick*="auto("]',
      '#content [onclick*="battle("]',
      '#content [onclick*="boss("]',
      '#content [onclick*="gboss("]',
    ].join(",");
    let activeRequests = 0;
    let navigating = false;
    let preservedDeadline = 0;
    let queuedAction = null;
    let queuedHandle = null;
    let manualCombatPendingContinue = false;
    let allowNextMoblistCooldown = false;
    let navigationAcceptsRequestedCooldown = false;
    let centralMenuPreservesAuto = false;

    function currentDeadline() {
      try {
        const exact =
          typeof actionTimerEndsAt === "undefined"
            ? 0
            : Number(actionTimerEndsAt);
        if (exact > 0) return exact;

        const remaining = Math.max(
          typeof timertime === "undefined" ? 0 : Number(timertime) || 0,
          typeof timer2time === "undefined" ? 0 : Number(timer2time) || 0,
        );
        return remaining > 0 ? getEstimatedServerTimestamp() + remaining : 0;
      } catch (_error) {
        return 0;
      }
    }

    function remainingCooldown() {
      return Math.max(
        0,
        Math.max(currentDeadline(), preservedDeadline) -
          getEstimatedServerTimestamp(),
      );
    }

    const primaryActionSelector = [
      "#content input#bb",
      "#content button#bb",
      "#content #attackboss",
      '#content input[type="button"][value="Attack!"]',
      '#content input[type="button"][value="Fight"]',
      '#content input[type="button"][value="Continue"]',
    ].join(",");

    function renderQueue() {
      const timerDisplay = document.getElementById("timer");
      if (timerDisplay) {
        if (queuedAction) timerDisplay.dataset.lyraniaActionQueued = "true";
        else delete timerDisplay.dataset.lyraniaActionQueued;
      }
      document
        .querySelectorAll("[data-lyrania-queued-control]")
        .forEach((control) => {
          delete control.dataset.lyraniaQueuedControl;
        });
      if (queuedAction?.source?.isConnected) {
        queuedAction.source.dataset.lyraniaQueuedControl = "true";
      }
    }

    function visiblePrimaryAction() {
      return [...document.querySelectorAll(primaryActionSelector)].find(
        (control) =>
          !control.disabled &&
          !control.closest("#capt, #captchadiv") &&
          control.getClientRects().length > 0 &&
          getComputedStyle(control).visibility !== "hidden",
      );
    }

    function botCheckIsVisible() {
      const botCheck = document.querySelector("#capt, #captchadiv");
      return Boolean(botCheck && botCheck.getClientRects().length > 0);
    }

    function restorePrimaryActionFocus() {
      if (remainingCooldown() > 0 || activeRequests > 0 || queuedAction) return;
      if (botCheckIsVisible()) return;

      const popupHolder = document.getElementById("popupholder");
      if (popupHolder && getComputedStyle(popupHolder).visibility === "visible")
        return;

      const active = document.activeElement;
      const focusIsFree =
        !active ||
        active === document.body ||
        active === document.documentElement ||
        !active.isConnected;
      if (!focusIsFree) return;

      const primaryAction = visiblePrimaryAction();
      if (!primaryAction) return;
      try {
        primaryAction.focus({ preventScroll: true });
      } catch (_error) {
        primaryAction.focus();
      }
    }

    function isActionSchedule(callback) {
      return /\b(?:fun|boss|gboss|dungeonbattle|improveddungeonbattle)\s*\(/.test(
        Function.prototype.toString.call(callback),
      );
    }

    window.scheduleServerAction = function (delay, callback) {
      if (!isActionSchedule(callback)) {
        return originalSchedule.apply(this, arguments);
      }

      let handle;
      handle = originalSchedule.call(this, delay, function (...args) {
        actionSchedules.delete(handle);
        return callback.apply(this, args);
      });
      actionSchedules.add(handle);
      return handle;
    };

    function stopRepeatingActions() {
      actionSchedules.forEach((handle) => window.clearServerAction(handle));
      actionSchedules.clear();

      try {
        const autoWasRunning =
          (typeof autoing !== "undefined" && Number(autoing) !== 0) ||
          (typeof am !== "undefined" && Number(am) > 0) ||
          (typeof funcheck !== "undefined" && Boolean(funcheck));

        if (typeof varstopauto !== "undefined") varstopauto = 1;
        if (typeof autoing !== "undefined") autoing = 0;
        if (typeof am !== "undefined") am = 0;
        if (typeof stopboss !== "undefined") stopboss = 1;
        if (typeof clearAutoBattleResumeState === "function")
          clearAutoBattleResumeState();
        if (autoWasRunning) {
          fetch("stopauto.php", { credentials: "same-origin" }).catch(() => {});
        }
      } catch (error) {
        console.warn(
          "[lyrania-action-timer-fix] Could not stop the prior action.",
          error,
        );
      }
    }

    function cancelQueuedAction() {
      queuedAction = null;
      if (queuedHandle) window.clearServerAction(queuedHandle);
      queuedHandle = null;
      renderQueue();
    }

    function clearManualCombatCycle() {
      manualCombatPendingContinue = false;
      allowNextMoblistCooldown = false;
    }

    function beginNavigation(
      cancelPending = false,
      acceptRequestedCooldown = false,
    ) {
      if (cancelPending) cancelQueuedAction();
      preservedDeadline = Math.max(preservedDeadline, currentDeadline());
      navigationAcceptsRequestedCooldown = Boolean(acceptRequestedCooldown);
      stopRepeatingActions();
      navigating = true;
      renderQueue();
    }

    window.timer = function (delay, ...rest) {
      const milliseconds = Math.max(0, Number(delay) || 0);
      if (!navigating) {
        preservedDeadline = 0;
        navigationAcceptsRequestedCooldown = false;
        return originalTimer.call(this, milliseconds, ...rest);
      }

      // A newly requested mob-list timer is valid only after a manual combat
      // result's Continue button. Initial Battle navigation and auto completion
      // should return immediately, while an already-running cooldown is carried.
      const serverNow = getEstimatedServerTimestamp();
      const carriedMilliseconds = Math.max(0, preservedDeadline - serverNow);
      const requestedMilliseconds = navigationAcceptsRequestedCooldown
        ? milliseconds
        : 0;
      const effectiveMilliseconds = Math.max(
        requestedMilliseconds,
        carriedMilliseconds,
      );
      preservedDeadline =
        effectiveMilliseconds > 0 ? serverNow + effectiveMilliseconds : 0;

      const result = originalTimer.call(this, effectiveMilliseconds, ...rest);
      renderQueue();
      return result;
    };
    window.timer2 = function (...args) {
      return window.timer.apply(this, args);
    };

    function prepareAction(type) {
      navigating = false;
      preservedDeadline = 0;
      navigationAcceptsRequestedCooldown = false;
      try {
        if (type === "boss" && typeof stopboss !== "undefined") stopboss = 0;
        if (type !== "boss" && typeof varstopauto !== "undefined")
          varstopauto = 0;
      } catch (_error) {
        // The native action will initialize unavailable state.
      }
    }

    function scheduleQueueCheck(delay = remainingCooldown()) {
      if (!queuedAction) return;
      if (queuedHandle) window.clearServerAction(queuedHandle);
      queuedHandle = originalSchedule.call(window, Math.max(0, delay), () => {
        queuedHandle = null;
        runQueuedAction();
      });
    }

    function runQueuedAction() {
      if (!queuedAction) return;
      const remaining = remainingCooldown();
      if (remaining > 0 || activeRequests > 0) {
        renderQueue();
        scheduleQueueCheck(remaining || 100);
        return;
      }

      const action = queuedAction;
      cancelQueuedAction();
      try {
        originalFinishTimer.call(window);
      } catch (_error) {
        // The queued action can initialize its own timer.
      }
      prepareAction(action.type);
      action.original.apply(action.context, action.args);
    }

    function executeOrQueue(type, original, context, args) {
      // Repeated Enter presses can reach the old action button before its
      // request returns. Native fighting/actionprogress guards treat those as
      // no-ops, so never turn an in-flight repeat into a second queued attack.
      if (activeRequests > 0) return undefined;
      if (remainingCooldown() <= 0) {
        prepareAction(type);
        return original.apply(context, args);
      }
      const activeControl = document.activeElement;
      const source = activeControl?.matches?.(controlSelector)
        ? activeControl
        : null;
      queuedAction = { type, original, context, args, source };
      renderQueue();
      scheduleQueueCheck();
      return undefined;
    }

    function wrap(functionName, handler) {
      const original = window[functionName];
      window[functionName] = function (...args) {
        return handler(original, this, args);
      };
    }

    window
      .jQuery(document)
      .on("ajaxSend.lyraniaActionTimerFix", (_event, request, settings) => {
        const url = String(settings?.url || "")
          .split("?")[0]
          .toLowerCase();
        if (
          !/(?:^|\/)(?:auto|improvedauto|battle|improvedbattle|dungeonbattle|improveddungeonbattle|bosses|gboss)\.php$/.test(
            url,
          )
        )
          return;
        activeRequests += 1;
        request.always(() =>
          window.setTimeout(() => {
            activeRequests = Math.max(0, activeRequests - 1);
            runQueuedAction();
          }, 0),
        );
      });

    window.finishActionTimer = function (...args) {
      const result = originalFinishTimer.apply(this, args);
      if (
        botCheckIsVisible() &&
        document.activeElement?.closest?.("#capt, #captchadiv")
      ) {
        document.activeElement.blur();
      }
      runQueuedAction();
      window.setTimeout(restorePrimaryActionFocus, 0);
      return result;
    };

    document.addEventListener(
      "click",
      (event) => {
        const control = event.target.closest?.(
          '#content input[type="button"], #content input[type="submit"], #content button',
        );
        if (!control) return;

        const label = String(control.value || control.textContent || "")
          .trim()
          .toLowerCase();
        if (/^(?:attack!?|fight!?)$/.test(label)) {
          manualCombatPendingContinue = true;
          allowNextMoblistCooldown = false;
        } else if (label === "continue") {
          allowNextMoblistCooldown = manualCombatPendingContinue;
          manualCombatPendingContinue = false;
        }
      },
      true,
    );

    wrap("performnav", (original, context, args) => {
      const menuItem = Number(args[0]);
      clearManualCombatCycle();
      if (menuItem === 8 || menuItem === 9) {
        beginNavigation(true, false);
        return original.apply(context, args);
      }

      if (
        menuItem === 1 &&
        typeof window.saveAutoBattleResumeState === "function"
      ) {
        window.saveAutoBattleResumeState();
      }

      centralMenuPreservesAuto = true;
      try {
        return original.apply(context, args);
      } finally {
        centralMenuPreservesAuto = false;
      }
    });
    ["moblist", "improvedmoblist"].forEach((name) =>
      wrap(name, (original, context, args) => {
        if (centralMenuPreservesAuto) return original.apply(context, args);

        const acceptRequestedCooldown = allowNextMoblistCooldown;
        clearManualCombatCycle();
        beginNavigation(false, acceptRequestedCooldown);
        return original.apply(context, args);
      }),
    );
    wrap("map", (original, context, args) => {
      clearManualCombatCycle();
      beginNavigation(false, false);
      return original.apply(context, args);
    });
    wrap("gmap", (original, context, args) => {
      beginNavigation(false, false);
      return original.apply(context, args);
    });
    wrap("guildpage", (original, context, args) => {
      if (Number(args[0]) === 11) {
        clearManualCombatCycle();
        beginNavigation(false, false);
      }
      return original.apply(context, args);
    });
    actionFunctions.forEach((name) =>
      wrap(name, (original, context, args) =>
        executeOrQueue("regular", original, context, args),
      ),
    );
    ["boss", "gboss"].forEach((name) =>
      wrap(name, (original, context, args) => {
        if (Number(args[0]) === 1) {
          return executeOrQueue("boss", original, context, args);
        }
        clearManualCombatCycle();
        beginNavigation(false, false);
        return original.apply(context, args);
      }),
    );

    const content = document.getElementById("content");
    if (content) {
      let focusFrame = 0;
      new MutationObserver(() => {
        if (navigating || queuedAction) renderQueue();
        if (focusFrame) window.cancelAnimationFrame(focusFrame);
        focusFrame = window.requestAnimationFrame(() => {
          focusFrame = 0;
          restorePrimaryActionFocus();
        });
      }).observe(content, { childList: true, subtree: true });
    }
    window.setTimeout(restorePrimaryActionFocus, 0);
    return true;
  }
  function projectedBufferLevel(level, bufferXp) {
    if (level < 1) return 1;
    const discriminant = (2 * level - 1) ** 2 + (8 * bufferXp) / 25;
    return Math.max(1, (1 + Math.sqrt(Math.max(0, discriminant))) / 2);
  }

  function parseCompactExperience(numberText, suffix = "") {
    const multipliers = {
      "": 1,
      k: 1_000,
      m: 1_000_000,
      b: 1_000_000_000,
      t: 1_000_000_000_000,
    };
    const number = Number(String(numberText).replace(/,/g, ""));
    const multiplier = multipliers[String(suffix).trim().toLowerCase()];
    return Number.isFinite(number) && multiplier
      ? Math.round(number * multiplier)
      : 0;
  }

  function parseActionXpText(value, rewardOnly = false) {
    const text = plainText(value);
    const match =
      text.match(/Money\s*:[\s\S]{0,200}?Exp\s*:\s*([\d,.]+)\s*([KMBT]?)\b/i) ||
      (!rewardOnly &&
        text.match(/(?:Exp|Experience)\s*:\s*([\d,.]+)\s*([KMBT]?)\b/i));
    return match ? parseCompactExperience(match[1], match[2]) : 0;
  }

  function findLatestActionXp() {
    for (const selector of [
      "#content",
      "#popupresponse",
      "#popup",
      "#rightinfo",
    ]) {
      const root = document.querySelector(selector);
      const exactActionXp = findExactRenderedActionXp(root);
      if (exactActionXp > 0) return exactActionXp;

      const actionXp = parseActionXpText(root?.textContent);
      if (actionXp > 0) return actionXp;
    }
    return 0;
  }

  function findExactRenderedActionXp(root) {
    if (!root) return 0;
    const titledValues = root.querySelectorAll(".text-center span[title]");
    for (const value of titledValues) {
      const label = value
        .querySelector("strong")
        ?.textContent.trim()
        .toLowerCase();
      if (label !== "exp:") continue;

      const actionXp = parseFormattedNumber(value.getAttribute("title"));
      if (actionXp > 0) return actionXp;
    }
    return 0;
  }

  function readDisplayedBufferState() {
    const level = parseFormattedNumber(
      document.getElementById("lvlli")?.textContent,
    );
    const tooltip = document
      .querySelector("#expli [data-tippy-content]")
      ?.getAttribute("data-tippy-content");
    const bufferMatch = String(tooltip || "").match(/^\s*([\d,]+)/);
    const bufferXp = bufferMatch ? parseFormattedNumber(bufferMatch[1]) : 0;
    return level > 0 && bufferXp >= 0 ? { level, bufferXp } : null;
  }

  function calculateBufferXpGain(previousState, level, bufferXp) {
    if (!previousState || level < previousState.level) return 0;

    const levelsGained = level - previousState.level;
    const spentOnLevels =
      levelsGained > 0
        ? (25 * levelsGained * (previousState.level + level - 1)) / 2
        : 0;
    const gainedXp = bufferXp - previousState.bufferXp + spentOnLevels;
    return Number.isFinite(gainedXp) && gainedXp > 0 ? Math.round(gainedXp) : 0;
  }

  function formatActionRate(actionXp, bufferLevel) {
    const change = actionXp / (25 * bufferLevel) - 1;
    const rounded = Math.abs(change) < 0.005 ? 0 : change;
    return `${rounded > 0 ? "+" : ""}${rounded.toFixed(2)} per action`;
  }

  let lastBufferState = null;

  function renderBufferXp(updateArguments) {
    const level = parseFormattedNumber(updateArguments[11]);
    const bufferXp = parseFormattedNumber(updateArguments[12]);
    const output = document.getElementById("expli");
    if (!level || !output) return;

    const projectedLevel = projectedBufferLevel(level, bufferXp);
    const endingLevel = Math.floor(projectedLevel + Number.EPSILON);
    const displayedActionXp = findLatestActionXp();
    const derivedActionXp = calculateBufferXpGain(
      lastBufferState,
      level,
      bufferXp,
    );
    const actionXp = displayedActionXp || derivedActionXp;
    lastBufferState = { level, bufferXp };
    const actionText =
      actionXp > 0 ? ` (${formatActionRate(actionXp, endingLevel)})` : "";

    const value = document.createElement("span");
    value.dataset.tippyContent = `${bufferXp.toLocaleString()}/${(25 * level).toLocaleString()} XP`;
    value.textContent = `${endingLevel.toLocaleString()}${actionText}`;
    output.replaceChildren(value);
  }

  function enforceRenderedBufferActionRate() {
    const output = document.getElementById("expli");
    if (!output) return;

    const content = document.getElementById("content");
    const actionXp =
      findExactRenderedActionXp(content) ||
      parseActionXpText(content?.textContent || content?.innerText, true);
    if (actionXp <= 0) return;

    const value = output.firstElementChild || output;
    const bufferLevelMatch = value.textContent.match(/^\s*([\d,]+)/);
    const bufferLevel = bufferLevelMatch
      ? parseFormattedNumber(bufferLevelMatch[1])
      : 0;
    if (bufferLevel <= 0) return;

    const expectedSuffix = `(${formatActionRate(actionXp, bufferLevel)})`;
    if (value.textContent.includes(expectedSuffix)) return;

    const baseText = value.textContent
      .replace(/\s*\([^)]*\sper action\)\s*$/i, "")
      .trim();
    value.textContent = `${baseText} ${expectedSuffix}`;
  }

  function initializeBufferXp() {
    if (!MODS.bufferXp) return true;
    if (window.updategems?.lyraniaBufferXpWrapperVersion === SCRIPT_VERSION)
      return true;
    if (
      typeof window.updategems !== "function" ||
      !document.getElementById("expli")
    )
      return false;

    lastBufferState = readDisplayedBufferState();
    const originalUpdateGems = window.updategems;
    const wrappedUpdateGems = async function (...args) {
      const result = await originalUpdateGems.apply(this, args);
      renderBufferXp(args);
      return result;
    };
    wrappedUpdateGems.lyraniaBufferXpWrapperVersion = SCRIPT_VERSION;
    window.updategems = wrappedUpdateGems;

    const content = document.getElementById("content");
    if (content) {
      let updateScheduled = false;
      new MutationObserver(() => {
        if (updateScheduled) return;
        updateScheduled = true;
        requestAnimationFrame(() => {
          updateScheduled = false;
          enforceRenderedBufferActionRate();
        });
      }).observe(content, {
        childList: true,
        characterData: true,
        subtree: true,
      });
    }
    enforceRenderedBufferActionRate();

    const label = document.getElementById("expli")?.previousElementSibling;
    if (label) label.textContent = "Buffer Level:";
    return true;
  }

  const LOOT_TYPES = Object.freeze({
    jade: "Jade",
    fragments: "Fragments",
    gold: "Currency",
    tokens: "Tokens",
    diamonds: "Diamonds",
    sapphires: "Sapphires",
    rubies: "Rubies",
    emeralds: "Emeralds",
    opals: "Opals",
    health: "Health",
    attack: "Attack",
    defence: "Defence",
    accuracy: "Accuracy",
    evasion: "Evasion",
  });

  function emptyLootTotals() {
    return Object.fromEntries(
      Object.keys(LOOT_TYPES).map((key) => [
        key,
        {
          total: 0,
          base: 0,
          bonus: 0,
          drops: 0,
        },
      ]),
    );
  }

  function getLootStorageKey() {
    const account = window.userId || window.username || "unknown-account";
    return `lyrania-mod-suite:loot-statistics:${account}`;
  }

  function newLootState() {
    return { version: 1, totalDrops: 0, loot: emptyLootTotals() };
  }

  function loadLootState() {
    const cleanState = newLootState();
    try {
      const saved = JSON.parse(localStorage.getItem(getLootStorageKey()));
      if (!saved || typeof saved !== "object") return cleanState;

      cleanState.totalDrops = Math.max(0, Number(saved.totalDrops) || 0);
      Object.keys(cleanState.loot).forEach((key) => {
        const values = saved.loot?.[key];
        if (!values) return;
        ["total", "base", "bonus", "drops"].forEach((field) => {
          cleanState.loot[key][field] = Math.max(0, Number(values[field]) || 0);
        });
      });
    } catch (error) {
      console.warn(
        `[${SCRIPT_ID}] Saved loot statistics could not be loaded.`,
        error,
      );
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
      total +=
        parseFormattedNumber(match[1]) * multipliers[match[2].toLowerCase()];
    }
    return total;
  }

  function detectLootType(text) {
    const lower = text.toLowerCase();
    if (lower.includes("jade")) return "jade";
    if (lower.includes("fragment")) return "fragments";
    if (lower.includes("diamond")) return "diamonds";
    if (lower.includes("sapphire")) return "sapphires";
    if (lower.includes("ruby") || lower.includes("rubies")) return "rubies";
    if (lower.includes("emerald")) return "emeralds";
    if (lower.includes("opal")) return "opals";
    return null;
  }

  function parseLootDrop(rawLine) {
    const text = plainText(rawLine).replace(/\s+/g, " ").trim();
    if (!text || /^welcome to lyrania!?$/i.test(text)) return null;
    const bonusMatch = text.match(
      /\(\s*([\d,]+)\s*\+\s*([\d,]+)\s+(?:level\s+)?bonus\s*\)/i,
    );

    const statMatch = text.match(
      /\bgained\s+([\d,]+)\s+(Health|Attack|Defence|Accuracy|Evasion)\b/i,
    );
    if (statMatch) {
      const amount = parseFormattedNumber(statMatch[1]);
      return {
        type: statMatch[2].toLowerCase(),
        base: bonusMatch
          ? parseFormattedNumber(bonusMatch[1])
          : Math.min(1, amount),
        bonus: bonusMatch
          ? parseFormattedNumber(bonusMatch[2])
          : Math.max(0, amount - 1),
        hasBonus: Boolean(bonusMatch),
      };
    }

    if (/\btoken(?:s| source)?\b/i.test(text)) {
      const tokenPatterns = [
        /\(([\d,]+)\s+token source\b/i,
        /\bfound\s+(?:an?\s+)?([\d,]+)\s+tokens?\b/i,
        /\b([\d,]+)\s+tokens?\b/i,
      ];
      for (const pattern of tokenPatterns) {
        const match = text.match(pattern);
        if (match) {
          return {
            type: "tokens",
            base: parseFormattedNumber(match[1]),
            bonus: 0,
            hasBonus: false,
          };
        }
      }
    }

    const containsCurrency =
      /\b(?:platinum|gold|silver|copper)\b|[\d,]+(?:\.\d+)?\s*[pgsc]\b/i.test(
        text,
      );
    if (containsCurrency) {
      const details = text.match(/\(([^)]*)\)/)?.[1] || text;
      const [basePart, ...bonusParts] = details.split("+");
      const base = parseCurrency(basePart);
      const bonus = parseCurrency(bonusParts.join(" "));
      if (base || bonus) {
        return {
          type: "gold",
          base,
          bonus,
          hasBonus: bonusParts.length > 0,
        };
      }
    }

    const lootType = detectLootType(text);
    if (lootType && bonusMatch) {
      return {
        type: lootType,
        base: parseFormattedNumber(bonusMatch[1]),
        bonus: parseFormattedNumber(bonusMatch[2]),
        hasBonus: true,
      };
    }

    if (lootType) {
      const itemNames = {
        jade: "jades?",
        fragments: "(?:jewel(?:lery)?\\s+)?fragments?",
        diamonds: "diamonds?",
        sapphires: "sapphires?",
        rubies: "rub(?:y|ies)",
        emeralds: "emeralds?",
        opals: "opals?",
      };
      const quantityMatch = text.match(
        new RegExp(
          `\\bfound\\s+(?:an?\\s+)?([\\d,]+)\\s+${itemNames[lootType]}\\b`,
          "i",
        ),
      );
      const singleMatch = text.match(
        new RegExp(`\\bfound\\s+an?\\s+${itemNames[lootType]}\\b`, "i"),
      );
      if (quantityMatch || singleMatch) {
        return {
          type: lootType,
          base: quantityMatch ? parseFormattedNumber(quantityMatch[1]) : 1,
          bonus: 0,
          hasBonus: false,
        };
      }
    }

    return null;
  }

  function parseLootLine(rawLine, state) {
    const drop = parseLootDrop(rawLine);
    return drop ? addLoot(state, drop.type, drop.base, drop.bonus) : false;
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

  function formatCompactLootLine(rawLine) {
    const drop = parseLootDrop(rawLine);
    if (drop) {
      const formatter =
        drop.type === "gold"
          ? formatCurrency
          : (value) => Number(value || 0).toLocaleString();
      const total = drop.base + drop.bonus;
      const breakdown = drop.hasBonus
        ? ` (${formatter(drop.base)}+${formatter(drop.bonus)})`
        : "";
      return `${LOOT_TYPES[drop.type]} - ${formatter(total)}${breakdown}`;
    }

    const fallback = plainText(rawLine)
      .replace(/\s+/g, " ")
      .replace(/^\s*\[\d{1,2}:\d{2}:\d{2}\]\s*/, "")
      .replace(/^you\s+(?:found|gained)\s+/i, "")
      .replace(/[!.]+\s*$/, "")
      .trim();
    return fallback || "Loot drop";
  }

  function renderLootStatistics(state) {
    const summary = document.getElementById(`${SCRIPT_ID}-loot-summary`);
    if (!summary) return;

    const expandedTypes = new Set(
      Array.from(summary.querySelectorAll(".lyrania-loot-stat[open]")).map(
        (item) => item.dataset.lootType,
      ),
    );
    const cards = Object.entries(LOOT_TYPES)
      .map(([key, label]) => {
        const entry = state.loot[key];
        const formatter =
          key === "gold" ? formatCurrency : (value) => value.toLocaleString();
        return `
                <details class="lyrania-loot-stat" data-loot-type="${key}"${expandedTypes.has(key) ? " open" : ""}>
                    <summary>
                        <span>${label}</span>
                        <strong>${formatter(entry.total)}</strong>
                    </summary>
                    <div class="lyrania-loot-stat-values">
                        <span><small>Base</small><b>${formatter(entry.base)}</b></span>
                        <span><small>Bonus</small><b>${formatter(entry.bonus)}</b></span>
                        <span><small>Drops</small><b>${entry.drops.toLocaleString()}</b></span>
                    </div>
                </details>`;
      })
      .join("");

    summary.innerHTML = `
            <div class="lyrania-loot-heading">
                <strong>Loot Statistics</strong>
                <button type="button" id="${SCRIPT_ID}-loot-reset">Reset</button>
            </div>
            <div class="lyrania-loot-total">Total tracked drops: ${state.totalDrops.toLocaleString()}</div>
            <div class="lyrania-loot-stat-grid">${cards}</div>`;

    document
      .getElementById(`${SCRIPT_ID}-loot-reset`)
      ?.addEventListener("click", () => {
        if (
          !window.confirm("Reset all saved loot statistics for this account?")
        )
          return;
        const resetState = newLootState();
        Object.assign(state, resetState);
        saveLootState(state);
        renderLootStatistics(state);
      });
  }

  function compactLootMessage(message) {
    if (
      !(message instanceof Element) ||
      !message.classList.contains("lootlogitem")
    ) {
      return message;
    }
    if (message.classList.contains("lyrania-loot-entry")) return message;

    const compact = document.createElement("div");
    Array.from(message.attributes).forEach(({ name, value }) => {
      compact.setAttribute(name, value);
    });
    compact.classList.add("lyrania-loot-entry");
    compact.textContent = formatCompactLootLine(message.textContent);
    message.replaceWith(compact);
    return compact;
  }

  function trimCompactLootMessages(messages, maximum = 100) {
    Array.from(messages.querySelectorAll(":scope > .lootlogitem"))
      .slice(maximum)
      .forEach((message) => message.remove());
  }

  function initializePersistentLootLog() {
    if (!MODS.persistentLootLog) return true;
    const lootLog = document.getElementById("lootlog");
    const chatTabs = document.getElementById("chattabs");
    const chatPanes = document.getElementById("chatpanes");
    const chatWindow = document.getElementById("chatwindow");
    const chatInput = document.getElementById("inputchat");
    const chatButton = document.getElementById("chatbutton");
    if (
      !lootLog ||
      !chatTabs ||
      !chatPanes ||
      !chatWindow ||
      !chatInput ||
      !chatButton ||
      typeof window.lootlog !== "function"
    )
      return false;
    if (window.lootlog.lyraniaPersistentLootWrapper) return true;

    lootLog.classList.add(`${SCRIPT_ID}-loot-layout`);
    chatTabs.classList.add(`${SCRIPT_ID}-chat-loot-split`);

    const chatColumn = document.createElement("section");
    chatColumn.id = `${SCRIPT_ID}-chat-column`;
    const composer = document.createElement("div");
    composer.id = `${SCRIPT_ID}-chat-composer`;
    chatPanes.insertBefore(chatColumn, chatWindow);
    composer.append(chatInput, chatButton);
    chatColumn.append(composer, chatWindow);

    const summary = document.createElement("section");
    summary.id = `${SCRIPT_ID}-loot-summary`;
    const messages = document.createElement("section");
    messages.id = `${SCRIPT_ID}-loot-messages`;

    Array.from(lootLog.children).forEach((child) => {
      messages.appendChild(compactLootMessage(child));
    });
    trimCompactLootMessages(messages);
    lootLog.append(summary, messages);

    const state = loadLootState();
    renderLootStatistics(state);

    const originalLootLog = window.lootlog;
    const wrappedLootLog = function (line) {
      const result = originalLootLog.apply(this, arguments);
      const newMessage = lootLog.querySelector(":scope > .lootlogitem");
      if (newMessage) {
        messages.prepend(compactLootMessage(newMessage));
        trimCompactLootMessages(messages);
      }

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

  const INVENTORY_TABS = Object.freeze([
    "jewellery",
    "enchants",
    "maps",
    "consumables",
    "resources",
    "misc",
  ]);
  const INITIAL_INVENTORY_DELAY_MS = 5000;
  const INITIAL_INVENTORY_FALLBACK_DELAY_MS = 8000;
  const INITIAL_INVENTORY_RETRY_DELAY_MS = 2500;
  let pendingInventoryScroll = null;
  let pendingInventoryPopupClose = false;
  let inventoryLoadWatchdog = 0;
  let initialInventoryRequestPending = false;
  let initialInventoryRetryUsed = false;
  let initialInventoryRetryTimer = 0;
  let activeInventoryRequest = null;
  let inventoryRequestSequence = 0;

  function normalizeInventoryTab(tab, fallback = "jewellery") {
    const normalized = String(tab || "").toLowerCase();
    return INVENTORY_TABS.includes(normalized) ? normalized : fallback;
  }

  function getPersistentInventoryElements() {
    return {
      dock: document.getElementById(`${SCRIPT_ID}-inventory-dock`),
      status: document.getElementById(`${SCRIPT_ID}-inventory-status`),
      refresh: document.getElementById(`${SCRIPT_ID}-inventory-refresh`),
      scroll: document.getElementById(`${SCRIPT_ID}-inventory-scroll`),
      content: document.getElementById(`${SCRIPT_ID}-inventory-content`),
    };
  }

  function getPersistentInventoryTab() {
    const shell = document.querySelector(
      `#${SCRIPT_ID}-inventory-content > #inventory_shell`,
    );
    return normalizeInventoryTab(shell?.dataset.currentTab);
  }

  function wrapIsolatedInventoryRequests() {
    if (!MODS.isolatedInventoryRequests) return true;
    const originalInventorySimple = window.inventorySimple;
    if (
      originalInventorySimple?.lyraniaIsolatedInventoryVersion ===
      SCRIPT_VERSION
    ) {
      return true;
    }
    if (typeof originalInventorySimple !== "function") return false;

    const antiRaceActions = new Set([
      "purchase_lockbox",
      "use_lockbox",
      "conjure_enchant",
      "add_jewel_mod",
      "add_jewel_mod_confirm",
      "map_trade",
    ]);

    const readValue = (id) => document.getElementById(id)?.value || "";
    const readChecked = (id) => Boolean(document.getElementById(id)?.checked);

    const wrappedInventorySimple = function (...args) {
      const action = String(args[1] || "");
      const actionCode = Number.parseInt(args[2], 10);
      const popupScroll = document.getElementById("popupresdisplay");
      const preservePopupScroll =
        args[0] === "enchants" && action === "enchant_table_state";
      const preservedPopupScrollTop = preservePopupScroll
        ? (popupScroll?.scrollTop ?? null)
        : null;

      if (action === "loadout" && actionCode === 1) {
        const loadoutName = window.prompt(
          "What would you like to call this loadout?",
        );
        if (!loadoutName) {
          window.setTimeout(() => window.inventorySimple("jewellery"), 0);
          return undefined;
        }
        args[3] = loadoutName;
        args[4] = readValue("pet");
      } else if (
        action === "loadout" &&
        (actionCode === 2 || actionCode === 3)
      ) {
        args[3] = readValue("loadout");
        args[4] = readValue("pet");
      }

      if (action === "use_lockbox") args[2] = readValue("lockboxquant");
      if (action === "purchase_lockbox")
        args[2] = readValue("buy_lockboxquant");
      if (action === "remove_enchant_confirm")
        args[3] = readChecked("enchantsavable");
      if (
        antiRaceActions.has(action) &&
        typeof window.lockInventoryActionButton === "function" &&
        !window.lockInventoryActionButton(action)
      ) {
        return undefined;
      }

      const body = new URLSearchParams({ tab: String(args[0] || "jewellery") });
      if (args[1] !== undefined) body.set("action", String(args[1]));
      for (let index = 2; index < args.length; index += 1) {
        if (args[index] !== undefined) {
          body.set(`extrainfo${index - 1}`, String(args[index]));
        }
      }

      inventoryRequestSequence += 1;
      const requestSequence = inventoryRequestSequence;
      if (
        activeInventoryRequest &&
        activeInventoryRequest.readyState !== XMLHttpRequest.DONE
      ) {
        activeInventoryRequest.abort();
      }

      const request = new XMLHttpRequest();
      activeInventoryRequest = request;
      request.open("POST", "inventory_simplified.php", true);
      request.timeout = 20000;
      request.setRequestHeader(
        "Content-Type",
        "application/x-www-form-urlencoded",
      );

      request.onload = () => {
        if (requestSequence !== inventoryRequestSequence) return;
        activeInventoryRequest = null;
        if (request.status < 200 || request.status >= 300) {
          setPersistentInventoryStatus(
            "Inventory request failed. Use Refresh to try again.",
          );
          return;
        }

        const responseParts = request.responseText.split("[BREAK]");
        if (
          window.popupui === 1 &&
          typeof window.openpopuppane === "function"
        ) {
          window.openpopuppane(responseParts[0]);
        } else {
          const content = document.getElementById("content");
          if (content) content.innerHTML = responseParts[0];
        }

        responseParts.slice(1).forEach((script) => {
          if (!script.trim()) return;
          try {
            window.eval(script);
          } catch (error) {
            console.error(
              `[${SCRIPT_ID}] Inventory response script failed.`,
              error,
            );
          }
        });

        if (typeof window.InventoryPageInit === "function")
          window.InventoryPageInit();
        if (
          args[0] === "consumables" &&
          typeof window.renderInventoryConsumableInlineResult === "function"
        ) {
          window.renderInventoryConsumableInlineResult();
        }

        const inventoryIsDocked = Boolean(
          document.querySelector(
            `#${SCRIPT_ID}-inventory-content > #inventory_shell`,
          ),
        );
        if (
          !inventoryIsDocked &&
          preservedPopupScrollTop !== null &&
          popupScroll
        ) {
          popupScroll.scrollTop = preservedPopupScrollTop;
        } else if (
          !inventoryIsDocked &&
          args[0] === "enchants" &&
          args[1] !== undefined &&
          popupScroll
        ) {
          popupScroll.scrollTo({ top: 0, behavior: "smooth" });
        }
      };

      const showRequestError = () => {
        if (requestSequence !== inventoryRequestSequence) return;
        activeInventoryRequest = null;
        setPersistentInventoryStatus(
          "Inventory request failed. Use Refresh to try again.",
        );
      };
      request.onerror = showRequestError;
      request.ontimeout = showRequestError;
      request.send(body.toString());
      return request;
    };

    wrappedInventorySimple.lyraniaIsolatedInventoryVersion = SCRIPT_VERSION;
    wrappedInventorySimple.lyraniaOriginalInventorySimple =
      originalInventorySimple;
    window.inventorySimple = wrappedInventorySimple;
    return true;
  }

  function setPersistentInventoryStatus(message, busy = false) {
    const { dock, status, refresh } = getPersistentInventoryElements();
    if (dock) dock.setAttribute("aria-busy", String(busy));
    if (status) status.textContent = message;
    if (refresh) refresh.disabled = busy;

    window.clearTimeout(inventoryLoadWatchdog);
    if (!busy) return;
    inventoryLoadWatchdog = window.setTimeout(() => {
      pendingInventoryPopupClose = false;
      pendingInventoryScroll = null;
      const current = getPersistentInventoryElements();

      if (initialInventoryRequestPending && !initialInventoryRetryUsed) {
        initialInventoryRetryUsed = true;
        current.dock?.setAttribute("aria-busy", "true");
        if (current.refresh) current.refresh.disabled = true;
        if (current.status) {
          current.status.textContent =
            "Inventory is still initializing. Retrying…";
        }
        window.clearTimeout(initialInventoryRetryTimer);
        initialInventoryRetryTimer = window.setTimeout(() => {
          requestInitialPersistentInventory(true);
        }, INITIAL_INVENTORY_RETRY_DELAY_MS);
        return;
      }

      initialInventoryRequestPending = false;
      current.dock?.setAttribute("aria-busy", "false");
      if (current.refresh) current.refresh.disabled = false;
      if (current.status) {
        current.status.textContent =
          "Inventory did not respond. Use Refresh to try again.";
      }
    }, 15000);
  }

  function createPersistentInventoryDock() {
    const holder = document.getElementById("holder");
    if (!holder) return null;

    let dock = document.getElementById(`${SCRIPT_ID}-inventory-dock`);
    if (dock) return dock;

    dock = document.createElement("aside");
    dock.id = `${SCRIPT_ID}-inventory-dock`;
    dock.setAttribute("aria-labelledby", `${SCRIPT_ID}-inventory-title`);
    dock.setAttribute("aria-busy", "true");
    dock.innerHTML = `
            <header id="${SCRIPT_ID}-inventory-bar">
                <span id="${SCRIPT_ID}-inventory-heading">
                    <span id="${SCRIPT_ID}-inventory-title-line">
                        <strong id="${SCRIPT_ID}-inventory-title">Inventory</strong>
                        <span id="${SCRIPT_ID}-inventory-status" role="status" aria-live="polite">
                            Waiting for the game to finish loading…
                        </span>
                    </span>
                </span>
                <button type="button" id="${SCRIPT_ID}-inventory-refresh">Refresh</button>
            </header>
            <div id="${SCRIPT_ID}-inventory-scroll">
                <div id="${SCRIPT_ID}-inventory-content"></div>
            </div>`;

    const chatRow = document.getElementById("chat_row");
    holder.insertBefore(dock, chatRow || null);
    holder.classList.add(`${SCRIPT_ID}-has-inventory-dock`);
    document.documentElement.classList.add(`${SCRIPT_ID}-persistent-inventory`);

    dock
      .querySelector(`#${SCRIPT_ID}-inventory-refresh`)
      ?.addEventListener("click", () => {
        if (typeof window.inventorySimple !== "function") return;
        window.inventorySimple(getPersistentInventoryTab());
      });
    return dock;
  }

  function hideInventoryPopupShell(force = false) {
    if (!force) return;
    const popupHolder = document.getElementById("popupholder");
    const popup = document.getElementById("popup");
    const response = document.getElementById("popupresponse");
    if (popupHolder) popupHolder.style.visibility = "hidden";
    if (popup) popup.replaceChildren();
    if (response) response.replaceChildren();
  }

  function restorePersistentInventoryScroll(scroll, content, tab, scrollTop) {
    scroll.scrollTop = scrollTop;
    if (tab !== "consumables") return;

    const result = content.querySelector("#inventory-consumable-inline-result");
    if (!result?.textContent.trim()) return;
    const scrollBounds = scroll.getBoundingClientRect();
    const resultBounds = result.getBoundingClientRect();
    scroll.scrollTop = Math.max(
      0,
      scroll.scrollTop + resultBounds.top - scrollBounds.top - 8,
    );
  }

  function mountPersistentInventoryShell(shell) {
    const { dock, status, refresh, scroll, content } =
      getPersistentInventoryElements();
    if (!dock || !scroll || !content || !shell) return false;

    const shellWasInPopup = Boolean(
      document.getElementById("popup")?.contains(shell),
    );
    const nextTab = normalizeInventoryTab(shell.dataset.currentTab);
    const restoreScroll =
      pendingInventoryScroll?.tab === nextTab ? pendingInventoryScroll.top : 0;
    pendingInventoryScroll = null;

    content.replaceChildren(shell);
    dock.dataset.currentTab = nextTab;
    dock.setAttribute("aria-busy", "false");
    if (status) status.textContent = "";
    if (refresh) refresh.disabled = false;
    window.clearTimeout(inventoryLoadWatchdog);
    window.clearTimeout(initialInventoryRetryTimer);
    initialInventoryRequestPending = false;

    const mainNav = document.getElementById("mainnav");
    if (mainNav) mainNav.value = "1";
    hideInventoryPopupShell(shellWasInPopup || pendingInventoryPopupClose);
    pendingInventoryPopupClose = false;

    requestAnimationFrame(() => {
      restorePersistentInventoryScroll(scroll, content, nextTab, restoreScroll);
    });
    document.dispatchEvent(
      new CustomEvent("lyraniaPersistentInventoryMounted", {
        detail: { tab: nextTab },
      }),
    );
    return true;
  }

  function routePersistentInventoryMarkup(markup) {
    if (typeof markup !== "string" || !markup.includes("inventory_shell"))
      return false;

    const template = document.createElement("template");
    template.innerHTML = markup.trim();
    return mountPersistentInventoryShell(
      template.content.querySelector("#inventory_shell"),
    );
  }

  function moveExistingInventoryShell() {
    const shell = document.querySelector(
      `#popup #inventory_shell, #content #inventory_shell`,
    );
    return shell ? mountPersistentInventoryShell(shell) : false;
  }

  function wrapInventoryPopupRouter() {
    const originalOpenPopupPane = window.openpopuppane;
    if (
      originalOpenPopupPane?.lyraniaPersistentInventoryRouterVersion ===
      SCRIPT_VERSION
    ) {
      return true;
    }
    if (typeof originalOpenPopupPane !== "function") return false;

    const wrappedOpenPopupPane = function (markup) {
      if (routePersistentInventoryMarkup(markup)) return undefined;
      return originalOpenPopupPane.apply(this, arguments);
    };
    wrappedOpenPopupPane.lyraniaPersistentInventoryRouterVersion =
      SCRIPT_VERSION;
    wrappedOpenPopupPane.lyraniaOriginalOpenPopupPane = originalOpenPopupPane;
    window.openpopuppane = wrappedOpenPopupPane;
    return true;
  }

  function wrapPersistentInventoryRequests() {
    const originalInventorySimple = window.inventorySimple;
    if (
      originalInventorySimple?.lyraniaPersistentInventoryVersion ===
      SCRIPT_VERSION
    ) {
      return true;
    }
    if (typeof originalInventorySimple !== "function") return false;

    const wrappedInventorySimple = function (...args) {
      const { scroll } = getPersistentInventoryElements();
      const currentTab = getPersistentInventoryTab();
      const requestedTab = normalizeInventoryTab(args[0], currentTab);
      pendingInventoryPopupClose = ["mainnav", "popupnav"].includes(
        document.activeElement?.id,
      );
      pendingInventoryScroll = {
        tab: requestedTab === currentTab ? currentTab : null,
        top: scroll?.scrollTop || 0,
      };
      setPersistentInventoryStatus(
        document.querySelector(
          `#${SCRIPT_ID}-inventory-content > #inventory_shell`,
        )
          ? "Refreshing inventory…"
          : "Loading inventory…",
        true,
      );

      try {
        return originalInventorySimple.apply(this, args);
      } catch (error) {
        pendingInventoryPopupClose = false;
        pendingInventoryScroll = null;
        setPersistentInventoryStatus(
          "Inventory could not be loaded. Use Refresh to try again.",
        );
        throw error;
      }
    };
    wrappedInventorySimple.lyraniaPersistentInventoryVersion = SCRIPT_VERSION;
    wrappedInventorySimple.lyraniaOriginalInventorySimple =
      originalInventorySimple;
    window.inventorySimple = wrappedInventorySimple;
    return true;
  }

  function requestInitialPersistentInventory(isRetry = false) {
    if (
      document.querySelector(
        `#${SCRIPT_ID}-inventory-content > #inventory_shell`,
      )
    ) {
      initialInventoryRequestPending = false;
      return;
    }
    if (typeof window.inventorySimple !== "function") {
      initialInventoryRequestPending = false;
      setPersistentInventoryStatus(
        "Inventory is unavailable. Use Refresh to try again.",
      );
      return;
    }
    if (!isRetry) initialInventoryRetryUsed = false;
    initialInventoryRequestPending = true;
    window.inventorySimple("jewellery");
  }

  function initializePersistentInventory() {
    if (!MODS.persistentInventory) return true;
    if (!createPersistentInventoryDock()) return false;
    if (!wrapInventoryPopupRouter() || !wrapPersistentInventoryRequests())
      return false;
    if (moveExistingInventoryShell()) return true;

    let requested = false;
    const requestOnce = () => {
      if (requested) return;
      requested = true;
      requestInitialPersistentInventory();
    };
    document.addEventListener(
      "battleContentLoaded",
      () => {
        window.setTimeout(requestOnce, INITIAL_INVENTORY_DELAY_MS);
      },
      { once: true },
    );
    window.setTimeout(requestOnce, INITIAL_INVENTORY_FALLBACK_DELAY_MS);
    return true;
  }

  function initializePopupOutsideClose() {
    if (!MODS.popupOutsideClose) return true;
    const handlerAttribute = "data-lyrania-popup-outside-close-version";
    if (
      document.documentElement.getAttribute(handlerAttribute) === SCRIPT_VERSION
    )
      return true;

    let pointerStartedOutside = false;

    const getVisiblePopup = () => {
      const holder = document.getElementById("popupholder");
      if (!holder || getComputedStyle(holder).visibility !== "visible")
        return null;

      const hasPopupContent = ["popup", "popupresponse"].some((id) => {
        const node = document.getElementById(id);
        return node && (node.childElementCount > 0 || node.textContent.trim());
      });
      return hasPopupContent ? holder : null;
    };

    const isInventoryDockTarget = (target) =>
      target instanceof Element &&
      Boolean(target.closest(`#${SCRIPT_ID}-inventory-dock`));

    const closeVisiblePopup = () => {
      const holder = getVisiblePopup();
      if (!holder) return false;
      if (typeof window.closepage === "function") {
        window.closepage();
      } else {
        holder.style.visibility = "hidden";
      }
      return true;
    };

    document.addEventListener(
      "pointerdown",
      (event) => {
        const holder = getVisiblePopup();
        pointerStartedOutside = Boolean(
          holder &&
          event.button === 0 &&
          !holder.contains(event.target) &&
          !isInventoryDockTarget(event.target),
        );
      },
      true,
    );

    document.addEventListener(
      "pointercancel",
      () => {
        pointerStartedOutside = false;
      },
      true,
    );

    document.addEventListener(
      "click",
      (event) => {
        const holder = getVisiblePopup();
        const shouldClose =
          pointerStartedOutside &&
          holder &&
          !holder.contains(event.target) &&
          !isInventoryDockTarget(event.target);
        pointerStartedOutside = false;
        if (!shouldClose) return;

        event.preventDefault();
        event.stopImmediatePropagation();
        closeVisiblePopup();
      },
      true,
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape" || !getVisiblePopup()) return;
        event.preventDefault();
        closeVisiblePopup();
      },
      true,
    );

    document.documentElement.setAttribute(handlerAttribute, SCRIPT_VERSION);
    return true;
  }

  function enhanceDungeonMap() {
    const container = document.getElementById("dungeonmapcontainer");
    const labels =
      container?.parentElement?.querySelectorAll(".dungeonmapRoomType") || [];
    if (!container || labels.length < 4) return false;

    const rooms = container.querySelectorAll(".map_room_moblist_grid");
    if (!rooms.length) return false;
    container.classList.add("lyrania-dungeon-summary");
    const totals = { mobs: 0, regular: 0, challenge: 0, empty: 0 };

    rooms.forEach((room) => {
      const mobs = Number.parseInt(room.textContent, 10) || 0;
      totals.mobs += mobs;
      if (mobs <= 0) totals.empty += 1;
      else if (room.classList.contains("maproom_challenge_room"))
        totals.challenge += 1;
      else if (room.classList.contains("maproom_regular_room"))
        totals.regular += 1;
    });

    const summaries = [
      ["Mobs Left", totals.mobs],
      ["Regular Rooms", totals.regular],
      ["Challenge Rooms", totals.challenge],
      ["Empty Rooms", totals.empty],
    ];
    summaries.forEach(([name, total], index) => {
      labels[index].textContent = `${name} (${total})${index < 3 ? " | " : ""}`;
    });

    container.querySelectorAll("img").forEach((image) => {
      const pathname = new URL(image.src, window.location.href).pathname;
      const isChest = /\/(?:open-)?chest\.svg$/.test(pathname);
      if (!isChest) image.style.opacity = "0";
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

    observer.observe(document.getElementById("popup") || document.body, {
      childList: true,
      subtree: true,
    });
    window.setTimeout(() => observer.disconnect(), 15000);
  }

  function initializeDungeonMapSummary() {
    if (!MODS.dungeonMapSummary) return true;
    if (window.dungeonmap?.lyraniaDungeonMapSummaryWrapper) return true;
    if (typeof window.dungeonmap !== "function") return false;

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
    const match = String(version || "")
      .trim()
      .match(/^\d+(?:\.\d+)*$/);
    return match ? match[0].split(".").map(Number) : null;
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
      return saved && typeof saved === "object" ? saved : {};
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
      if (localStorage.getItem(UPDATE_DISMISSED_STORAGE_KEY) === latestVersion)
        return;
    } catch (_error) {
      // Continue without persisted dismissal state.
    }
    if (document.getElementById(`${SCRIPT_ID}-update-banner`)) return;

    const banner = document.createElement("aside");
    banner.id = `${SCRIPT_ID}-update-banner`;
    banner.setAttribute("role", "status");
    banner.innerHTML = `
            <strong>${SCRIPT_NAME} update available</strong>
            <div>Version ${latestVersion} is available. You have ${SCRIPT_VERSION}.</div>
            <a href="${SCRIPT_DOWNLOAD_URL}" target="_blank" rel="noopener noreferrer">Install update</a>
        `;
    const dismissButton = createButton("Later");
    dismissButton.addEventListener("click", () => {
      try {
        localStorage.setItem(UPDATE_DISMISSED_STORAGE_KEY, latestVersion);
      } catch (_error) {
        // The banner can still be dismissed for the current page.
      }
      banner.remove();
    });

    banner.appendChild(dismissButton);
    document.body.appendChild(banner);

    if (
      document.hidden &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      const notification = new Notification(`${SCRIPT_NAME} update`, {
        body: `Version ${latestVersion} is ready to install.`,
        icon: "https://lyrania.co.uk/favicon.ico",
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
      const response = await fetch(
        `${SCRIPT_DOWNLOAD_URL}?update-check=${Date.now()}`,
        {
          cache: "no-store",
          credentials: "omit",
        },
      );
      if (!response.ok)
        throw new Error(`GitHub returned HTTP ${response.status}`);

      const source = await response.text();
      const versionMatch = source.match(/^\/\/\s*@version\s+([^\s]+)\s*$/m);
      if (!versionMatch || !parseVersion(versionMatch[1])) {
        throw new Error(
          "The published userscript has no valid @version value.",
        );
      }

      const latestVersion = versionMatch[1];
      writeUpdateCheckState({ checkedAt: Date.now(), latestVersion });
      showModUpdateNotification(latestVersion);
    } catch (error) {
      writeUpdateCheckState({ ...state, checkedAt: Date.now() });
      console.warn(
        `[${SCRIPT_ID}] Could not check GitHub for an update.`,
        error,
      );
    }
  }

  const initializers = [
    initializeChatMods,
    initializeTripleDpHour,
    initializeKillsPerHour,
    initializeInactiveDpTimerHider,
    initializeBufferXp,
    initializePersistentLootLog,
    wrapIsolatedInventoryRequests,
    initializePersistentInventory,
    initializePopupOutsideClose,
    initializeDungeonMapSummary,
    initializeActionTimerFix,
  ];

  try {
    if (!initializeGameVersionCompatibility()) {
      console.warn(
        `[${SCRIPT_ID}] Lyrania ${GAME_VERSION} compatibility could not initialize.`,
      );
    }
  } catch (error) {
    console.error(
      `[${SCRIPT_ID}] Lyrania ${GAME_VERSION} compatibility failed to initialize.`,
      error,
    );
  }

  loadRemoteTheme();
  initializers.forEach((initializeMod) => {
    try {
      if (!initializeMod()) {
        console.warn(
          `[${SCRIPT_ID}] ${initializeMod.name} could not initialize.`,
        );
      }
    } catch (error) {
      console.error(
        `[${SCRIPT_ID}] ${initializeMod.name} failed to initialize.`,
        error,
      );
    }
  });

  checkForModUpdate();
  window.setInterval(checkForModUpdate, UPDATE_CHECK_INTERVAL_MS);
})();
