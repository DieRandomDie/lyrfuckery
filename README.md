# Lyrania Mod Suite

The Lyrania Mod Suite is a configurable userscript and responsive theme for Lyrania 3.1 and 4.0. It preserves the 3.1-style workspace on both game versions while adding persistent inventory and menu panels, compact battle information, chat tools, timer fixes, local loot statistics, and a responsive desktop/mobile layout.

## Current versions

| Component | Version | Purpose |
| --- | ---: | --- |
| `lyrania-mod-suite.user.js` | 2.23.5 | Userscript behavior and compatibility layer |
| `lyrania-modern-responsive-theme.css` | 1.8.1 | Shared styling and responsive layout |

## Installation

Install the userscript from its raw GitHub URL:

<https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-mod-suite.user.js>

Tampermonkey and compatible userscript managers use the script's `@updateURL` and `@downloadURL` headers to update it from the `main` branch.

## Configuration

Every optional mod is controlled near the top of the userscript in the `MODS` object. Change `true` to `false` to disable a feature, save the script, and reload Lyrania.

```js
const MODS = Object.freeze({
  compactHeader: true,
  chatChannelSidebar: true,
  chatQuickMenu: true,
  tripleDpHour: true,
  killsPerHour: true,
  hideInactiveDpTimers: true,
  actionTimerFix: true,
  bufferXp: true,
  persistentLootLog: true,
  persistentInventory: true,
  isolatedInventoryRequests: true,
  compactBattleResults: true,
  inlinePopupDock: true,
  dungeonMapSummary: true,
});
```

There is no separate settings window. All 14 mods are enabled by default.

## Feature summary

| Toggle | Main effect | Saved between reloads |
| --- | --- | --- |
| `compactHeader` | Rebuilds the header and moves status information into it | No |
| `chatChannelSidebar` | Adds channel selection and per-channel All-view controls | Yes |
| `chatQuickMenu` | Adds player actions when a chat name is clicked | No |
| `tripleDpHour` | Shows the scheduled Triple DP hour | No |
| `killsPerHour` | Shows today's average kills per elapsed server hour | No |
| `hideInactiveDpTimers` | Hides inactive 2×, 3×, and 4× DP rows | No |
| `actionTimerFix` | Preserves cooldowns, queues actions, and prevents duplicate attacks | Runtime state only |
| `bufferXp` | Shows projected buffer level and per-action change | No |
| `persistentLootLog` | Adds saved account-specific loot totals beside chat | Yes |
| `persistentInventory` | Keeps all inventory tabs in a permanent responsive pane | Runtime tab/scroll state only |
| `isolatedInventoryRequests` | Separates inventory traffic from combat traffic | No |
| `compactBattleResults` | Shortens and tightens battle result output | No |
| `inlinePopupDock` | Embeds menu pages beside Equipment and remembers the last page | Yes |
| `dungeonMapSummary` | Adds room totals and removes non-chest map imagery | No |

## Mod details

### `compactHeader`

Rebuilds the top of the game into a compact, shared layout for Lyrania 3.1 and 4.0.

- Keeps the original character and currency/resource header panels.
- Removes the separate gem and combat-stat header panels from the visible layout.
- Moves the former left-side status panel into the header, freeing the action row for the action pane, Equipment, and the inline menu pane.
- Groups status information into four sections:
  - Server information: server time, Triple DP hour when enabled, unread mail, support tickets, quest number, and quest progress.
  - Current tradeskill jobs, kept on single lines when space permits.
  - Jade Rain and active DP bonus timers.
  - Weekly GDP, today's kills, completed quests, prize tickets, and kills per hour when enabled.
