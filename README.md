Using with permission from Midith ~~

## Lyrania Mod Suite

The combined, maintained userscript is [`active_scripts/lyrania-mod-suite.user.js`](active_scripts/lyrania-mod-suite.user.js).

Install it from the raw GitHub URL:

https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/lyrania-mod-suite.user.js

Tampermonkey and compatible userscript managers use the script's `@updateURL` and
`@downloadURL` headers to update from the `main` branch. The script also checks
GitHub after Lyrania loads and displays a **Lyrania Mod Suite update available**
banner when it sees a newer version.

### Publishing an update

1. Change the `@version` value in `lyrania-mod-suite.user.js` to a larger version.
2. Commit and push the changed file to the `main` branch.
3. Userscript managers will install it according to each user's update-check
   schedule. Users with the game open will also see the mod's update banner.

The version must contain only numeric dot-separated parts, such as `2.5.1` or
`2.6.0`.
