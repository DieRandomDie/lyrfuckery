// ==UserScript==
// @name         Lyrania Mod Suite
// @namespace    https://lyrania.co.uk/
// @version      2.25.3
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
    // Moves status information into the header and groups its navigation.
    compactHeader: true,

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

    // Keeps all six simplified-inventory tabs in a permanent responsive panel.
    persistentInventory: true,

    // Gives inventory its own request so it cannot interrupt battle actions.
    isolatedInventoryRequests: true,

    // Condenses battle results without removing live counters or controls.
    compactBattleResults: true,

    // Places menu content beside Equipment instead of over the game.
    inlinePopupDock: true,

    // Summarizes dungeon rooms and hides non-chest map icons.
    dungeonMapSummary: true,
  });

  const SCRIPT_ID = "lyrania-chat-enhancements";
  const SCRIPT_NAME = "Lyrania Mod Suite";
  const SCRIPT_VERSION = "2.25.3";
  const SCRIPT_DOWNLOAD_URL =
    "https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-mod-suite.user.js";
  const REMOTE_THEME_URL =
    "https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-modern-responsive-theme.css?v=1.10.2";
  const REQUIRED_THEME_VERSION = "1.10.2";
  const REMOTE_THEME_CACHE_KEY = "lyrania-mod-suite:remote-theme-cache";
  const CHAT_SETTINGS_STORAGE_KEY =
    "lyrania-mod-suite:chat-channel-settings";
  const MENU_SELECTION_STORAGE_KEY =
    "lyrania-mod-suite:last-menu-selection";
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

  function initializeCurrentGameLayout() {
    // This release supports the current Lyrania 4 Classic layout only.
    if (GAME_MAJOR_VERSION !== 4 || document.body.dataset.hubLayout !== "classic")
      return false;
    document.documentElement.dataset.lyraniaGameVersion = GAME_VERSION;
    document.documentElement.dataset.lyraniaGameMajor = "4";

    const holder = document.getElementById("holder");
    const gameRow = document.getElementById("middlesection");
    const chatRow = document.getElementById("chat_row");
    if (!holder || !gameRow || !chatRow) return false;

    if (gameRow.parentElement !== holder) holder.appendChild(gameRow);
    if (chatRow.parentElement !== holder) holder.appendChild(chatRow);

    return true;
  }

  function initializeCompactHeader() {
    if (!MODS.compactHeader) return true;
    if (
      document.documentElement.classList.contains(
        `${SCRIPT_ID}-compact-header`,
      )
    )
      return true;

    const header = document.getElementById("header");
    const headerRow = header?.querySelector(":scope > .lrow");
    const middleSection = document.getElementById("middlesection");
    const statusPanel = document.getElementById("side1");
    const menuBox = headerRow?.querySelector(".headernav");
    const gemBox = document
      .getElementById("diamondsli2")
      ?.closest(".headerbox");
    const statBox = document.getElementById("Healthli")?.closest(".headerbox");
    if (
      !header ||
      !headerRow ||
      !middleSection ||
      !statusPanel ||
      !menuBox ||
      !gemBox ||
      !statBox
    ) {
      return false;
    }

    const characterBox = document.getElementById("tour-identity") ||
      document.getElementById("usernameli")?.closest(".headerbox");
    const resourcesBox = document.getElementById("tour-currencies") ||
      document.getElementById("goldli")?.closest(".headerbox");
    if (!characterBox || !resourcesBox) return false;

    const serverTime = document.getElementById("serverTime");
    const serverSection = [...statusPanel.children].find((section) =>
      section.contains(serverTime),
    );
    const jobsSection = document.getElementById("tstimers");
    const accountSection = document.getElementById("usersmartinfo");
    const bonusSection = document.getElementById("bonusdisplays");
    const countSection = document.getElementById("sidecounter");
    const questSection = document.getElementById("questtracker");
    const weeklyGdp = document.getElementById("weeklygdpword");
    if (
      !serverSection ||
      !jobsSection ||
      !bonusSection ||
      !countSection ||
      !questSection
    ) {
      return false;
    }

    const links = [...menuBox.querySelectorAll("a")];
    const usedLinks = new Set();
    const takeLink = ([label, hrefNeedle = "", id = ""]) => {
      const expectedText = label.toLowerCase();
      const link = links.find((candidate) => {
        if (usedLinks.has(candidate)) return false;
        const text = candidate.textContent
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();
        const href = (candidate.getAttribute("href") || "").toLowerCase();
        return (
          (id && candidate.id === id) ||
          text === expectedText ||
          text.startsWith(`${expectedText}:`) ||
          (hrefNeedle && href.includes(hrefNeedle))
        );
      });
      if (link) usedLinks.add(link);
      return link || null;
    };

    const menuLayout = [
      ["Stats", [["Players Online", "openpage(1,0"], ["Rankings", "rankings("]]],
      ["Community", [["Official Wiki"], ["Discord", "discord"]]],
      ["Game", [["Token Shop", "purchase("], ["Updates", "openpage(3,0"]]],
      ["Chat", [["Commands", "openpage(5,0"], ["Rules", "openpage(4,0"]]],
      ["Info", [["FAQ", "faq("], ["Polls", "polls(", "polls"]]],
      ["Account", [["Problem?!", "openpage(11"], ["Logout", "index.php"]]],
    ];
    const menuGroups = menuLayout.map(([label, entries]) => ({
      label,
      links: entries.map(takeLink),
    }));

    const remainingLinks = links.filter((link) => !usedLinks.has(link));
    if (remainingLinks.length) {
      menuGroups.push({ label: "More", links: remainingLinks });
    }

    const panel = document.createElement("div");
    panel.id = `${SCRIPT_ID}-header-menu-panel`;
    panel.setAttribute("aria-label", "Game menu");

    menuGroups.forEach(({ label, links: groupLinks }) => {
      const availableLinks = groupLinks.filter(Boolean);
      if (!availableLinks.length) return;

      const group = document.createElement("span");
      group.className = "cc-nav-group";
      const groupLabel = document.createElement("span");
      groupLabel.className = "cc-nav-group-label";
      groupLabel.textContent = `${label}:`;
      group.append(groupLabel, document.createTextNode(" "));
      availableLinks.forEach((link, index) => {
        if (index) {
          const divider = document.createElement("span");
          divider.className = "cc-nav-divider";
          divider.textContent = " | ";
          group.appendChild(divider);
        }
        group.appendChild(link);
      });
      panel.appendChild(group);
    });

    menuBox.replaceChildren(panel);

    const compactQuest = () => {
      const questLink = questSection.querySelector("a");
      const progress = questSection.querySelector("#questupdateid");
      if (!questLink || !progress) return;
      const rawProgress = progress.textContent.trim();
      const ratio = rawProgress.match(/([\d,]+)\s*\/\s*([\d,]+)/);
      let percentage = 0;
      if (ratio) {
        const current = Number(ratio[1].replace(/,/g, ""));
        const total = Number(ratio[2].replace(/,/g, ""));
        if (total > 0) percentage = Math.min(100, Math.max(0, current / total * 100));
      } else if (/hand\s*in|complete/i.test(rawProgress)) {
        percentage = 100;
      }
      // Keep the native target intact so updategems() can still write to it.
      // Observe that raw value, but display only the derived percentage.
      questObserver.disconnect();
      try {
        progress.hidden = true;
        progress.style.setProperty("display", "none", "important");
        let label = questLink.querySelector(".lyrania-quest-progress-label");
        if (!label) {
          label = document.createElement("span");
          label.className = "lyrania-quest-progress-label";
        }
        label.textContent = "Quest Progress: " + Number(percentage.toFixed(1)) + "%";
        questLink.replaceChildren(label, progress);
      } finally {
        questObserver.observe(questSection, {
          childList: true, characterData: true, subtree: true,
        });
      }
    };
    const questObserver = new MutationObserver(compactQuest);
    compactQuest();

    if (accountSection) serverSection.appendChild(accountSection);
    jobsSection.appendChild(questSection);
    const housingSection = document.getElementById("usershousinginfo");
    if (housingSection) serverSection.appendChild(housingSection);
    // Keep future status widgets visible instead of creating implicit grid rows.
    [...statusPanel.children].forEach((section) => {
      if (![serverSection, jobsSection, bonusSection, countSection].includes(section))
        jobsSection.appendChild(section);
    });
    if (weeklyGdp) countSection.insertBefore(weeklyGdp, countSection.firstChild);

    serverSection.classList.add(`${SCRIPT_ID}-status-server`);
    jobsSection.classList.add(`${SCRIPT_ID}-status-jobs`);
    bonusSection.classList.add(`${SCRIPT_ID}-status-bonuses`);
    countSection.classList.add(`${SCRIPT_ID}-status-counts`);

    characterBox.classList.add(`${SCRIPT_ID}-header-character`);
    resourcesBox.classList.add(`${SCRIPT_ID}-header-resources`);
    gemBox.classList.add(`${SCRIPT_ID}-header-removed`);
    statBox.classList.add(`${SCRIPT_ID}-header-removed`);
    statusPanel.classList.add(`${SCRIPT_ID}-header-status`);
    menuBox.classList.add(`${SCRIPT_ID}-header-menu`);
    headerRow.classList.add(`${SCRIPT_ID}-compact-header-row`);
    middleSection.classList.add(`${SCRIPT_ID}-without-side-info`);
    headerRow.insertBefore(statusPanel, menuBox);
    document.documentElement.classList.add(`${SCRIPT_ID}-compact-header`);
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

  function isMatchingTheme(css) {
    return typeof css === "string" &&
      css.includes("Version: " + REQUIRED_THEME_VERSION) && css.includes("--lyr-bg-0:");
  }

  async function loadRemoteTheme() {
    // Cache only a stylesheet that declares the required version.
    let cachedCss = "";
    try {
      const cached = JSON.parse(localStorage.getItem(REMOTE_THEME_CACHE_KEY));
      if (cached?.url === REMOTE_THEME_URL && isMatchingTheme(cached.css))
        cachedCss = cached.css;
    } catch (_) { /* Storage is optional. */ }
    try {
      const response = await fetch(REMOTE_THEME_URL, {
        cache: "no-cache", credentials: "omit", signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error("Theme HTTP " + response.status);
      const css = await response.text();
      if (!isMatchingTheme(css)) throw new Error("Expected CSS " + REQUIRED_THEME_VERSION + "; received " + (css.match(/Version:\s*([^\s*]+)/)?.[1] || "an unrecognized stylesheet") + ".");
      if (!installRemoteTheme(css)) throw new Error("Invalid theme stylesheet.");
      try {
        localStorage.setItem(REMOTE_THEME_CACHE_KEY, JSON.stringify({url: REMOTE_THEME_URL, css}));
      } catch (_) { /* Installed theme still works. */ }
      return true;
    } catch (error) {
      if (cachedCss && installRemoteTheme(cachedCss)) return true;
      console.warn("[" + SCRIPT_ID + "] Theme could not load; native layout retained.", error);
      const notice = document.createElement("div");
      notice.setAttribute("role", "alert");
      notice.textContent = "Lyrania Mod Suite requires CSS " + REQUIRED_THEME_VERSION + ". " +
        (error?.message || String(error)) + " You can load the matching separate CSS file below. ";
      notice.style.cssText = "position:fixed;bottom:12px;left:12px;right:12px;z-index:2147483647;padding:14px;background:#111;color:#fff;border:1px solid #aaa;font:16px/1.5 sans-serif";
      const localFile = document.createElement("input");
      localFile.type = "file";
      localFile.accept = ".css,text/css";
      localFile.setAttribute("aria-label", "Load local CSS");
      const fileStatus = document.createElement("span");
      localFile.addEventListener("change", async () => {
        try {
          const file = localFile.files[0];
          if (!file) return;
          const css = await file.text();
          if (!isMatchingTheme(css)) throw new Error("Select theme " + REQUIRED_THEME_VERSION + ".");
          localStorage.setItem(REMOTE_THEME_CACHE_KEY, JSON.stringify({url: REMOTE_THEME_URL, css}));
          location.reload();
        } catch (failure) {
          fileStatus.textContent = " Local CSS could not be saved: " + failure.message;
        }
      });
      notice.append(localFile, fileStatus);
      document.body.appendChild(notice);
      return false;
    }
  }

  function normalizeChannelLabel(label) {
    const trimmed = label.trim();
    return CHANNEL_LABELS[trimmed] || trimmed;
  }

  function readChatChannelSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem(CHAT_SETTINGS_STORAGE_KEY));
      if (!saved || saved.version !== 1) return null;
      return {
        selectedChannel:
          typeof saved.selectedChannel === "string"
            ? saved.selectedChannel
            : "all",
        enabledChannels: Array.isArray(saved.enabledChannels)
          ? saved.enabledChannels.map(String)
          : [],
        showGlobalChat: saved.showGlobalChat !== false,
      };
    } catch (_error) {
      return null;
    }
  }

  function saveChatChannelSettings() {
    try {
      localStorage.setItem(
        CHAT_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          version: 1,
          selectedChannel,
          enabledChannels: [...enabledAllChannels].sort(),
          showGlobalChat,
        }),
      );
    } catch (_error) {
      // The chat controls still work for this page when storage is unavailable.
    }
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
    const isGreenSystemNotice = line.querySelector(
      '[style*="color:#00FF00" i]',
    );
    const lowerText = text.toLowerCase();
    if (
      isGreenSystemNotice &&
      (lowerText.includes("your mechanical cartography tools") ||
        lowerText.includes("auto battle was inactive"))
    ) {
      return true;
    }

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
      // Keep actionable boss/contract notices visible even with Globals off.
      const hasAllowedGlobalLink = [...line.querySelectorAll("a[href]")].some((link) => {
        const href = (link.getAttribute("href") || "").replace(/\s+/g, "").toLowerCase();
        return /^javascript:(?:performnav\(9\)|contract\(\));?$/.test(href);
      });
      if (hasAllowedGlobalLink) return true;
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

    const savedSettings = readChatChannelSettings();
    const savedEnabledChannels = new Set(savedSettings?.enabledChannels || []);
    enabledAllChannels.clear();
    showGlobalChat = savedSettings?.showGlobalChat ?? true;
    const availableChannels = new Set([
      "all",
      "global",
      "w",
      ...channels.map(({ value }) => value),
    ]);
    selectedChannel = availableChannels.has(savedSettings?.selectedChannel)
      ? savedSettings.selectedChannel
      : "all";
    const initialChannelState = (value, fallback) =>
      savedSettings ? savedEnabledChannels.has(value) : fallback;

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
      saveChatChannelSettings();
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
        saveChatChannelSettings();
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
        saveChatChannelSettings();
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
      const nativeDefault = NATIVE_CHAT_CONTROLS[value]
        ? isNativeChatEnabled(value)
        : true;
      const enabled = initialChannelState(value, nativeDefault);
      if (enabled) ensureNativeChatEnabled(value);
      addChannelRow(value, label, enabled);
    });

    numberedChannels.forEach(({ value, label }) => {
      addChannelRow(value, label, initialChannelState(value, true));
    });

    addChannelRow("w", "Whispers", true, "lyrania-special-row", false);
    ensureNativeChatEnabled("global");
    addChannelRow("global", "Global Chat", showGlobalChat);

    chatRow.classList.add(`${SCRIPT_ID}-layout`);
    chatRow.insertBefore(sidebar, chatRow.firstChild);
    channelSelect.hidden = true;

    const chat = document.getElementById("chat");
    if (chat) {
      const sidebarLayout = window.matchMedia("(min-width: 800px)");
      const constrainSidebarHeight = () => {
        if (!sidebarLayout.matches) {
          sidebar.style.removeProperty("height");
          sidebar.style.removeProperty("max-height");
          return;
        }
        const availableHeight = Math.max(
          100,
          Math.floor(chat.getBoundingClientRect().height - 10),
        );
        sidebar.style.height = `${availableHeight}px`;
        sidebar.style.maxHeight = `${availableHeight}px`;
      };
      constrainSidebarHeight();
      new ResizeObserver(constrainSidebarHeight).observe(chat);
      sidebarLayout.addEventListener("change", constrainSidebarHeight);
    }
    channelSelect.value = ["all", "global"].includes(selectedChannel)
      ? "0"
      : selectedChannel;
    if (!channelSelect.value) {
      selectedChannel = "all";
      channelSelect.value = "0";
    } else if (!["all", "global"].includes(selectedChannel)) {
      ensureNativeChatEnabled(selectedChannel);
    }
    setSelectedButton(sidebar);
    saveChatChannelSettings();
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

  function getQuickMenuPlayerName(chatName) {
    const whisperLink = chatName.closest("a[href]");
    const whisperTarget = (whisperLink?.getAttribute("href") || "").match(
      /whisper\s*\(\s*["']([^"']+)["']\s*\)/i,
    )?.[1];
    if (whisperTarget?.trim()) return whisperTarget.trim();

    return chatName.textContent
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^(?:(?:owner|mod|community|admin)\s+)+/i, "")
      .trim();
  }

  function openQuickMenu(chatName) {
    closeQuickMenu();

    const playerName = getQuickMenuPlayerName(chatName);
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

    const menuHost =
      chatName.closest("#chat_row") || document.getElementById("chat_row");
    (menuHost || document.body).appendChild(menu);
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
  let inventoryLoadWatchdog = 0;
  let initialInventoryRequestPending = false;
  let initialInventoryRetryUsed = false;
  let initialInventoryRetryTimer = 0;
  let activeInventoryRequest = null;
  const inventoryRequestQueue = [];
  function dispatchNextInventoryRequest() {
    if (activeInventoryRequest || !inventoryRequestQueue.length) return;
    inventoryRequestQueue.shift()();
  }

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
        if (!activeInventoryRequest && !inventoryRequestQueue.length)
          setPersistentInventoryStatus("Action is already pending. Please wait.");
        return undefined;
      }

      const body = new URLSearchParams({ tab: String(args[0] || "jewellery") });
      if (args[1] !== undefined) body.set("action", String(args[1]));
      for (let index = 2; index < args.length; index += 1) {
        if (args[index] !== undefined) {
          body.set(`extrainfo${index - 1}`, String(args[index]));
        }
      }
      body.set(
        "csrf_token",
        typeof window.lyrCsrfToken !== "undefined"
          ? String(window.lyrCsrfToken)
          : "",
      );

      const requestScroll = pendingInventoryScroll;
      const request = new XMLHttpRequest();
      request.open("POST", "inventory_simplified.php", true);
      request.timeout = 20000;
      request.setRequestHeader(
        "Content-Type",
        "application/x-www-form-urlencoded",
      );

      request.onload = () => {
        if (request.status < 200 || request.status >= 300) {
          inventoryRequestQueue.length = 0;
          setPersistentInventoryStatus(
            action ? "Inventory action response unavailable. Refresh to verify the result before trying the action again." : "Inventory request failed. Use Refresh to try again.",
          );
          return;
        }

        pendingInventoryScroll = requestScroll;
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
        inventoryRequestQueue.length = 0;
        setPersistentInventoryStatus(
          action ? "Inventory action response unavailable. Refresh to verify the result before trying the action again." : "Inventory request failed. Use Refresh to try again.",
        );
      };
      request.onerror = showRequestError;
      request.ontimeout = showRequestError;
      request.onloadend = () => {
        activeInventoryRequest = null;
        const elements = getPersistentInventoryElements();
        if (elements.dock) elements.dock.setAttribute("aria-busy", "false");
        if (elements.refresh) elements.refresh.disabled = false;
        dispatchNextInventoryRequest();
      };
      inventoryRequestQueue.push(() => {
        activeInventoryRequest = request;
        setPersistentInventoryStatus(action ? "Applying inventory action…" : "Loading inventory…", true);
        try {
          request.send(body.toString());
        } catch (error) {
          activeInventoryRequest = null;
          showRequestError();
          dispatchNextInventoryRequest();
          console.error("[" + SCRIPT_ID + "] Inventory request could not start.", error);
        }
      });
      dispatchNextInventoryRequest();
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
    if (!busy || MODS.isolatedInventoryRequests) return;
    inventoryLoadWatchdog = window.setTimeout(() => {
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
    // Lyrania exempts .lrow descendants from its outside-popup close handler.
    // Marking the dock as part of that workspace keeps inventory clicks from
    // clearing the independently retained menu pane.
    dock.classList.add("lrow");
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
    hideInventoryPopupShell(shellWasInPopup);

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
      pendingInventoryScroll = {
        tab: requestedTab === currentTab ? currentTab : null,
        top: scroll?.scrollTop || 0,
      };
      if (!MODS.isolatedInventoryRequests) {
        setPersistentInventoryStatus("Loading inventory…", true);
      }

      try {
        return originalInventorySimple.apply(this, args);
      } catch (error) {
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

  function compactBattleResults() {
    const content = document.getElementById("content");
    if (!content) return false;

    const battle = content.querySelector(".battleContainer");
    content.classList.toggle(
      `${SCRIPT_ID}-compact-battle-results`,
      Boolean(battle),
    );
    if (!battle) return false;

    content.querySelectorAll("strong").forEach((label) => {
      const text = label.textContent.trim().toLowerCase();
      if (text === "dealt") label.textContent = "Dmg";
      if (text === "taken") label.textContent = "Took";
    });

    const lines = content.querySelectorAll(
      ".flex-content > .text-center, .flex-content > .strong.text-center, .treausry_payout",
    );
    lines.forEach((line) => {
      const text = line.textContent.replace(/\s+/g, " ").trim();
      const setCompactText = (value) => {
        const details = [...line.querySelectorAll("[title]")]
          .map((element) => element.title.trim())
          .filter(Boolean);
        line.title = details.join(" · ") || text;
        line.textContent = value;
      };
      let match;

      const autos = line.querySelector("#autosLeft");
      const mobs = line.querySelector("#mobsLeft");
      if (autos && mobs) {
        if (!text.startsWith("Auto ·")) {
          line.replaceChildren("Auto · ", autos, " fights · ", mobs, " mobs");
        }
        return;
      }

      const bonus = line.querySelector(".bonus");
      if (bonus && text.startsWith("***")) {
        const time = text.match(/\(([^)]+?)(?:\s+left)?\)/i)?.[1];
        line.replaceChildren(bonus, time ? ` · ${time}` : "");
        return;
      }

      const dpProc = line.querySelector(".pet_proc");
      if (dpProc && /dungeon points active/i.test(text)) {
        const multiplier =
          text.match(/\b(double|triple|quad(?:ruple)?|decuple)\b/i)?.[1] ||
          "Bonus";
        const multiplierLabels = {
          double: "2×",
          triple: "3×",
          quad: "4×",
          quadruple: "4×",
          decuple: "10×",
        };
        const time = text.match(/\(([^)]+?)(?:\s+left)?\)/i)?.[1];
        dpProc.textContent = `${multiplierLabels[multiplier.toLowerCase()] || multiplier} DP`;
        line.replaceChildren(dpProc, time ? ` · ${time}` : "");
        return;
      }

      match = text.match(/^You defeated .+ after ([\d,]+) rounds?\.?$/i);
      if (match) {
        setCompactText(`Win · ${match[1]} rounds`);
        return;
      }

      match = text.match(
        /^Guild Money:\s*(.*?)\s*-\s*Guild Exp:\s*(.*?)$/i,
      );
      if (match) {
        setCompactText(`Guild · ${match[1]} · ${match[2]} XP`);
        return;
      }

      match = text.match(/^Guild Statue Drops:\s*(.*)$/i);
      if (match) {
        setCompactText(`Drops · ${match[1]}`);
        return;
      }

      match = text.match(/^Total DP per Kill:\s*(.*)$/i);
      if (match) {
        setCompactText(`DP/Kill · ${match[1]}`);
        return;
      }

      match = text.match(
        /^You have received\s+(.+?)\s+from the Dungeon Treasury\.?$/i,
      );
      if (match) setCompactText(`Treasury · ${match[1]}`);
    });
    return true;
  }

  function initializeCompactBattleResults() {
    if (!MODS.compactBattleResults) return true;
    const content = document.getElementById("content");
    if (!content) return false;

    let scheduled = false;
    const update = () => {
      scheduled = false;
      compactBattleResults();
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(update);
    };

    new MutationObserver(schedule).observe(content, {
      childList: true,
      subtree: true,
    });
    document.addEventListener("battleContentLoaded", schedule);
    schedule();
    return true;
  }

  function initializeInlinePopupDock() {
    if (!MODS.inlinePopupDock) return true;
    const middleSection = document.getElementById("middlesection");
    const popupHolder = document.getElementById("popupholder");
    if (!middleSection || !popupHolder) return false;

    let dock = document.getElementById(`${SCRIPT_ID}-popup-dock`);
    if (!dock) {
      dock = document.createElement("section");
      dock.id = `${SCRIPT_ID}-popup-dock`;
      dock.setAttribute("aria-label", "Menu content");
      middleSection.appendChild(dock);
    }
    dock.hidden = false;
    dock.setAttribute("aria-hidden", "false");

    const popupContainer = document.getElementById("popupcontainer");
    try {
      if (popupContainer?.matches?.(":popover-open")) {
        popupContainer.hidePopover();
      }
    } catch {
      // Older browsers do not expose the popover pseudo-class.
    }
    if (popupContainer) {
      popupContainer.removeAttribute("popover");
    }
    document.getElementById("popupcloser")?.setAttribute("aria-hidden", "true");
    dock.appendChild(popupHolder);
    // Native outside-click handling exempts .lrow descendants. Include the
    // grid container itself so its inter-panel gaps are part of the workspace.
    // #holder's ID-scoped grid CSS takes precedence over native .lrow flex CSS.
    document.getElementById("holder")?.classList.add("lrow");
    document.documentElement.classList.add(`${SCRIPT_ID}-inline-popup`);

    const popupTopbar = document.getElementById("popuptopbar");
    if (popupTopbar && !popupTopbar.dataset.lyraniaInlinePopup) {
      popupTopbar.dataset.lyraniaInlinePopup = SCRIPT_VERSION;
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

    const popupNav = document.getElementById("popupnav");
    const mainNav = document.getElementById("mainnav");
    const actionOnlyMenuValues = new Set(["1", "5", "8", "9"]);
    const menuValueIsAvailable = (value) =>
      !actionOnlyMenuValues.has(value) &&
      Boolean(
        popupNav &&
          [...popupNav.options].some((option) => option.value === value),
      );
    const readRetainedMenuValue = () => {
      try {
        const storedValue = window.localStorage.getItem(
          MENU_SELECTION_STORAGE_KEY,
        );
        if (storedValue && menuValueIsAvailable(storedValue)) {
          return storedValue;
        }
      } catch (_error) {
        // Storage may be unavailable in a restricted browser context.
      }
      return "3";
    };
    const retainMenuValue = (value) => {
      const menuValue = Number.parseInt(value, 10);
      const normalizedValue = String(menuValue);
      if (
        Number.isFinite(menuValue) &&
        menuValueIsAvailable(normalizedValue)
      ) {
        dock.dataset.retainedMenuValue = normalizedValue;
      }
    };
    const saveRetainedMenuValue = () => {
      const retainedValue = dock.dataset.retainedMenuValue;
      if (!menuValueIsAvailable(retainedValue)) return;
      try {
        window.localStorage.setItem(
          MENU_SELECTION_STORAGE_KEY,
          retainedValue,
        );
      } catch (_error) {
        // The current pane still works when storage is unavailable.
      }
    };
    dock.dataset.retainedMenuValue = readRetainedMenuValue();

    let nativeMenuCloseSuppressionDepth = 0;
    const originalClosePage = window.closepage;
    if (
      typeof originalClosePage === "function" &&
      !originalClosePage.lyraniaInlinePopupCloseVersion
    ) {
      const wrappedClosePage = function (...args) {
        if (nativeMenuCloseSuppressionDepth > 0) return undefined;
        return originalClosePage.apply(this, args);
      };
      wrappedClosePage.lyraniaInlinePopupCloseVersion = SCRIPT_VERSION;
      wrappedClosePage.lyraniaOriginalClosePage = originalClosePage;
      window.closepage = wrappedClosePage;
    }

    const preserveMenuDuring = (callback) => {
      nativeMenuCloseSuppressionDepth += 1;
      try {
        return callback();
      } finally {
        nativeMenuCloseSuppressionDepth = Math.max(
          0,
          nativeMenuCloseSuppressionDepth - 1,
        );
      }
    };

    const preserveMenuDuringSharedRequest = (callback) => {
      const result = callback();
      const request = window.xmlhttp;
      const readyStateChange = request?.onreadystatechange;
      if (
        typeof readyStateChange === "function" &&
        !readyStateChange.lyraniaInlinePopupPreserveVersion
      ) {
        const wrappedReadyStateChange = function (...args) {
          return preserveMenuDuring(() =>
            readyStateChange.apply(this, args),
          );
        };
        wrappedReadyStateChange.lyraniaInlinePopupPreserveVersion =
          SCRIPT_VERSION;
        request.onreadystatechange = wrappedReadyStateChange;
      }
      return result;
    };

    const originalInventDiv = window.inventdiv;
    if (
      typeof originalInventDiv === "function" &&
      !originalInventDiv.lyraniaScopedSettingsVersion
    ) {
      const wrappedInventDiv = function (menuId, ...args) {
        const settingsScope = [
          ...document.querySelectorAll("#popup #response, #content #response"),
        ].find((scope) => scope.querySelector(".settingsform"));
        if (!settingsScope) {
          return originalInventDiv.call(this, menuId, ...args);
        }

        for (let index = 1; index < 20; index += 1) {
          const panel = settingsScope.querySelector(
            `[id="inventdiv${index}"]`,
          );
          const menuItem = settingsScope.querySelector(
            `[id="inventli${index}"]`,
          );
          if (panel && panel.style.display !== "none") {
            panel.style.display = "none";
          }
          if (menuItem?.style.fontWeight === "bold") {
            menuItem.style.fontWeight = "normal";
          }
        }

        const selectedPanel = settingsScope.querySelector(
          `[id="inventdiv${menuId}"]`,
        );
        const selectedMenuItem = settingsScope.querySelector(
          `[id="inventli${menuId}"]`,
        );
        if (!selectedPanel) {
          return originalInventDiv.call(this, menuId, ...args);
        }
        selectedPanel.style.display = "block";
        if (selectedMenuItem) selectedMenuItem.style.fontWeight = "bold";
        return undefined;
      };
      wrappedInventDiv.lyraniaScopedSettingsVersion = SCRIPT_VERSION;
      wrappedInventDiv.lyraniaOriginalInventDiv = originalInventDiv;
      window.inventdiv = wrappedInventDiv;
    }

    const originalPerformNav = window.performnav;
    if (
      typeof originalPerformNav === "function" &&
      !originalPerformNav.lyraniaInlinePopupNavVersion
    ) {
      const wrappedPerformNav = function (...args) {
        const menuItem = Number.parseInt(args[0], 10);
        if (menuItem === 5 && MODS.persistentInventory) {
          if (popupNav) {
            popupNav.value = dock.dataset.retainedMenuValue || "3";
          }
          if (mainNav) mainNav.value = "1";
          if (typeof window.inventorySimple === "function") {
            return window.inventorySimple(getPersistentInventoryTab());
          }
          return undefined;
        }

        if ([1, 8, 9].includes(menuItem)) {
          try {
            return preserveMenuDuring(() =>
              originalPerformNav.apply(this, args),
            );
          } finally {
            if (popupNav) {
              popupNav.value = dock.dataset.retainedMenuValue || "3";
            }
          }
        }

        retainMenuValue(menuItem);
        return originalPerformNav.apply(this, args);
      };
      wrappedPerformNav.lyraniaInlinePopupNavVersion = SCRIPT_VERSION;
      wrappedPerformNav.lyraniaOriginalPerformNav = originalPerformNav;
      window.performnav = wrappedPerformNav;
    }

    const originalGuildPage = window.guildpage;
    if (
      typeof originalGuildPage === "function" &&
      !originalGuildPage.lyraniaInlinePopupNavVersion
    ) {
      const wrappedGuildPage = function (...args) {
        const guildPage = Number.parseInt(args[0], 10);
        if (![11, 12, 13].includes(guildPage)) {
          return originalGuildPage.apply(this, args);
        }
        return preserveMenuDuringSharedRequest(() =>
          originalGuildPage.apply(this, args),
        );
      };
      wrappedGuildPage.lyraniaInlinePopupNavVersion = SCRIPT_VERSION;
      wrappedGuildPage.lyraniaOriginalGuildPage = originalGuildPage;
      window.guildpage = wrappedGuildPage;
    }

    let menuChangedByUser = false;
    [mainNav, popupNav].forEach((control) => {
      control?.addEventListener("change", (event) => {
        if (event.isTrusted) menuChangedByUser = true;
      });
    });

    let scheduled = false;
    const sync = () => {
      scheduled = false;
      const hasContent = ["popup", "popupresponse"].some((id) => {
        const node = document.getElementById(id);
        return node && (node.childElementCount > 0 || node.textContent.trim());
      });
      const isOpen =
        hasContent &&
        popupHolder.style.visibility !== "hidden" &&
        getComputedStyle(popupHolder).visibility !== "hidden";
      dock.hidden = false;
      dock.setAttribute("aria-hidden", "false");
      dock.classList.toggle(`${SCRIPT_ID}-popup-dock-empty`, !isOpen);
      dock.dataset.state = isOpen ? "open" : "empty";
      if (isOpen) {
        retainMenuValue(popupNav?.value);
        saveRetainedMenuValue();
      }
      middleSection.classList.toggle(
        `${SCRIPT_ID}-inline-popup-open`,
        isOpen,
      );
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(sync);
    };

    new MutationObserver(schedule).observe(popupHolder, {
      attributes: true,
      attributeFilter: ["style"],
      childList: true,
      subtree: true,
    });
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Escape" || dock.dataset.state !== "open") return;
        event.preventDefault();
        if (typeof window.closepage === "function") window.closepage();
      },
      true,
    );

    const retainedMenuHasLoaded = () => {
      const retainedValue = dock.dataset.retainedMenuValue;
      const hasContent = ["popup", "popupresponse"].some((id) => {
        const node = document.getElementById(id);
        return node && (node.childElementCount > 0 || node.textContent.trim());
      });
      return (
        hasContent &&
        popupHolder.style.visibility !== "hidden" &&
        getComputedStyle(popupHolder).visibility !== "hidden" &&
        popupNav?.value === retainedValue
      );
    };
    const nativePageRequestIsBusy = () => {
      const request = window.xmlhttp;
      return Boolean(
        request &&
          request.readyState > XMLHttpRequest.UNSENT &&
          request.readyState < XMLHttpRequest.DONE,
      );
    };

    let retainedMenuLoadStarted = false;
    let retainedMenuLoadFinished = false;
    let retainedMenuLoadAttempts = 0;
    let retainedMenuLoadTimer = 0;
    const maximumRetainedMenuLoadAttempts = 4;

    const verifyRetainedMenuLoad = () => {
      retainedMenuLoadTimer = 0;
      if (menuChangedByUser || retainedMenuLoadFinished) return;
      if (retainedMenuHasLoaded()) {
        retainedMenuLoadFinished = true;
        return;
      }
      if (nativePageRequestIsBusy()) {
        retainedMenuLoadTimer = window.setTimeout(
          verifyRetainedMenuLoad,
          250,
        );
        return;
      }
      if (retainedMenuLoadAttempts >= maximumRetainedMenuLoadAttempts) return;
      retainedMenuLoadTimer = window.setTimeout(openRetainedMenu, 1250);
    };

    function openRetainedMenu() {
      retainedMenuLoadTimer = 0;
      if (
        menuChangedByUser ||
        retainedMenuLoadFinished ||
        typeof window.performnav !== "function"
      ) {
        return;
      }
      if (retainedMenuHasLoaded()) {
        retainedMenuLoadFinished = true;
        return;
      }
      if (nativePageRequestIsBusy()) {
        retainedMenuLoadTimer = window.setTimeout(openRetainedMenu, 250);
        return;
      }
      if (retainedMenuLoadAttempts >= maximumRetainedMenuLoadAttempts) return;

      retainedMenuLoadAttempts += 1;
      window.performnav(
        Number.parseInt(dock.dataset.retainedMenuValue, 10),
      );
      retainedMenuLoadTimer = window.setTimeout(verifyRetainedMenuLoad, 250);
    }

    const startRetainedMenuLoad = () => {
      if (retainedMenuLoadStarted || menuChangedByUser) return;
      retainedMenuLoadStarted = true;
      openRetainedMenu();
    };
    document.addEventListener(
      "battleContentLoaded",
      () => window.setTimeout(startRetainedMenuLoad, 1800),
      { once: true },
    );
    window.setTimeout(startRetainedMenuLoad, 4500);
    schedule();
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

  let dungeonMapObserver = null;
  let dungeonMapObserverTimeout = 0;
  function waitForDungeonMap() {
    dungeonMapObserver?.disconnect();
    window.clearTimeout(dungeonMapObserverTimeout);
    const previousMap = document.getElementById("dungeonmapcontainer");
    const observer = new MutationObserver(() => {
      const currentMap = document.getElementById("dungeonmapcontainer");
      if (currentMap && currentMap !== previousMap && enhanceDungeonMap()) {
        observer.disconnect();
        window.clearTimeout(dungeonMapObserverTimeout);
      }
    });
    dungeonMapObserver = observer;
    observer.observe(document.getElementById("popup") || document.body, {
      childList: true, subtree: true,
    });
    dungeonMapObserverTimeout = window.setTimeout(() => observer.disconnect(), 15000);
  }

  function initializeDungeonMapSummary() {
    if (!MODS.dungeonMapSummary) return true;
    if (window.dungeonmap?.lyraniaDungeonMapSummaryWrapper) return true;
    if (typeof window.dungeonmap !== "function") return false;

    const originalDungeonMap = window.dungeonmap;
    const wrappedDungeonMap = function (...args) {
      waitForDungeonMap();
      return originalDungeonMap.apply(this, args);
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


  function initializeHousingPanelScroll() {
    let generation = 0;
    const isHousingRoot = (root) => {
      if (!root) return false;
      return [...root.querySelectorAll("a[href], [onclick]")].some((control) =>
        [control.getAttribute("href"), control.getAttribute("onclick")].some((value) =>
          /\b(?:build|house)\s*\(/i.test(value || "")));
    };
    const scrollHousingPanel = () => {
      const root = [document.getElementById("popup"), document.getElementById("content")]
        .find((element) => isHousingRoot(element) && element.getClientRects().length &&
          getComputedStyle(element).visibility === "visible");
      if (!root) return;
      const panel = root.closest("#popupresdisplay") || root;
      const panelBounds = panel.getBoundingClientRect();
      const controls = root.querySelectorAll("a[href], [onclick]");
      const hourglassVisible = [...controls].some((control) => {
        const matches = [control.getAttribute("href"), control.getAttribute("onclick")]
          .some((value) => /\bbuild\(['"]use_housingtimer_hourglass['"],['"]all['"],1\)/i
            .test((value || "").replace(/\s+/g, "")));
        if (!matches) return false;
        const style = getComputedStyle(control);
        if (!control.getClientRects().length || style.visibility !== "visible" || Number(style.opacity) === 0)
          return false;
        const bounds = control.getBoundingClientRect();
        return bounds.bottom > Math.max(panelBounds.top, 0) &&
          bounds.top < Math.min(panelBounds.bottom, window.innerHeight) &&
          bounds.right > Math.max(panelBounds.left, 0) &&
          bounds.left < Math.min(panelBounds.right, window.innerWidth);
      });
      if (!hourglassVisible) {
        // Scroll the actual overflow containers, including native nested panels.
        const containers = [panel, root, ...root.querySelectorAll("*")];
        for (const container of new Set(containers)) {
          if (container.scrollHeight <= container.clientHeight) continue;
          if (!/(?:auto|scroll)/.test(getComputedStyle(container).overflowY)) continue;
          container.scrollTo({ top: container.scrollHeight, behavior: "instant" });
        }
      }
    };
    const schedule = () => {
      const current = ++generation;
      const run = () => { if (current === generation) scrollHousingPanel(); };
      requestAnimationFrame(() => requestAnimationFrame(run));
      // Account for delayed native layout/scroll restoration after rendering.
      window.setTimeout(run, 150);
      window.setTimeout(run, 500);
    };
    for (const id of ["popup", "content"]) {
      const root = document.getElementById(id);
      if (!root) continue;
      new MutationObserver((records) => {
        // Ignore ticking text counters; react to panel replacement/control updates.
        if (records.some((record) => record.type === "attributes" || record.target === root ||
            [...record.addedNodes].some((node) => node.nodeType === 1))) schedule();
      }).observe(root, { childList: true, subtree: true, attributes: true,
        attributeFilter: ["hidden", "class", "style"] });
    }
    // Do not fight deliberate scrolling while a delayed correction is pending.
    for (const event of ["wheel", "touchstart", "pointerdown", "keydown"])
      document.addEventListener(event, () => { generation += 1; }, { passive: true, capture: true });
    schedule();
    return true;
  }

  function initializeMenuSupport() {
    const popup = document.getElementById('popup');
    if (!popup) return false;
    const annotate = () => {
      observer.disconnect();
      const text = popup.textContent;
      const reviewed = !!popup.querySelector('.trade-shell, #jade_temple_ui, #guildname, #shop_gdp, #glogbox, #dungeontresdonate') ||
        /Quest \d+:|Welcome to the Lyrania Wishing Well|Guild Inventory|Current Ranks|Back to Guild/.test(text);
      popup.toggleAttribute('data-lyrania-reviewed', reviewed);
      if (popup.querySelector('#guildname')) {
        for (const group of popup.querySelectorAll('div')) {
          const cells = [...group.children];
          if (cells.length < 2 || cells.length % 2 || !cells.every((cell, i) =>
            cell.tagName === 'DIV' && cell.style.width === (i % 2 ? '70%' : '30%'))) continue;
          group.classList.add('lyr-guild-stats');
          cells.forEach((cell, i) => cell.classList.add(i % 2 ? 'lyr-guild-value' : 'lyr-guild-label'));
        }
      }
      if (reviewed) {
        for (const el of popup.querySelectorAll('[style]')) {
          if (el.style.float && el.style.float !== 'none') el.classList.add('lyr-flow-column');
          if (parseFloat(el.style.paddingLeft) >= 50) el.classList.add('lyr-reset-indent');
        }
        for (const table of popup.querySelectorAll('table')) {
          if (table.parentElement.closest('table')) continue;
          const rows = [...table.rows];
          const head = rows[0];
          if (!head) continue;
          const hasHeader = head.querySelector('th') || table.matches('.trade-table') || popup.querySelector('#glogbox');
          const guildLog = !!popup.querySelector('a[href="javascript:guildpage(0);"]') &&
            (popup.querySelector('#glogbox, a[href^="javascript:guildpage(303,"]') ||
              (!hasHeader && head.cells.length === 2 && /^\d{1,2}\/\d{1,2}\s+\d{1,2}:/.test(head.cells[0].textContent.trim())));
          if (guildLog) {
            table.classList.add('lyr-log-table');
            if (!hasHeader) rows.forEach(row => row.classList.add('lyr-log-event'));
          }
          table.classList.add(hasHeader ? 'lyr-record-table' : 'lyr-event-table');
          if (!hasHeader) continue;
          head.classList.add('lyr-table-heading');
          const labels = [...head.cells].map(cell => cell.textContent.replace(/[▲▼↑↓]/g, '').trim());
          table.classList.toggle('lyr-wide-table', labels.length > 7);
          for (const row of rows.slice(1)) {
            if (row.closest('table') !== table || row.cells.length !== labels.length || [...row.cells].some(c => c.colSpan > 1)) continue;
            row.classList.add('lyr-record');
            [...row.cells].forEach((cell, i) => cell.dataset.lyrLabel = labels[i]);
          }
        }
      }
      observer.observe(popup, { childList: true, subtree: true });
    };
    const observer = new MutationObserver(annotate);
    annotate();

    const content = document.getElementById('content');
    if (content) {
      const formatShrine = () => {
        const shrine = /The shrine room is a huge open hall/.test(content.textContent) &&
          !!content.querySelector('a[href="javascript:guildpage(11);"]');
        content.toggleAttribute('data-lyr-shrine', shrine);
        if (!shrine) return;
        for (const el of content.querySelectorAll('div[style]')) {
          if (el.style.float === 'left') el.classList.add('lyr-shrine-section');
          if (el.style.width === '55%' || el.style.width === '45%') el.classList.add('lyr-shrine-damage');
          if (el.style.border && el.querySelector('input[onclick^="reofferShrine("]'))
            el.classList.add('lyr-shrine-boss');
        }
      };
      new MutationObserver(formatShrine).observe(content, { childList: true, subtree: true, characterData: true });
      formatShrine();
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'lyr-support-capture';
    button.textContent = 'Capture for support';
    (document.getElementById('tour-headernav') || document.getElementById('header')).append(button);
    button.addEventListener('click', () => {
      if (document.getElementById('lyr-capture-dialog')) return;
      const dialog = document.createElement('dialog');
      dialog.id = 'lyr-capture-dialog';
      const explanation = document.createElement('p');
      explanation.textContent = 'Save menu HTML and screen details for a support request. Screenshot capture opens your browser’s sharing picker: select the game tab or window. Files may contain visible chat, names, and account information. Review them before attaching; nothing is uploaded automatically.';
      const status = document.createElement('p');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const download = (blob, suffix) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'lyrania-support-' + stamp + suffix;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      };
      const htmlButton = document.createElement('button');
      htmlButton.textContent = 'Save HTML + screen details';
      htmlButton.onclick = () => {
        const nav = document.getElementById('popupnav');
        const ids = ['popupholder', 'content', 'header', 'side1'];
        const panels = {};
        for (const id of ids) {
          const element = document.getElementById(id);
          if (!element) continue;
          const copy = element.cloneNode(true);
          copy.querySelectorAll('input[type="password"], input[type="hidden"], script').forEach(node => node.remove());
          const rect = element.getBoundingClientRect();
          panels[id] = { outerHTML: copy.outerHTML, width: rect.width, height: rect.height,
            scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight, scrollTop: element.scrollTop,
            display: getComputedStyle(element).display, visibility: getComputedStyle(element).visibility };
        }
        const report = { capturedAt: new Date().toISOString(), menu: nav?.selectedOptions[0]?.textContent,
          viewport: { width: innerWidth, height: innerHeight, devicePixelRatio,
            visualScale: window.visualViewport?.scale, screenWidth: screen.width, screenHeight: screen.height },
          userAgent: navigator.userAgent, panels };
        download(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), '.json');
        status.textContent = 'HTML and screen details saved. You can also save a screenshot.';
      };
      const screenshotButton = document.createElement('button');
      screenshotButton.textContent = 'Save screenshot';
      screenshotButton.disabled = !navigator.mediaDevices?.getDisplayMedia;
      screenshotButton.onclick = async () => {
        let stream;
        screenshotButton.disabled = true;
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
          dialog.close();
          const video = document.createElement('video');
          video.muted = true;
          video.srcObject = stream;
          await video.play();
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video, 0, 0);
          const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
          if (!blob) throw new Error('Screenshot could not be created.');
          download(blob, '.png');
          status.textContent = 'Screenshot saved. Attach the PNG and JSON to your request.';
        } catch (error) {
          status.textContent = 'Screenshot not saved: ' + error.message + ' You can still save the HTML details.';
        } finally {
          stream?.getTracks().forEach(track => track.stop());
          screenshotButton.disabled = false;
          if (dialog.isConnected && !dialog.open) dialog.showModal();
        }
      };
      const close = document.createElement('button');
      close.textContent = 'Done';
      close.onclick = () => dialog.remove();
      dialog.addEventListener('cancel', () => dialog.remove());
      dialog.append(explanation, htmlButton, screenshotButton, close, status);
      document.body.append(dialog);
      dialog.showModal();
    });
    return true;
  }

  const initializers = [
    initializeMenuSupport,
    initializeCompactHeader,
    initializeChatMods,
    initializeTripleDpHour,
    initializeKillsPerHour,
    initializeInactiveDpTimerHider,
    initializeBufferXp,
    initializePersistentLootLog,
    wrapIsolatedInventoryRequests,
    initializePersistentInventory,
    initializeCompactBattleResults,
    initializeInlinePopupDock,
    initializeDungeonMapSummary,
    initializeHousingPanelScroll,
  ];

  async function startModSuite() {
  // Load the separate matching CSS before moving any game elements.
  if (GAME_MAJOR_VERSION !== 4 || document.body.dataset.hubLayout !== "classic") {
    console.warn("[" + SCRIPT_ID + "] This release requires Lyrania 4 Classic layout.");
    return;
  }
  if (!document.getElementById("holder") || !document.getElementById("middlesection") ||
      !document.getElementById("chat_row")) return;
  if (!(await loadRemoteTheme())) return;
  if (!initializeCurrentGameLayout()) return;

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
  }
  startModSuite().catch((error) => console.error("Lyrania Mod Suite initialization failed", error));
})();