- Reduces the quest tracker to only `Quest Number` and `Progress` while retaining the native quest link and live progress element.
- Watches the quest tracker and reapplies the compact form when the game updates it.
- Uses the Lyrania 4.0 menu organization on both game versions:
  - **Stats:** Players Online and Rankings.
  - **Community:** Official Wiki and Discord.
  - **Game:** Token Shop and Updates.
  - **Chat:** Commands and Rules.
  - **Info:** FAQ and Polls.
  - **Account:** Problem?! and Logout.
- Places any unrecognized future menu links in a `More` group instead of discarding them.
- Reuses the game's original links, so their native actions and URLs remain intact.
- Keeps the header menu static; it is not a dropdown.
- Adapts the header into one, two, or several rows according to available width.

### `chatChannelSidebar`

Replaces the native chat-channel select box with a persistent channel sidebar.

- Builds its channel list from the game's live `<select>` options rather than relying on one fixed list.
- Supports standard, numbered, and custom chat channels.
- Normalizes several compact native labels for readability, including Games Room, Guild Boss, New Players, Iced Raffle, and Cats Cafe.
- Adds an `All` view and a direct view for each channel.
- Adds an `On`/`Off` control beside each toggleable channel to decide whether it appears in `All`.
- Keeps Whispers visible in every filtered view so replies are not missed.
- Gives Global Chat its own selection and `All`-view toggle.
- Re-enables the matching native game stream when the mod needs a channel that the game's own controls currently have disabled.
- Filters both existing messages and new messages added to the chat window.
- Resizes the sidebar to follow the current chat-panel height.
- Saves the selected channel, the enabled `All` channels, and Global Chat visibility in local storage.

#### Global Chat matching

The Global view includes native global, boss, Message of the Day, bonus, and related system announcements. It also includes green `#00FF00` system lines containing either of these phrases:

- `Your Mechanical Cartography Tools`
- `Auto battle was inactive`

This targets the game's system-message color and those simple phrases without changing ordinary player chat.

### `chatQuickMenu`

Adds a player-action menu when a name is clicked in the chat window.

Available actions are:

- View Profile
- Whisper
- Send Mail
- Wire Platinum
- Wire Jade
- Wire Item

Profile and mail use the game's native functions. Whisper and wire actions prepare the appropriate slash command in the chat input and focus it for completion.

The quick menu reads the actual whisper target from the native name link whenever possible. If that value is unavailable, it removes a leading `Owner`, `Mod`, `Community`, or `Admin` title from the quick-menu target only. It does **not** alter the name displayed in chat or modify chat-line text.

The menu is positioned beside the clicked name, clamped inside the viewport, and closed by an outside click, Escape, resizing, or scrolling. It is mounted inside the chat workspace so using one of its links does not clear the retained inline menu page.

### `tripleDpHour`

Adds a `Triple DP Hour` row immediately after Server Time.

- Uses Lyrania's synchronized server timestamp when available and the browser clock only as a startup fallback.
- Calculates time in the `Europe/London` time zone.
- Uses the game's 20-hour Triple DP cycle.
- Restarts the calculation from midnight on the first day of each month.
- Displays `Now` during the current Triple DP starting hour; otherwise it displays the next start as `HH:00:00`.
- Shares one observer with other server-clock features and updates only when the displayed server minute changes.

When `compactHeader` is enabled, this row appears in the header's server-information section.

### `killsPerHour`

Adds a live `Kills Per Hour` value to the game's counter section.

- Reads today's native kill counter.
- Divides it by the exact number of server-clock hours elapsed since midnight, including minutes and seconds.
- Displays one decimal place.
- Shows `0.0` at midnight instead of dividing by zero.
- Recalculates when the displayed server clock updates.

When `compactHeader` is enabled, KPH appears with Weekly GDP, today's kills, completed quests, and prize tickets.

### `hideInactiveDpTimers`

Keeps the bonus section focused on active effects.

- Watches the native bonus display for live changes.
- Hides the complete row for Double DP, Triple DP, or Quad DP only when that timer's text is exactly `Inactive`.
- Restores the row automatically as soon as its timer becomes active.
- Does not hide Jade Rain, unrelated bonuses, or active DP timers.

