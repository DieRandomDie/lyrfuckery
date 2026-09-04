// ==UserScript==
// @name Lyrania Mod Suite
// @namespace https://lyrania.co.uk/
// @version 2.18.2
// @match https://lyrania.co.uk/game.php*
// @match https://dev.lyrania.co.uk/game.php*
// @updateURL https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-mod-suite.user.js
// @downloadURL https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-mod-suite.user.js
// @grant none
// @run-at document-idle
// ==/UserScript==
(() => {
  "use strict";
  const t = window,
    e = document,
    n = Object,
    o = String,
    r = Number,
    i = Math,
    a = Boolean,
    s = Date,
    c = MutationObserver,
    l = getComputedStyle,
    u = e.getElementById.bind(e),
    d = e.createElement.bind(e),
    p = e.addEventListener.bind(e),
    f = e.querySelector.bind(e),
    m = t.addEventListener.bind(t),
    y = t.setTimeout.bind(t),
    h = t.clearTimeout.bind(t),
    b = i.max,
    g = i.floor,
    v = n.freeze({
      chatChannelSidebar: 1,
      chatQuickMenu: 1,
      tripleDpHour: 1,
      killsPerHour: 1,
      hideInactiveDpTimers: 1,
      actionTimerFix: 1,
      heldEnterAlertGuard: 1,
      bufferXp: 1,
      persistentLootLog: 1,
      persistentInventory: 1,
      isolatedInventoryRequests: 1,
      popupOutsideClose: 1,
      dungeonMapSummary: 1,
    }),
    $ = "lyrania-chat-enhancements",
    C = "2.18.2",
    w =
      "https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-modern-responsive-theme.css",
    S = "lyrania-mod-suite:remote-theme-cache",
    k = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      hourCycle: "h23",
    }),
    x = n.freeze({
      0: "mainchatcolor",
      l: "gameschatcolor",
      g: "guildchatcolor",
      o: "officerchatcolor",
      t: "tradechatcolor",
      au: "auctionchatcolor",
      p: "pubchatcolor",
      a: "areachatcolor",
      w: "whisperchatcolor",
    }),
    E = n.entries(x),
    A = n.freeze({
      0: { buttonId: "mainchatbutton", command: "killchat" },
      l: { buttonId: "Litechatbutton", command: "gamesroom" },
      g: { buttonId: "guildchatbutton", command: "guildchat" },
      t: { buttonId: "tradechatbutton", command: "trade" },
      au: { buttonId: "auctionchatbutton", command: "auction" },
      p: { buttonId: "pubchatbutton", command: "pub" },
      a: { buttonId: "areachatbutton", command: "area" },
      global: { buttonId: "globalschatbutton", command: "killglobals" },
    }),
    L = n.freeze({
      GamesRoom: "Games Room",
      gboss: "Guild Boss",
      NewPlayers: "New Players",
      Icedraffle: "Iced Raffle",
      CatsCafe: "Cats Cafe",
    });
  let I = "all",
    T = 1;
  const q = new Set(),
    R = new Set();
  let _ = [],
    D = null,
    B = null;
  function P(t, e = "") {
    const o = d("button");
    return (n.assign(o, { type: "button", className: e, textContent: t }), o);
  }
  function H(t) {
    const e = o(t ?? "");
    return e.includes("<")
      ? new DOMParser().parseFromString(e, "text/html").body.textContent
      : e;
  }
  function j(t) {
    const n = o(t || "").trim();
    if (n.length < 100 || !n.includes("{") || n.startsWith("```")) return 0;
    let r = u(`${$}-remote-theme`);
    return (
      r ||
        ((r = d("style")), (r.id = `${$}-remote-theme`), e.head.appendChild(r)),
      (r.textContent = n),
      1
    );
  }
  function M(t) {
    const e = t.trim();
    return L[e] || e;
  }
  function F(t) {
    t.querySelectorAll(".lyrania-channel-select[data-channel]").forEach((t) => {
      const e = t.dataset.channel === I;
      (t.classList.toggle("is-selected", e),
        t.setAttribute("aria-pressed", o(e)));
    });
  }
  function O(t) {
    const e = A[t],
      n = e && u(e.buttonId);
    if (!n) return 1;
    const o = l(n).backgroundColor.replace(/\s+/g, "").toLowerCase();
    return "rgb(0,0,0)" !== o && "rgba(0,0,0,0)" !== o && "transparent" !== o;
  }
  function N(t) {
    const e = A[t];
    e && !O(t) && U("commands", e.command);
  }
  function W(t, e) {
    (t.classList.toggle("is-enabled", e),
      t.setAttribute("aria-pressed", o(e)),
      (t.textContent = e ? "On" : "Off"),
      (t.title = e ? "Shown in All" : "Hidden from All"));
  }
  function V(t) {
    if (
      t.querySelector(
        '\n            .globalchatcolor,\n            [class*="boss" i],\n            [class*="motd" i],\n            [class*="bonus" i]\n        ',
      )
    )
      return 1;
    const e = t.textContent.replace(/\s+/g, " ").trim();
    if (
      /\bmessage\s+of\s+the\s+day\s*:/i.test(e) ||
      /(?:^|\s)g?motd\s*:/i.test(e) ||
      /\bauto\s+reconciliation\b/i.test(e) ||
      /\brecovered\s+[\d,]+\s+auto\s+battles?\s+while\s+(?:your\s+game\s+tab\s+was\s+inactive|you\s+were\s+offline)\b/i.test(
        e,
      ) ||
      /\bbonus\s+(?:effect|event|modifier|active|activated)\b/i.test(e)
    )
      return 1;
    if (!t.querySelector(".chatname") && /\bbonus(?:es)?\b/i.test(e)) return 1;
    for (const e of t.querySelectorAll("a[href]")) {
      const t = (e.getAttribute("href") || "")
        .replace(/\s+/g, "")
        .toLowerCase();
      if (
        t.includes("performnav(9)") ||
        t.includes("contract()") ||
        t.includes("boss")
      )
        return 1;
    }
    return 0;
  }
  function G(t) {
    t.hidden = !(function (t) {
      if ("all" === I) {
        if (V(t)) return T;
        if (t.querySelector(".whisperchatcolor")) return 1;
        for (const [e, n] of E)
          if ("w" !== e && t.querySelector(`.${n}`)) return q.has(e);
        for (const e of _)
          if (t.textContent.includes(e.marker)) return q.has(e.value);
        return 1;
      }
      if (t.querySelector(".whisperchatcolor")) return 1;
      if ("global" === I) return V(t);
      const e = x[I];
      if (e) return a(t.querySelector(`.${e}`));
      const n = _.find((t) => t.value === I);
      return a(n && t.textContent.includes(n.marker));
    })(t);
  }
  function Q() {
    const t = u("chatwindow");
    t &&
      t.querySelectorAll(".chatline").forEach((t) => {
        G(t);
      });
  }
  function X(t) {
    t.forEach((t) => {
      t.addedNodes.forEach((t) => {
        (1 === t.nodeType && t.matches(".chatline") && G(t),
          t.querySelectorAll?.(".chatline").forEach((t) => {
            G(t);
          }));
      });
    });
  }
  function z(t, e) {
    const n = u("inputchat");
    n && ((n.value = `/${t} ${e} `), (n.style.color = "#DD77DD"), n.focus());
  }
  function U(e, ...n) {
    const o = t[e];
    "function" == typeof o && o(...n);
  }
  function J() {
    (D?.remove(), (D = null));
  }
  function K(t, e, n) {
    const o = P(e);
    (o.addEventListener("click", (t) => {
      (t.stopPropagation(), J(), n());
    }),
      t.appendChild(o));
  }
  function Z() {
    try {
      const e = r(t.estimatedServerNow?.());
      if (r.isFinite(e) && e > 0) return e;
    } catch (t) {}
    return s.now();
  }
  function Y() {
    const t = u("serverTime")?.textContent.match(/(\d{1,2}):(\d{2}):(\d{2})/);
    if (!t) return null;
    const [, e, n, o] = t.map(r);
    return e > 23 || n > 59 || o > 59
      ? null
      : { hour: e, minute: n, second: o };
  }
  function tt(t) {
    const e = u("serverTime");
    return e
      ? (R.add(t),
        B ||
          ((B = new c(() => {
            R.forEach((t) => t());
          })),
          B.observe(e, { childList: 1, characterData: 1, subtree: 1 })),
        t(),
        1)
      : 0;
  }
  function et(t) {
    const e = r(o(t ?? "").replace(/[^\d.-]/g, ""));
    return r.isFinite(e) ? e : 0;
  }
  function nt(t, e = 0) {
    const n = H(t),
      a =
        n.match(/Money\s*:[\s\S]{0,200}?Exp\s*:\s*([\d,.]+)\s*([KMBT]?)\b/i) ||
        (!e && n.match(/(?:Exp|Experience)\s*:\s*([\d,.]+)\s*([KMBT]?)\b/i));
    return a
      ? (function (t, e = "") {
          const n = r(o(t).replace(/,/g, "")),
            a = { "": 1, k: 1e3, m: 1e6, b: 1e9, t: 1e12 }[
              o(e).trim().toLowerCase()
            ];
          return r.isFinite(n) && a ? i.round(n * a) : 0;
        })(a[1], a[2])
      : 0;
  }
  function ot(t) {
    if (!t) return 0;
    const e = t.querySelectorAll(".text-center span[title]");
    for (const t of e) {
      const e = t.querySelector("strong")?.textContent.trim().toLowerCase();
      if ("exp:" !== e) continue;
      const n = et(t.getAttribute("title"));
      if (n > 0) return n;
    }
    return 0;
  }
  function rt(t, e) {
    const n = t / (25 * e) - 1,
      o = i.abs(n) < 0.005 ? 0 : n;
    return `${o > 0 ? "+" : ""}${o.toFixed(2)} per action`;
  }
  let it = null;
  function at() {
    const t = u("expli");
    if (!t) return;
    const e = u("content"),
      n = ot(e) || nt(e?.textContent || e?.innerText, 1);
    if (n <= 0) return;
    const o = t.firstElementChild || t,
      r = o.textContent.match(/^\s*([\d,]+)/),
      i = r ? et(r[1]) : 0;
    if (i <= 0) return;
    const a = `(${rt(n, i)})`;
    if (o.textContent.includes(a)) return;
    const s = o.textContent.replace(/\s*\([^)]*\sper action\)\s*$/i, "").trim();
    o.textContent = `${s} ${a}`;
  }
  const st = n.freeze({
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
  function ct() {
    return `lyrania-mod-suite:loot-statistics:${t.userId || t.username || "unknown-account"}`;
  }
  function lt() {
    return {
      version: 1,
      totalDrops: 0,
      loot: n.fromEntries(
        n.keys(st).map((t) => [t, { total: 0, base: 0, bonus: 0, drops: 0 }]),
      ),
    };
  }
  function ut(t) {
    try {
      localStorage.setItem(ct(), JSON.stringify(t));
    } catch (t) {}
  }
  function dt(t) {
    const e = { p: 1e6, g: 1e4, s: 100, c: 1 };
    let n = 0;
    const o = /([\d,]+(?:\.\d+)?)\s*([pgsc])\b/gi;
    let r;
    for (; null !== (r = o.exec(t));) n += et(r[1]) * e[r[2].toLowerCase()];
    return n;
  }
  function pt(t) {
    const e = H(t).replace(/\s+/g, " ").trim();
    if (!e || /^welcome to lyrania!?$/i.test(e)) return null;
    const n = e.match(
        /\(\s*([\d,]+)\s*\+\s*([\d,]+)\s+(?:level\s+)?bonus\s*\)/i,
      ),
      o = e.match(
        /\bgained\s+([\d,]+)\s+(Health|Attack|Defence|Accuracy|Evasion)\b/i,
      );
    if (o) {
      const t = et(o[1]);
      return {
        type: o[2].toLowerCase(),
        base: n ? et(n[1]) : i.min(1, t),
        bonus: n ? et(n[2]) : b(0, t - 1),
        hasBonus: a(n),
      };
    }
    if (/\btoken(?:s| source)?\b/i.test(e)) {
      const t = [
        /\(([\d,]+)\s+token source\b/i,
        /\bfound\s+(?:an?\s+)?([\d,]+)\s+tokens?\b/i,
        /\b([\d,]+)\s+tokens?\b/i,
      ];
      for (const n of t) {
        const t = e.match(n);
        if (t) return { type: "tokens", base: et(t[1]), bonus: 0, hasBonus: 0 };
      }
    }
    if (
      /\b(?:platinum|gold|silver|copper)\b|[\d,]+(?:\.\d+)?\s*[pgsc]\b/i.test(e)
    ) {
      const t = e.match(/\(([^)]*)\)/)?.[1] || e,
        [n, ...o] = t.split("+"),
        r = dt(n),
        i = dt(o.join(" "));
      if (r || i)
        return { type: "gold", base: r, bonus: i, hasBonus: o.length > 0 };
    }
    const r = (function (t) {
      const e = t.toLowerCase();
      return e.includes("jade")
        ? "jade"
        : e.includes("fragment")
          ? "fragments"
          : e.includes("diamond")
            ? "diamonds"
            : e.includes("sapphire")
              ? "sapphires"
              : e.includes("ruby") || e.includes("rubies")
                ? "rubies"
                : e.includes("emerald")
                  ? "emeralds"
                  : e.includes("opal")
                    ? "opals"
                    : null;
    })(e);
    if (r && n)
      return { type: r, base: et(n[1]), bonus: et(n[2]), hasBonus: 1 };
    if (r) {
      const t = {
          jade: "jades?",
          fragments: "(?:jewel(?:lery)?\\s+)?fragments?",
          diamonds: "diamonds?",
          sapphires: "sapphires?",
          rubies: "rub(?:y|ies)",
          emeralds: "emeralds?",
          opals: "opals?",
        },
        n = e.match(
          new RegExp(`\\bfound\\s+(?:an?\\s+)?([\\d,]+)\\s+${t[r]}\\b`, "i"),
        ),
        o = e.match(new RegExp(`\\bfound\\s+an?\\s+${t[r]}\\b`, "i"));
      if (n || o)
        return { type: r, base: n ? et(n[1]) : 1, bonus: 0, hasBonus: 0 };
    }
    return null;
  }
  function ft(t) {
    let e = g(r(t) || 0);
    const n = g(e / 1e6);
    e %= 1e6;
    const o = g(e / 1e4);
    e %= 1e4;
    const i = g(e / 100),
      a = e % 100;
    return `${n.toLocaleString()}p ${o}g ${i}s ${a}c`;
  }
  function mt(e) {
    const o = u(`${$}-loot-summary`);
    if (!o) return;
    const r = new Set(
        Array.from(o.querySelectorAll(".lyrania-loot-stat[open]")).map(
          (t) => t.dataset.lootType,
        ),
      ),
      i = n
        .entries(st)
        .map(([t, n]) => {
          const o = e.loot[t],
            i = "gold" === t ? ft : (t) => t.toLocaleString();
          return `<details class="lyrania-loot-stat" data-loot-type="${t}"${r.has(t) ? " open" : ""}><summary><span>${n}</span><strong>${i(o.total)}</strong></summary><div class="lyrania-loot-stat-values"><span><small>Base</small><b>${i(o.base)}</b></span><span><small>Bonus</small><b>${i(o.bonus)}</b></span><span><small>Drops</small><b>${o.drops.toLocaleString()}</b></span></div></details>`;
        })
        .join("");
    ((o.innerHTML = `<div class="lyrania-loot-heading"><strong>Loot Statistics</strong><button type="button" id="${$}-loot-reset">Reset</button></div><div class="lyrania-loot-total">Total tracked drops: ${e.totalDrops.toLocaleString()}</div><div class="lyrania-loot-stat-grid">${i}</div>`),
      u(`${$}-loot-reset`)?.addEventListener("click", () => {
        if (!t.confirm("Reset all saved loot statistics for this account?"))
          return;
        const o = lt();
        (n.assign(e, o), ut(e), mt(e));
      }));
  }
  function yt(t) {
    if (!(t instanceof Element && t.classList.contains("lootlogitem")))
      return t;
    if (t.classList.contains("lyrania-loot-entry")) return t;
    const e = d("div");
    return (
      Array.from(t.attributes).forEach(({ name: t, value: n }) => {
        e.setAttribute(t, n);
      }),
      e.classList.add("lyrania-loot-entry"),
      (e.textContent = (function (t) {
        const e = pt(t);
        if (e) {
          const t = "gold" === e.type ? ft : (t) => r(t || 0).toLocaleString(),
            n = e.base + e.bonus,
            o = e.hasBonus ? ` (${t(e.base)}+${t(e.bonus)})` : "";
          return `${st[e.type]} - ${t(n)}${o}`;
        }
        return (
          H(t)
            .replace(/\s+/g, " ")
            .replace(/^\s*\[\d{1,2}:\d{2}:\d{2}\]\s*/, "")
            .replace(/^you\s+(?:found|gained)\s+/i, "")
            .replace(/[!.]+\s*$/, "")
            .trim() || "Loot drop"
        );
      })(t.textContent)),
      t.replaceWith(e),
      e
    );
  }
  function ht(t, e = 100) {
    Array.from(t.querySelectorAll(":scope > .lootlogitem"))
      .slice(e)
      .forEach((t) => t.remove());
  }
  const bt = n.freeze([
    "jewellery",
    "enchants",
    "maps",
    "consumables",
    "resources",
    "misc",
  ]);
  let gt = null,
    vt = 0,
    $t = 0,
    Ct = 0,
    wt = 0,
    St = 0,
    kt = null,
    xt = 0;
  function Et(t, e = "jewellery") {
    const n = o(t || "").toLowerCase();
    return bt.includes(n) ? n : e;
  }
  function At() {
    return {
      dock: u(`${$}-inventory-dock`),
      status: u(`${$}-inventory-status`),
      refresh: u(`${$}-inventory-refresh`),
      scroll: u(`${$}-inventory-scroll`),
      content: u(`${$}-inventory-content`),
    };
  }
  function Lt() {
    const t = f(`#${$}-inventory-content > #inventory_shell`);
    return Et(t?.dataset.currentTab);
  }
  function It(t, e = 0) {
    const { dock: n, status: r, refresh: i } = At();
    (n && n.setAttribute("aria-busy", o(e)),
      r && (r.textContent = t),
      i && (i.disabled = e),
      h($t),
      e &&
        ($t = y(() => {
          ((vt = 0), (gt = null));
          const t = At();
          if (Ct && !wt)
            return (
              (wt = 1),
              t.dock?.setAttribute("aria-busy", "true"),
              t.refresh && (t.refresh.disabled = 1),
              t.status &&
                (t.status.textContent =
                  "Inventory is still initializing. Retrying…"),
              h(St),
              void (St = y(() => {
                qt(1);
              }, 2500))
            );
          ((Ct = 0),
            t.dock?.setAttribute("aria-busy", "false"),
            t.refresh && (t.refresh.disabled = 0),
            t.status &&
              (t.status.textContent =
                "Inventory did not respond. Use Refresh to try again."));
        }, 15e3)));
  }
  function Tt(t) {
    const { dock: n, status: o, refresh: r, scroll: i, content: s } = At();
    if (!(n && i && s && t)) return 0;
    const c = a(u("popup")?.contains(t)),
      l = Et(t.dataset.currentTab),
      d = gt?.tab === l ? gt.top : 0;
    ((gt = null),
      s.replaceChildren(t),
      (n.dataset.currentTab = l),
      n.setAttribute("aria-busy", "false"),
      o && (o.textContent = ""),
      r && (r.disabled = 0),
      h($t),
      h(St),
      (Ct = 0));
    const p = u("mainnav");
    return (
      p && (p.value = "1"),
      (function (t = 0) {
        if (!t) return;
        const e = u("popupholder"),
          n = u("popup"),
          o = u("popupresponse");
        (e && (e.style.visibility = "hidden"),
          n && n.replaceChildren(),
          o && o.replaceChildren());
      })(c || vt),
      (vt = 0),
      requestAnimationFrame(() => {
        !(function (t, e, n, o) {
          if (((t.scrollTop = o), "consumables" !== n)) return;
          const r = e.querySelector("#inventory-consumable-inline-result");
          if (!r?.textContent.trim()) return;
          const i = t.getBoundingClientRect(),
            a = r.getBoundingClientRect();
          t.scrollTop = b(0, t.scrollTop + a.top - i.top - 8);
        })(i, s, l, d);
      }),
      e.dispatchEvent(
        new CustomEvent("lyraniaPersistentInventoryMounted", {
          detail: { tab: l },
        }),
      ),
      1
    );
  }
  function qt(e = 0) {
    if (f(`#${$}-inventory-content > #inventory_shell`)) Ct = 0;
    else {
      if ("function" != typeof t.inventorySimple)
        return (
          (Ct = 0),
          void It("Inventory is unavailable. Use Refresh to try again.")
        );
      (e || (wt = 0), (Ct = 1), t.inventorySimple("jewellery"));
    }
  }
  function Rt() {
    const e = u("dungeonmapcontainer"),
      n = e?.parentElement?.querySelectorAll(".dungeonmapRoomType") || [];
    if (!e || n.length < 4) return 0;
    const o = e.querySelectorAll(".map_room_moblist_grid");
    if (!o.length) return 0;
    e.classList.add("lyrania-dungeon-summary");
    const i = { mobs: 0, regular: 0, challenge: 0, empty: 0 };
    return (
      o.forEach((t) => {
        const e = r.parseInt(t.textContent, 10) || 0;
        ((i.mobs += e),
          e <= 0
            ? (i.empty += 1)
            : t.classList.contains("maproom_challenge_room")
              ? (i.challenge += 1)
              : t.classList.contains("maproom_regular_room") &&
                (i.regular += 1));
      }),
      [
        ["Mobs Left", i.mobs],
        ["Regular Rooms", i.regular],
        ["Challenge Rooms", i.challenge],
        ["Empty Rooms", i.empty],
      ].forEach(([t, e], o) => {
        n[o].textContent = `${t} (${e})${o < 3 ? " | " : ""}`;
      }),
      e.querySelectorAll("img").forEach((e) => {
        const n = new URL(e.src, t.location.href).pathname;
        /\/(?:open-)?chest\.svg$/.test(n) || (e.style.opacity = "0");
      }),
      1
    );
  }
  const _t = [
    function () {
      const n = v.chatChannelSidebar,
        o = v.chatQuickMenu;
      if (!n && !o) return 1;
      const r = u("chatwindow");
      if (!r) return 0;
      if (n && !u(`${$}-channels`)) {
        const t = u("chat_row"),
          e = u("chatchannel");
        if (!t || !e) return 0;
        (!(function (t, e) {
          const n = d("aside");
          ((n.id = `${$}-channels`),
            n.setAttribute("aria-label", "Chat channels"));
          const o = Array.from(e.options, (t) => ({
            value: t.value,
            label: M(t.text),
            marker: `[ ${t.text.trim()} ]`,
          }));
          _ = o.map(({ value: t, marker: e }) => ({ value: t, marker: e }));
          const r = P("All", "lyrania-chat-filter lyrania-channel-select");
          function i(t, o, r, i = "", a = 1) {
            r && q.add(t);
            const s = d("div");
            s.className = `lyrania-channel-row ${i}`.trim();
            const c = P(o, "lyrania-chat-filter lyrania-channel-select");
            if (
              ((c.dataset.channel = t),
              c.addEventListener("click", () => {
                (N(t),
                  (I = t),
                  (e.value = "global" === t ? "0" : t),
                  F(n),
                  Q());
              }),
              s.appendChild(c),
              !a)
            )
              return (
                s.classList.add("lyrania-no-toggle"),
                void n.appendChild(s)
              );
            const l = P("", "lyrania-channel-toggle");
            (W(l, r),
              l.addEventListener("click", () => {
                const e = !q.has(t);
                (e ? (q.add(t), N(t)) : q.delete(t),
                  "global" === t && (T = e),
                  W(l, e),
                  Q());
              }),
              s.appendChild(l),
              n.appendChild(s));
          }
          ((r.dataset.channel = "all"),
            r.addEventListener("click", () => {
              ((I = "all"), (e.value = "0"), F(n), Q());
            }),
            n.appendChild(r));
          const a = o.filter(({ value: t }) => /^\d+$/.test(t.trim()));
          (o
            .filter(({ value: t }) => !/^\d+$/.test(t.trim()))
            .forEach(({ value: t, label: e }) => {
              i(t, e, A[t] ? O(t) : 1);
            }),
            a.forEach(({ value: t, label: e }) => {
              i(t, e, 1);
            }),
            i("w", "Whispers", 1, "lyrania-special-row", 0),
            N("global"),
            (T = 1),
            i("global", "Global Chat", 1),
            t.classList.add(`${$}-layout`),
            t.insertBefore(n, t.firstChild),
            (e.hidden = 1));
          const s = u("chat");
          if (s) {
            const t = () => {
              const t = b(100, g(s.getBoundingClientRect().height - 10));
              ((n.style.height = `${t}px`), (n.style.maxHeight = `${t}px`));
            };
            (t(), new ResizeObserver(t).observe(s));
          }
          F(n);
        })(t, e),
          new c(X).observe(r, { childList: 1 }),
          Q());
      }
      return (
        o &&
          !e.documentElement.dataset.lyraniaQuickMenu &&
          ((e.documentElement.dataset.lyraniaQuickMenu = "installed"),
          p("click", (n) => {
            const o = n.target.closest?.("#chatwindow .chatname");
            if (o)
              return (
                n.preventDefault(),
                n.stopPropagation(),
                void (function (n) {
                  J();
                  const o = n.textContent.trim();
                  if (!o) return;
                  const r = d("div");
                  ((r.id = `${$}-quick-menu`),
                    r.setAttribute("role", "menu"),
                    K(r, "View Profile", () => U("profile", o)),
                    K(r, "Whisper", () => z("w", o)),
                    K(r, "Send Mail", () => U("post", 0, o, "")),
                    K(r, "Wire Platinum", () => z("wire", o)),
                    K(r, "Wire Jade", () => z("wirejade", o)),
                    K(r, "Wire Item", () => z("wireitem", o)),
                    e.body.appendChild(r),
                    (D = r));
                  const a = n.getBoundingClientRect(),
                    s = r.getBoundingClientRect(),
                    c = i.min(a.right + 5, t.innerWidth - s.width - 6),
                    l = i.min(a.top, t.innerHeight - s.height - 6);
                  ((r.style.left = `${b(6, c)}px`),
                    (r.style.top = `${b(6, l)}px`),
                    r.querySelector("button")?.focus());
                })(o)
              );
            n.target.closest?.(`#${$}-quick-menu`) || J();
          }),
          p("keydown", (t) => {
            "Escape" === t.key && J();
          }),
          m("resize", J),
          m("scroll", J, 1)),
        1
      );
    },
    function () {
      if (!v.tripleDpHour) return 1;
      if (u(`${$}-triple-hour`)) return 1;
      const t = u("serverTime")?.parentElement;
      if (!t) return 0;
      const e = d("div");
      ((e.id = `${$}-triple-hour`),
        (e.innerHTML = "Triple DP Hour: <span>--:--:--</span>"),
        t.insertAdjacentElement("afterend", e));
      const i = e.querySelector("span");
      let a = "";
      return tt(() => {
        const t = u("serverTime")?.textContent.slice(0, 5);
        if (t && t === a) return;
        a = t;
        const e = (function (t = Z()) {
          const e = (function (t = Z()) {
              return n.fromEntries(
                k
                  .formatToParts(new s(t))
                  .filter(({ type: t }) => "literal" !== t)
                  .map(({ type: t, value: e }) => [t, r(e)]),
              );
            })(t),
            i = Y() || e,
            a = 24 * (e.day - 1) + i.hour,
            c = a % 20;
          if (0 === c) return "Now";
          const l = a + 20 - c,
            u = 24 * new s(s.UTC(e.year, e.month, 0)).getUTCDate();
          return `${o(l >= u ? 0 : l % 24).padStart(2, "0")}:00:00`;
        })();
        i.textContent !== e && (i.textContent = e);
      });
    },
    function () {
      if (!v.killsPerHour) return 1;
      if (u(`${$}-kph`)) return 1;
      const t = u("sidecounter");
      if (!t) return 0;
      const e = u("serverTime"),
        n = u("killscount");
      if (!e || !n) return 0;
      const o = d("div");
      ((o.innerHTML = `Kills Per Hour: <span id="${$}-kph">0.0</span>`),
        t.appendChild(o));
      const r = o.querySelector("span");
      return tt(() => {
        const t = et(n.textContent),
          e = Y();
        if (!e) return;
        const o = e.hour + e.minute / 60 + e.second / 3600,
          i = o > 0 ? (t / o).toFixed(1) : "0.0";
        r.textContent !== i && (r.textContent = i);
      });
    },
    function () {
      if (!v.hideInactiveDpTimers) return 1;
      const t = u("bonusdisplays");
      if (!t) return 0;
      if (t.dataset.lyraniaInactiveDpHider) return 1;
      t.dataset.lyraniaInactiveDpHider = "installed";
      const e = () => {
        ["doubledp", "tripledp", "quaddp"].forEach((t) => {
          const e = u(t);
          e?.parentElement &&
            (e.parentElement.hidden =
              "inactive" === e.textContent.trim().toLowerCase());
        });
      };
      return (
        new c(e).observe(t, { childList: 1, characterData: 1, subtree: 1 }),
        e(),
        1
      );
    },
    function () {
      if (!v.heldEnterAlertGuard) return 1;
      if (t.alert?.lyraniaHeldEnterAlertGuardVersion === C) return 1;
      if ("function" != typeof t.alert) return 0;
      let n = t.alert;
      for (let t = 0; t < 5; t += 1) {
        const t = n?.lyraniaNativeAlert;
        if ("function" != typeof t || t === n) break;
        n = t;
      }
      const r = [];
      let i = 0,
        a = 0,
        s = 0,
        c = 0,
        l = null,
        f = 0;
      const b = (t) =>
        "Enter" === t.key || "Enter" === t.code || "NumpadEnter" === t.code;
      function g() {
        c && (h(c), (c = 0));
      }
      function w() {
        (g(),
          i ||
            (c = y(() => {
              ((c = 0), i || ((a = 0), l && (s = 1)));
            }, 300)));
      }
      function S() {
        if (l || !r.length || !e.body) return;
        const t = (function () {
          let t = u(`${$}-alert-overlay`);
          if (t)
            return {
              overlay: t,
              dialog: t.querySelector(`#${$}-alert-dialog`),
              message: t.querySelector(`#${$}-alert-message`),
              okButton: t.querySelector(`#${$}-alert-ok`),
            };
          ((t = d("div")), (t.id = `${$}-alert-overlay`), (t.hidden = 1));
          const n = d("section");
          ((n.id = `${$}-alert-dialog`),
            (n.tabIndex = -1),
            n.setAttribute("role", "alertdialog"),
            n.setAttribute("aria-modal", "true"),
            n.setAttribute("aria-labelledby", `${$}-alert-title`),
            n.setAttribute("aria-describedby", `${$}-alert-message`));
          const o = d("h2");
          ((o.id = `${$}-alert-title`), (o.textContent = "Lyrania notice"));
          const r = d("p");
          r.id = `${$}-alert-message`;
          const i = d("div");
          i.id = `${$}-alert-actions`;
          const a = P("OK");
          return (
            (a.id = `${$}-alert-ok`),
            i.appendChild(a),
            n.append(o, r, i),
            t.appendChild(n),
            e.body.appendChild(t),
            { overlay: t, dialog: n, message: r, okButton: a }
          );
        })();
        ((l = { messageText: r.shift(), ...t }),
          (a = 1),
          (s = 0),
          (f = 0),
          g(),
          (l.message.textContent = o(l.messageText ?? "")),
          (l.overlay.hidden = 0));
        try {
          l.dialog.focus({ preventScroll: 1 });
        } catch (t) {
          l.dialog.focus();
        }
      }
      function k(t = 0) {
        l &&
          ((l.overlay.hidden = 1),
          (l = null),
          (s = 0),
          (f = 0),
          t && ((a = 1), g()),
          y(S, 0));
      }
      (m(
        "keydown",
        (t) => {
          b(t) &&
            ((i = 1),
            g(),
            (l || a) &&
              (t.preventDefault(),
              t.stopImmediatePropagation(),
              l && s && !t.repeat && k(1)));
        },
        1,
      ),
        m(
          "keyup",
          (t) => {
            b(t) &&
              ((i = 0),
              (l || a) &&
                (t.preventDefault(), t.stopImmediatePropagation(), w()));
          },
          1,
        ),
        p(
          "pointerdown",
          (t) => {
            l &&
              ((f = t.isTrusted && 0 === t.button && t.target === l.okButton),
              l.dialog.contains(t.target) ||
                (t.preventDefault(), t.stopImmediatePropagation()));
          },
          1,
        ),
        p(
          "pointercancel",
          () => {
            f = 0;
          },
          1,
        ),
        p(
          "click",
          (t) => {
            if (l) {
              if (t.target === l.okButton) {
                const e = f;
                return (
                  (f = 0),
                  t.preventDefault(),
                  t.stopImmediatePropagation(),
                  void (e && k(0))
                );
              }
              ((f = 0),
                l.dialog.contains(t.target) ||
                  (t.preventDefault(), t.stopImmediatePropagation()));
            }
          },
          1,
        ));
      const x = function (t) {
        (r.push(t), S());
      };
      return (
        (x.lyraniaHeldEnterAlertGuardVersion = C),
        (x.lyraniaNativeAlert = n),
        (t.alert = x),
        1
      );
    },
    function () {
      if (!v.bufferXp) return 1;
      if (t.updategems?.lyraniaBufferXpWrapperVersion === C) return 1;
      if ("function" != typeof t.updategems || !u("expli")) return 0;
      it = (function () {
        const t = et(u("lvlli")?.textContent),
          e = f("#expli [data-tippy-content]")?.getAttribute(
            "data-tippy-content",
          ),
          n = o(e || "").match(/^\s*([\d,]+)/),
          r = n ? et(n[1]) : 0;
        return t > 0 && r >= 0 ? { level: t, bufferXp: r } : null;
      })();
      const e = t.updategems,
        n = async function (...t) {
          const n = await e.apply(this, t);
          return (
            (function (t) {
              const e = et(t[11]),
                n = et(t[12]),
                o = u("expli");
              if (!e || !o) return;
              const a = (function (t, e) {
                  if (t < 1) return 1;
                  const n = (2 * t - 1) ** 2 + (8 * e) / 25;
                  return b(1, (1 + i.sqrt(b(0, n))) / 2);
                })(e, n),
                s = g(a + r.EPSILON),
                c = (function () {
                  for (const t of [
                    "#content",
                    "#popupresponse",
                    "#popup",
                    "#rightinfo",
                  ]) {
                    const e = f(t),
                      n = ot(e);
                    if (n > 0) return n;
                    const o = nt(e?.textContent);
                    if (o > 0) return o;
                  }
                  return 0;
                })(),
                l = (function (t, e, n) {
                  if (!t || e < t.level) return 0;
                  const o = e - t.level,
                    a = o > 0 ? (25 * o * (t.level + e - 1)) / 2 : 0,
                    s = n - t.bufferXp + a;
                  return r.isFinite(s) && s > 0 ? i.round(s) : 0;
                })(it, e, n),
                p = c || l;
              it = { level: e, bufferXp: n };
              const m = p > 0 ? ` (${rt(p, s)})` : "",
                y = d("span");
              ((y.dataset.tippyContent = `${n.toLocaleString()}/${(25 * e).toLocaleString()} XP`),
                (y.textContent = `${s.toLocaleString()}${m}`),
                o.replaceChildren(y));
            })(t),
            n
          );
        };
      ((n.lyraniaBufferXpWrapperVersion = C), (t.updategems = n));
      const a = u("content");
      if (a) {
        let t = 0;
        new c(() => {
          t ||
            ((t = 1),
            requestAnimationFrame(() => {
              ((t = 0), at());
            }));
        }).observe(a, { childList: 1, characterData: 1, subtree: 1 });
      }
      at();
      const s = u("expli")?.previousElementSibling;
      return (s && (s.textContent = "Buffer Level:"), 1);
    },
    function () {
      if (!v.persistentLootLog) return 1;
      const e = u("lootlog"),
        o = u("chattabs"),
        i = u("chatpanes"),
        a = u("chatwindow"),
        s = u("inputchat"),
        c = u("chatbutton");
      if (!(e && o && i && a && s && c && "function" == typeof t.lootlog))
        return 0;
      if (t.lootlog.lyraniaPersistentLootWrapper) return 1;
      (e.classList.add(`${$}-loot-layout`),
        o.classList.add(`${$}-chat-loot-split`));
      const l = d("section");
      l.id = `${$}-chat-column`;
      const p = d("div");
      ((p.id = `${$}-chat-composer`),
        i.insertBefore(l, a),
        p.append(s, c),
        l.append(p, a));
      const f = d("section");
      f.id = `${$}-loot-summary`;
      const m = d("section");
      ((m.id = `${$}-loot-messages`),
        Array.from(e.children).forEach((t) => {
          m.appendChild(yt(t));
        }),
        ht(m),
        e.append(f, m));
      const y = (function () {
        const t = lt();
        try {
          const e = JSON.parse(localStorage.getItem(ct()));
          if (!e || "object" != typeof e) return t;
          ((t.totalDrops = b(0, r(e.totalDrops) || 0)),
            n.keys(t.loot).forEach((n) => {
              const o = e.loot?.[n];
              o &&
                ["total", "base", "bonus", "drops"].forEach((e) => {
                  t.loot[n][e] = b(0, r(o[e]) || 0);
                });
            }));
        } catch (t) {}
        return t;
      })();
      mt(y);
      const h = t.lootlog,
        g = function (t) {
          const n = h.apply(this, arguments),
            o = e.querySelector(":scope > .lootlogitem");
          return (
            o && (m.prepend(yt(o)), ht(m)),
            (function (t, e) {
              const n = pt(t);
              return n
                ? (function (t, e, n, o = 0) {
                    const i = t.loot[e];
                    if (!i) return 0;
                    const a = b(0, r(n) || 0),
                      s = b(0, r(o) || 0);
                    return (
                      (i.base += a),
                      (i.bonus += s),
                      (i.total += a + s),
                      (i.drops += 1),
                      (t.totalDrops += 1),
                      1
                    );
                  })(e, n.type, n.base, n.bonus)
                : 0;
            })(t, y) && (ut(y), mt(y)),
            n
          );
        };
      return ((g.lyraniaPersistentLootWrapper = 1), (t.lootlog = g), 1);
    },
    function () {
      if (!v.isolatedInventoryRequests) return 1;
      const e = t.inventorySimple;
      if (e?.lyraniaIsolatedInventoryVersion === C) return 1;
      if ("function" != typeof e) return 0;
      const n = new Set([
          "purchase_lockbox",
          "use_lockbox",
          "conjure_enchant",
          "add_jewel_mod",
          "add_jewel_mod_confirm",
          "map_trade",
        ]),
        i = (t) => u(t)?.value || "",
        s = function (...e) {
          const s = o(e[1] || ""),
            c = r.parseInt(e[2], 10),
            l = u("popupresdisplay"),
            d =
              "enchants" === e[0] && "enchant_table_state" === s
                ? (l?.scrollTop ?? null)
                : null;
          if ("loadout" === s && 1 === c) {
            const n = t.prompt("What would you like to call this loadout?");
            if (!n) return void y(() => t.inventorySimple("jewellery"), 0);
            ((e[3] = n), (e[4] = i("pet")));
          } else
            "loadout" !== s ||
              (2 !== c && 3 !== c) ||
              ((e[3] = i("loadout")), (e[4] = i("pet")));
          if (
            ("use_lockbox" === s && (e[2] = i("lockboxquant")),
            "purchase_lockbox" === s && (e[2] = i("buy_lockboxquant")),
            "remove_enchant_confirm" === s &&
              (e[3] = a(u("enchantsavable")?.checked)),
            n.has(s) &&
              "function" == typeof t.lockInventoryActionButton &&
              !t.lockInventoryActionButton(s))
          )
            return;
          const p = new URLSearchParams({ tab: o(e[0] || "jewellery") });
          void 0 !== e[1] && p.set("action", o(e[1]));
          for (let t = 2; t < e.length; t += 1)
            void 0 !== e[t] && p.set("extrainfo" + (t - 1), o(e[t]));
          xt += 1;
          const m = xt;
          kt && kt.readyState !== XMLHttpRequest.DONE && kt.abort();
          const h = new XMLHttpRequest();
          ((kt = h),
            h.open("POST", "inventory_simplified.php", 1),
            (h.timeout = 2e4),
            h.setRequestHeader(
              "Content-Type",
              "application/x-www-form-urlencoded",
            ),
            (h.onload = () => {
              if (m !== xt) return;
              if (((kt = null), h.status < 200 || h.status >= 300))
                return void It(
                  "Inventory request failed. Use Refresh to try again.",
                );
              const n = h.responseText.split("[BREAK]");
              if (1 === t.popupui && "function" == typeof t.openpopuppane)
                t.openpopuppane(n[0]);
              else {
                const t = u("content");
                t && (t.innerHTML = n[0]);
              }
              (n.slice(1).forEach((e) => {
                if (e.trim())
                  try {
                    t.eval(e);
                  } catch (t) {}
              }),
                "function" == typeof t.InventoryPageInit &&
                  t.InventoryPageInit(),
                "consumables" === e[0] &&
                  "function" ==
                    typeof t.renderInventoryConsumableInlineResult &&
                  t.renderInventoryConsumableInlineResult());
              const o = a(f(`#${$}-inventory-content > #inventory_shell`));
              !o && null !== d && l
                ? (l.scrollTop = d)
                : !o &&
                  "enchants" === e[0] &&
                  void 0 !== e[1] &&
                  l &&
                  l.scrollTo({ top: 0, behavior: "smooth" });
            }));
          const b = () => {
            m === xt &&
              ((kt = null),
              It("Inventory request failed. Use Refresh to try again."));
          };
          return ((h.onerror = b), (h.ontimeout = b), h.send(p.toString()), h);
        };
      return (
        (s.lyraniaIsolatedInventoryVersion = C),
        (s.lyraniaOriginalInventorySimple = e),
        (t.inventorySimple = s),
        1
      );
    },
    function () {
      if (!v.persistentInventory) return 1;
      if (
        !(function () {
          const n = u("holder");
          if (!n) return null;
          let o = u(`${$}-inventory-dock`);
          if (o) return o;
          ((o = d("aside")),
            (o.id = `${$}-inventory-dock`),
            o.setAttribute("aria-labelledby", `${$}-inventory-title`),
            o.setAttribute("aria-busy", "true"),
            (o.innerHTML = `<header id="${$}-inventory-bar"><span id="${$}-inventory-heading"><span id="${$}-inventory-title-line"><strong id="${$}-inventory-title">Inventory</strong><span id="${$}-inventory-status" role="status" aria-live="polite">Waiting for the game to finish loading…</span></span></span><button type="button" id="${$}-inventory-refresh">Refresh</button></header><div id="${$}-inventory-scroll"><div id="${$}-inventory-content"></div></div>`));
          const r = u("chat_row");
          return (
            n.insertBefore(o, r || null),
            n.classList.add(`${$}-has-inventory-dock`),
            e.documentElement.classList.add(`${$}-persistent-inventory`),
            o
              .querySelector(`#${$}-inventory-refresh`)
              ?.addEventListener("click", () => {
                "function" == typeof t.inventorySimple &&
                  t.inventorySimple(Lt());
              }),
            o
          );
        })()
      )
        return 0;
      if (
        !(function () {
          const e = t.openpopuppane;
          if (e?.lyraniaPersistentInventoryRouterVersion === C) return 1;
          if ("function" != typeof e) return 0;
          const n = function (t) {
            if (
              !(function (t) {
                if ("string" != typeof t || !t.includes("inventory_shell"))
                  return 0;
                const e = d("template");
                return (
                  (e.innerHTML = t.trim()),
                  Tt(e.content.querySelector("#inventory_shell"))
                );
              })(t)
            )
              return e.apply(this, arguments);
          };
          return (
            (n.lyraniaPersistentInventoryRouterVersion = C),
            (n.lyraniaOriginalOpenPopupPane = e),
            (t.openpopuppane = n),
            1
          );
        })() ||
        !(function () {
          const n = t.inventorySimple;
          if (n?.lyraniaPersistentInventoryVersion === C) return 1;
          if ("function" != typeof n) return 0;
          const o = function (...t) {
            const { scroll: o } = At(),
              r = Lt(),
              i = Et(t[0], r);
            ((vt = ["mainnav", "popupnav"].includes(e.activeElement?.id)),
              (gt = { tab: i === r ? r : null, top: o?.scrollTop || 0 }),
              It(
                f(`#${$}-inventory-content > #inventory_shell`)
                  ? "Refreshing inventory…"
                  : "Loading inventory…",
                1,
              ));
            try {
              return n.apply(this, t);
            } catch (t) {
              throw (
                (vt = 0),
                (gt = null),
                It("Inventory could not be loaded. Use Refresh to try again."),
                t
              );
            }
          };
          return (
            (o.lyraniaPersistentInventoryVersion = C),
            (o.lyraniaOriginalInventorySimple = n),
            (t.inventorySimple = o),
            1
          );
        })()
      )
        return 0;
      if (
        (function () {
          const t = f("#popup #inventory_shell, #content #inventory_shell");
          return t ? Tt(t) : 0;
        })()
      )
        return 1;
      let n = 0;
      const o = () => {
        n || ((n = 1), qt());
      };
      return (
        p(
          "battleContentLoaded",
          () => {
            y(o, 5e3);
          },
          { once: 1 },
        ),
        y(o, 8e3),
        1
      );
    },
    function () {
      if (!v.popupOutsideClose) return 1;
      const n = "data-lyrania-popup-outside-close-version";
      if (e.documentElement.getAttribute(n) === C) return 1;
      let o = 0;
      const r = () => {
          const t = u("popupholder");
          return t &&
            "visible" === l(t).visibility &&
            ["popup", "popupresponse"].some((t) => {
              const e = u(t);
              return e && (e.childElementCount > 0 || e.textContent.trim());
            })
            ? t
            : null;
        },
        i = (t) => t instanceof Element && a(t.closest(`#${$}-inventory-dock`)),
        s = () => {
          const e = r();
          return e
            ? ("function" == typeof t.closepage
                ? t.closepage()
                : (e.style.visibility = "hidden"),
              1)
            : 0;
        };
      return (
        p(
          "pointerdown",
          (t) => {
            const e = r();
            o = a(e && 0 === t.button && !e.contains(t.target) && !i(t.target));
          },
          1,
        ),
        p(
          "pointercancel",
          () => {
            o = 0;
          },
          1,
        ),
        p(
          "click",
          (t) => {
            const e = r(),
              n = o && e && !e.contains(t.target) && !i(t.target);
            ((o = 0),
              n && (t.preventDefault(), t.stopImmediatePropagation(), s()));
          },
          1,
        ),
        p(
          "keydown",
          (t) => {
            "Escape" === t.key && r() && (t.preventDefault(), s());
          },
          1,
        ),
        e.documentElement.setAttribute(n, C),
        1
      );
    },
    function () {
      if (!v.dungeonMapSummary) return 1;
      if (t.dungeonmap?.lyraniaDungeonMapSummaryWrapper) return 1;
      if ("function" != typeof t.dungeonmap) return 0;
      const n = t.dungeonmap,
        o = function (...t) {
          const o = n.apply(this, t);
          return (
            (function () {
              if (Rt()) return;
              let t = 0;
              const n = new c(() => {
                t ||
                  ((t = 1),
                  requestAnimationFrame(() => {
                    ((t = 0), Rt() && n.disconnect());
                  }));
              });
              (n.observe(u("popup") || e.body, { childList: 1, subtree: 1 }),
                y(() => n.disconnect(), 15e3));
            })(),
            o
          );
        };
      return ((o.lyraniaDungeonMapSummaryWrapper = 1), (t.dungeonmap = o), 1);
    },
    function () {
      if (!v.actionTimerFix || t.__lyraniaActionTimerFixInstalled) return 1;
      const n = [
          "auto",
          "improvedauto",
          "battle",
          "improvedbattle",
          "dungeonbattle",
          "improveddungeonbattle",
        ],
        i = [
          "timer",
          "timer2",
          "finishActionTimer",
          "scheduleServerAction",
          "clearServerAction",
          "performnav",
          "guildpage",
          "boss",
          "gboss",
          ...n,
          "moblist",
          "improvedmoblist",
          "map",
          "gmap",
        ];
      if (!t.jQuery || i.some((e) => "function" != typeof t[e])) return 0;
      t.__lyraniaActionTimerFixInstalled = 1;
      const s = t.timer,
        d = t.scheduleServerAction,
        m = t.finishActionTimer,
        h = new Set(),
        g = [
          "#content .kung_fu_button",
          "#content #bb",
          "#content #attackboss",
          '#content [onclick*="auto("]',
          '#content [onclick*="battle("]',
          '#content [onclick*="boss("]',
          '#content [onclick*="gboss("]',
        ].join(",");
      let $ = 0,
        C = 0,
        w = 0,
        S = null,
        k = null,
        x = 0,
        E = 0,
        A = 0;
      function L() {
        try {
          const t =
            "undefined" == typeof actionTimerEndsAt ? 0 : r(actionTimerEndsAt);
          if (t > 0) return t;
          const e = b(
            "undefined" == typeof timertime ? 0 : r(timertime) || 0,
            "undefined" == typeof timer2time ? 0 : r(timer2time) || 0,
          );
          return e > 0 ? Z() + e : 0;
        } catch (t) {
          return 0;
        }
      }
      function I() {
        return b(0, b(L(), w) - Z());
      }
      const T = [
        "#content input#bb",
        "#content button#bb",
        "#content #attackboss",
        '#content input[type="button"][value="Attack!"]',
        '#content input[type="button"][value="Fight"]',
        '#content input[type="button"][value="Continue"]',
      ].join(",");
      function q() {
        const t = u("timer");
        (t &&
          (S
            ? (t.dataset.lyraniaActionQueued = "true")
            : delete t.dataset.lyraniaActionQueued),
          e.querySelectorAll("[data-lyrania-queued-control]").forEach((t) => {
            delete t.dataset.lyraniaQueuedControl;
          }),
          S?.source?.isConnected &&
            (S.source.dataset.lyraniaQueuedControl = "true"));
      }
      function R() {
        const t = f("#capt, #captchadiv");
        return a(t && t.getClientRects().length > 0);
      }
      function _() {
        if (I() > 0 || $ > 0 || S) return;
        if (R()) return;
        const t = u("popupholder");
        if (t && "visible" === l(t).visibility) return;
        const n = e.activeElement;
        if (n && n !== e.body && n !== e.documentElement && n.isConnected)
          return;
        const o = [...e.querySelectorAll(T)].find(
          (t) =>
            !t.disabled &&
            !t.closest("#capt, #captchadiv") &&
            t.getClientRects().length > 0 &&
            "hidden" !== l(t).visibility,
        );
        if (o)
          try {
            o.focus({ preventScroll: 1 });
          } catch (t) {
            o.focus();
          }
      }
      function D() {
        ((S = null), k && t.clearServerAction(k), (k = null), q());
      }
      function B() {
        ((x = 0), (E = 0));
      }
      function P(e = 0, n = 0) {
        (e && D(),
          (w = b(w, L())),
          (A = a(n)),
          (function () {
            (h.forEach((e) => t.clearServerAction(e)), h.clear());
            try {
              const t =
                ("undefined" != typeof autoing && 0 !== r(autoing)) ||
                ("undefined" != typeof am && r(am) > 0) ||
                ("undefined" != typeof funcheck && a(funcheck));
              ("undefined" != typeof varstopauto && (varstopauto = 1),
                "undefined" != typeof autoing && (autoing = 0),
                "undefined" != typeof am && (am = 0),
                "undefined" != typeof stopboss && (stopboss = 1),
                "function" == typeof clearAutoBattleResumeState &&
                  clearAutoBattleResumeState(),
                t &&
                  fetch("stopauto.php", { credentials: "same-origin" }).catch(
                    () => {},
                  ));
            } catch (t) {}
          })(),
          (C = 1),
          q());
      }
      function H(t) {
        ((C = 0), (w = 0), (A = 0));
        try {
          ("boss" === t && "undefined" != typeof stopboss && (stopboss = 0),
            "boss" !== t &&
              "undefined" != typeof varstopauto &&
              (varstopauto = 0));
        } catch (t) {}
      }
      function j(e = I()) {
        S &&
          (k && t.clearServerAction(k),
          (k = d.call(t, b(0, e), () => {
            ((k = null), M());
          })));
      }
      function M() {
        if (!S) return;
        const e = I();
        if (e > 0 || $ > 0) return (q(), void j(e || 100));
        const n = S;
        D();
        try {
          m.call(t);
        } catch (t) {}
        (H(n.type), n.original.apply(n.context, n.args));
      }
      function F(t, n, o, r) {
        if ($ > 0) return;
        if (I() <= 0) return (H(t), n.apply(o, r));
        const i = e.activeElement,
          a = i?.matches?.(g) ? i : null;
        ((S = { type: t, original: n, context: o, args: r, source: a }),
          q(),
          j());
      }
      function O(e, n) {
        const o = t[e];
        t[e] = function (...t) {
          return n(o, this, t);
        };
      }
      ((t.scheduleServerAction = function (t, e) {
        if (
          !(function (t) {
            return /\b(?:fun|boss|gboss|dungeonbattle|improveddungeonbattle)\s*\(/.test(
              Function.prototype.toString.call(t),
            );
          })(e)
        )
          return d.apply(this, arguments);
        let n;
        return (
          (n = d.call(this, t, function (...t) {
            return (h.delete(n), e.apply(this, t));
          })),
          h.add(n),
          n
        );
      }),
        (t.timer = function (t, ...e) {
          const n = b(0, r(t) || 0);
          if (!C) return ((w = 0), (A = 0), s.call(this, n, ...e));
          const o = Z(),
            i = b(0, w - o),
            a = b(A ? n : 0, i);
          w = a > 0 ? o + a : 0;
          const c = s.call(this, a, ...e);
          return (q(), c);
        }),
        (t.timer2 = function (...e) {
          return t.timer.apply(this, e);
        }),
        t.jQuery(e).on("ajaxSend.lyraniaActionTimerFix", (t, e, n) => {
          const r = o(n?.url || "")
            .split("?")[0]
            .toLowerCase();
          /(?:^|\/)(?:auto|improvedauto|battle|improvedbattle|dungeonbattle|improveddungeonbattle|bosses|gboss)\.php$/.test(
            r,
          ) &&
            (($ += 1),
            e.always(() =>
              y(() => {
                (($ = b(0, $ - 1)), M());
              }, 0),
            ));
        }),
        (t.finishActionTimer = function (...t) {
          const n = m.apply(this, t);
          return (
            R() &&
              e.activeElement?.closest?.("#capt, #captchadiv") &&
              e.activeElement.blur(),
            M(),
            y(_, 0),
            n
          );
        }),
        p(
          "click",
          (t) => {
            const e = t.target.closest?.(
              '#content input[type="button"], #content input[type="submit"], #content button',
            );
            if (!e) return;
            const n = o(e.value || e.textContent || "")
              .trim()
              .toLowerCase();
            /^(?:attack!?|fight!?)$/.test(n)
              ? ((x = 1), (E = 0))
              : "continue" === n && ((E = x), (x = 0));
          },
          1,
        ),
        O("performnav", (t, e, n) => (B(), P(1, 0), t.apply(e, n))),
        ["moblist", "improvedmoblist"].forEach((t) =>
          O(t, (t, e, n) => {
            const o = E;
            return (B(), P(0, o), t.apply(e, n));
          }),
        ),
        O("map", (t, e, n) => (B(), P(0, 0), t.apply(e, n))),
        O("gmap", (t, e, n) => (P(0, 0), t.apply(e, n))),
        O(
          "guildpage",
          (t, e, n) => (11 === r(n[0]) && (B(), P(0, 0)), t.apply(e, n)),
        ),
        n.forEach((t) => O(t, (t, e, n) => F("regular", t, e, n))),
        ["boss", "gboss"].forEach((t) =>
          O(t, (t, e, n) =>
            1 === r(n[0]) ? F("boss", t, e, n) : (B(), P(0, 0), t.apply(e, n)),
          ),
        ));
      const N = u("content");
      if (N) {
        let e = 0;
        new c(() => {
          ((C || S) && q(),
            e && t.cancelAnimationFrame(e),
            (e = t.requestAnimationFrame(() => {
              ((e = 0), _());
            })));
        }).observe(N, { childList: 1, subtree: 1 });
      }
      return (y(_, 0), 1);
    },
  ];
  (!(async function () {
    const t = (function () {
      try {
        const t = JSON.parse(localStorage.getItem(S));
        return t?.url === w && "string" == typeof t.css ? t.css : "";
      } catch (t) {
        return "";
      }
    })();
    t && j(t);
    try {
      const t = await fetch(w, { cache: "no-cache", credentials: "omit" });
      if (!t.ok) throw new Error(`GitHub returned HTTP ${t.status}`);
      const e = await t.text();
      if (!j(e))
        throw new Error("The downloaded theme was not valid CSS text.");
      try {
        localStorage.setItem(S, JSON.stringify({ url: w, css: e }));
      } catch (t) {}
    } catch (t) {}
  })(),
    _t.forEach((t) => {
      try {
        t();
      } catch (t) {}
    }));
})();