### `actionTimerFix`

Coordinates Lyrania's action cooldown, combat requests, automatic actions, navigation, and keyboard focus.

#### Cooldown and queue behavior

- Preserves the exact existing server-action deadline while navigating.
- Uses the game's absolute `actionTimerEndsAt` deadline when available and falls back to the remaining native timer values.
- Queues one attempted combat action when the cooldown has not finished.
- Marks the timer and originating control while an action is queued.
- Runs the queued action only after both the cooldown and any tracked combat request have finished.
- Prevents repeated Enter presses or clicks on an old focused button from becoming duplicate attacks while a combat request is in flight.
- Tracks combat AJAX requests for normal battle, improved battle, auto battle, dungeon battle, area boss, and guild boss endpoints.
- Supports native `auto`, `improvedauto`, `battle`, `improvedbattle`, `dungeonbattle`, and `improveddungeonbattle` calls.

#### Navigation behavior

- Opening ordinary central-menu pages does not stop the auto-action timer.
- Travel and Area Boss/Bosses are the two central-menu selections that intentionally cancel a queued action and stop repeating auto actions.
- Direct map, guild map, mob-list, and applicable guild-page navigation preserve a running cooldown while stopping incompatible repeating actions.
- Entering the Battle page saves the game's auto-resume state when that native capability exists.
- Area-boss and guild-boss attacks are queued like other combat actions; opening their pages is treated as navigation.
- Clears tracked native auto schedules and posts the native `stopauto.php` request only when an auto action was actually running and navigation requires it to stop.

#### Manual combat and focus behavior

- Preserves the legitimate Attack/Fight → Continue cycle.
- Accepts a newly requested mob-list cooldown after a real manual Continue action.
- Avoids creating an artificial cooldown when returning to the initial Battle page or after auto completion.
- Restores focus to a visible primary Attack, Fight, or Continue control only when no cooldown, request, queue, popup, or bot check is active and focus is otherwise free.
- Never chooses a CAPTCHA control as the primary action.
- Blurs an already focused bot-check control when the native timer finishes.
- Does not intercept, replace, delay, or modify browser `alert()` dialogs.

This mod depends on Lyrania's native jQuery instance and action functions. If required native functions are unavailable, it leaves the game behavior untouched and reports an initialization warning in the console.

### `bufferXp`

Replaces the header's Buffer XP percentage with projected buffer-level information.

- Changes the label to `Buffer Level`.
- Calculates the whole level at which the current buffer would be exhausted using Lyrania's increasing XP-per-level cost.
- Retains the exact buffer XP and current level cost in the value's tooltip.
- Finds the most recent action XP from exact titled reward values first, then from rendered Money/Exp or Experience text.
- Understands plain numbers and `K`, `M`, `B`, and `T` suffixes.
- If reward text is unavailable, derives gained XP from the difference between consecutive header updates, including XP spent on levels gained.
- Shows the projected per-action buffer change as a signed value such as `+0.25 per action` or `-0.40 per action`.
- Watches battle content so a reward rendered after the header update can still correct the displayed per-action rate.

### `persistentLootLog`

Turns the native Loot Log into a saved statistics panel beside chat.

#### Layout

- Places the chat stream and Loot Log side by side on larger layouts.
- Moves the chat input and Chat button into a dedicated composer above the chat stream.
- Splits the Loot Log into an expandable statistics summary and a compact recent-message list.
- Preserves which statistic cards are expanded when totals rerender.
- Keeps at most 100 compact loot messages in the visible list.

#### Tracked loot

The suite records total amount, base amount, bonus amount, and number of drops for:

- Jade
- Jewel fragments
- Currency
- Tokens
- Diamonds
- Sapphires
- Rubies
- Emeralds
- Opals
- Health
- Attack
- Defence
- Accuracy
- Evasion

Currency is normalized internally to copper units and displayed again as platinum, gold, silver, and copper. The parser recognizes stat gains, token sources, standard found-item lines, currency rewards, and `(base + level bonus)` breakdowns. The native `Welcome to Lyrania!` entry is not counted as loot.

Each account gets a separate saved statistics record based on the game's user ID or username. `Reset` asks for confirmation and clears only the current account's saved totals. The game still receives every native loot-log call before the suite compacts, parses, and saves it.

### `persistentInventory`

Moves simplified inventory out of transient popups and into a permanent responsive panel.

- Supports all six inventory tabs: Jewellery, Enchants, Maps/Orbs, Consumables, Resources/Potions, and Misc.
- Adds a persistent Inventory title, loading/error status, Refresh button, and independently scrolling content area.
- Routes inventory markup from the game's popup response into the dock without duplicating the inventory shell.
- Moves an already-open inventory shell into the dock during initialization when possible.
- Loads Jewellery after the game reaches its initial battle content, with a timed fallback if that event has already passed.
- Uses a watchdog, one automatic retry, and a clear manual-refresh message if the initial request does not respond.
- Preserves scroll position when the current tab refreshes.
- Starts a newly selected tab at the top.
- Scrolls a rendered Consumables result into view when appropriate.
- Hides the old popup shell only when the inventory content actually came from that popup.
- Resets the central selector to Battle after inventory is mounted so Inventory does not become the retained menu page.
- Keeps inventory clicks inside Lyrania's recognized workspace. Clicking tabs, controls, items, or blank inventory space therefore does not close or empty the independent inline menu pane.

The theme gives the dock its own scrollbar and responsive layouts for every inventory tab. Wide inventory tables are condensed into readable grid/card rows rather than forcing horizontal page scrolling.

### `isolatedInventoryRequests`

Separates simplified-inventory requests from Lyrania's combat request path.

- Sends inventory actions directly to the native `inventory_simplified.php` endpoint through a dedicated `XMLHttpRequest`.
- Prevents inventory refreshes and item actions from interrupting the action/auto timer's request tracking.
- Aborts an older inventory request when a newer inventory request supersedes it, so stale responses cannot overwrite the newest tab.
- Rejects stale response handlers using a request sequence number.
- Uses a 20-second request timeout and reports failures in the persistent Inventory status bar.
- Preserves native response-script execution and runs `InventoryPageInit` afterward.
- Runs the native inline Consumables-result renderer where available.
- Preserves Enchants popup scroll for table-state changes when inventory is not docked, and otherwise maintains the dock's scroll behavior.

Native inventory action details retained by the wrapper include:

- Creating, loading, and deleting named loadouts, including the selected pet.
- Reading lockbox purchase/use quantities from their current controls.
- Passing the `saveable enchant` checkbox for enchant removal.
- Respecting Lyrania's anti-race lock for lockbox, enchant, jewel-mod, and map-trade actions.
- Encoding all extra action arguments using the same `extrainfo` fields expected by the game endpoint.

This mod is most useful with `persistentInventory`, but its request isolation can still wrap the native simplified-inventory function independently.

### `compactBattleResults`

Condenses battle output so the action pane can remain narrower without losing live data or controls.

- Applies only while a battle-result container is present.
- Renames `Dealt` to `Dmg` and `Taken` to `Took`.
- Shortens a victory line to `Win · [rounds] rounds`.
- Shortens Guild Money/Exp, Guild Statue Drops, DP per Kill, and Dungeon Treasury lines.
- Reduces Double, Triple, Quad, and Decuple dungeon-point announcements to `2× DP`, `3× DP`, `4× DP`, or `10× DP`, while retaining the timer.
- Reduces the auto status to `Auto · [fights] fights · [mobs] mobs`.
- Reuses the original live `autosLeft` and `mobsLeft` elements, so their values continue to update.
- Preserves removed detail in a tooltip where a text line is replaced.
- Keeps Stop/Restart and other action controls available.
- Observes action-content changes and reapplies the compact presentation after each native update.

The theme also reduces result spacing, font size, blank flex columns, redundant line breaks, and oversized controls.

### `inlinePopupDock`

Replaces floating menu popups with an embedded menu workspace in the action row.

- Places menu content after Equipment and before the separate persistent Inventory pane in the visual workspace.
- Does not move, resize, or overlay the chat panel.
- Moves the native popup holder into a fixed section instead of cloning page contents.
- Removes Lyrania 4.0's native popover behavior from that container, which avoids the version-specific stacking layer that placed it beneath Inventory.
- Disables popup dragging from the top bar because the page is now docked.
- Keeps the native popup menu select and Close action.
- Gives popup content its own scrolling area.
- Keeps the dock visible as a styled empty pane when no menu page is open, rather than allowing the layout to collapse or go blank.
- Remembers the last valid central-menu page and reopens it after the initial battle page loads.
- Waits for the initial battle request to settle before restoring that page, then verifies that content arrived and retries safely if another startup request displaced it.
- Defaults to Market only when no valid saved page exists.
- Excludes Battle, Inventory, Travel, and Bosses from the saved retained-menu choices.
- Selecting Inventory refreshes the persistent Inventory tab without replacing or clearing the retained menu page.
- Clicking within the persistent Inventory dock or the chat quick menu does not trigger the game's outside-popup close behavior.
- Escape calls the game's native close-page function when the dock currently contains an open page.

Menu selection is saved only after a real menu page opens successfully. Unsupported or removed saved values fall back safely to Market.

### `dungeonMapSummary`

Simplifies the dungeon map while preserving room navigation.

- Counts total mobs remaining.
- Counts regular rooms containing mobs.
- Counts challenge rooms containing mobs.
- Counts empty rooms.
- Writes those four totals into the native room-type summary labels.
- Hides non-chest images by making them transparent rather than removing the room elements.
- Leaves chest and open-chest icons visible.
- Wraps the game's native dungeon-map function and waits for asynchronously rendered map markup.
- Stops waiting after 15 seconds if no valid map appears.

The shared theme further replaces noisy dungeon thumbnails with compact colored room cells, increases mob-count contrast, and keeps the original clickable navigation intact.

## Shared theme and responsive behavior

The modern theme is loaded for the suite as a whole; it is not one of the 14 toggles.

- Uses a dark blue/black surface palette with consistent borders, controls, spacing, text colors, and focus states.
- Normalizes the visual scale of Lyrania 3.1 and 4.0 so their text and panel sizing match more closely.
- Makes Equipment independently scroll when its contents exceed the available height.
- Keeps the action pane compact for battle pages but gives map layouts additional width when needed.
- Styles native forms, buttons, selects, tables, tooltips, popup content, maps, inventory sections, chat, and suite-added controls.
- Keeps wide inventory data readable without horizontal viewport overflow.
- Disables or minimizes animation when the operating system requests reduced motion.

Responsive layouts are selected by viewport width:

| Width | Layout |
| ---: | --- |
| 1440 px and wider | Header, action workspace, and chat on the left; full-height sticky Inventory rail on the right |
| 800–1439 px | Fluid action workspace with Inventory in its own full-width row |
| Below 800 px | Single-column, touch-friendly flow with stacked chat, menu, Equipment, and Inventory sections |

## Lyrania 3.1 and 4.0 compatibility

The suite detects the game version from `window.lyrversion` or the document title.

- Lyrania 3.1 keeps its original DOM hierarchy.
- Lyrania 4.0 moved the action and chat rows outside the older holder element. The compatibility layer restores those two rows beneath the holder before any mod initializes, allowing both versions to use the same responsive grid.
- The 4.0-only compatibility change is structural; native page contents and game functions are still reused.
- The inline menu disables the 4.0 popover layer and uses an ordinary in-page stacking context, which prevents it from appearing beneath the Inventory rail.

The suite relies on current native element IDs and functions. If a future game update removes a required element or function, only the affected initializer should fail; the remaining mods continue initializing independently.

## Saved data

All persistent state is stored locally in the browser. The suite does not add an external account or telemetry service.

| Storage key | Contents |
| --- | --- |
| `lyrania-mod-suite:remote-theme-cache` | Last valid CSS text and its source URL |
| `lyrania-mod-suite:chat-channel-settings` | Selected chat channel, All-view channels, and Global visibility |
| `lyrania-mod-suite:loot-statistics:<account>` | Account-specific loot totals and drop counts |
| `lyrania-mod-suite:last-menu-selection` | Last valid retained inline menu page |
| `lyrania-mod-suite:update-check` | Last update-check time and latest published version seen |
| `lyrania-mod-suite:update-dismissed` | Update version dismissed with `Later` |

Clearing site storage removes these preferences and statistics. It does not alter server-side Lyrania data.

## Theme loading

On every page load, the userscript:

1. Installs the last valid cached theme immediately when its URL matches the current theme version.
2. Fetches the current CSS from GitHub with cache bypassing.
3. Validates that the response looks like CSS before installing it.
4. Replaces the cache only after a valid response is received.
5. Continues using the cached theme if GitHub is temporarily unavailable.

If neither a current cache nor the network copy is available, the JavaScript mods can still run, but their intended layout and styling may be incomplete.

## Update behavior

There are two update paths:

- **Userscript-manager updates:** Tampermonkey follows `@updateURL` and `@downloadURL`.
- **In-game update notice:** the suite checks the raw GitHub userscript at startup and then every six hours.

The in-game checker bypasses HTTP caching, reads the published `@version`, and compares numeric dot-separated version parts. When a newer version exists, it shows an `Install update` banner with a `Later` button. `Later` suppresses only that specific version. If the page is hidden and browser notification permission was already granted, the suite may also send a native notification; it does not request permission itself.

Published versions must contain only numeric dot-separated parts, such as `2.23.5` or `2.24.0`.

## Network activity

The suite adds only these requests:

- The current theme CSS from the repository.
- A periodic fetch of the userscript source for version checking.
- Same-origin `inventory_simplified.php` requests when inventory isolation is enabled.
- A same-origin `stopauto.php` request when navigation intentionally stops a running auto action.

No gameplay credentials are sent to GitHub, and GitHub fetches use omitted credentials.

## Publishing an update

1. Update both the userscript metadata `@version` and the `SCRIPT_VERSION` constant to the same larger numeric version.
2. If the CSS changed, update its `Version:` comment and the version query on `REMOTE_THEME_URL`.
3. Keep the raw GitHub update/download URLs pointed at the published userscript on `main`.
4. Validate the JavaScript before publishing, for example with `node --check lyrania-mod-suite.user.js`.
5. Commit and push the userscript, CSS, and this README together.

## Troubleshooting

### Tampermonkey does not find an update

- Confirm the installed metadata still contains the raw GitHub `@updateURL` and `@downloadURL` lines.
- Confirm the published `@version` is strictly greater than the installed version.
- Use numeric dot-separated versions only.
- Confirm you are viewing the raw userscript rather than the GitHub HTML page.
- Tampermonkey's own schedule can delay its check; the suite's in-game notice checks separately every six hours.

### The layout looks stale after a CSS update

Reload once so the new versioned CSS URL can replace the cached copy. If necessary, remove `lyrania-mod-suite:remote-theme-cache` from the site's local storage and reload.

### A single mod stops initializing after a game update

Open the browser console and look for a message beginning with `[lyrania-chat-enhancements]`. Initializers are isolated, so that warning identifies the affected feature without implying that the whole suite stopped.

## License and attribution

Using with permission from Midith.
