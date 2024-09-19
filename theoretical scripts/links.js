async function processLink(x) {
    var ytApiKey = "AIzaSyB3vE0QO1Ep9p_XXpMXy97Dn4Lw3ielys8"
    let videoId = ""
    linkTitle = new URL(x).hostname
    if (x.search("youtube.com/shorts/") >= 0) {
        videoId = x.split("shorts/")[1]
    } else if(x.search("youtube") >= 0) {
        videoId = x.split("&")[0].split("=")[1]
    } else if(x.search("youtu.be") >= 0) {
        videoId = x.split("/")[3].split("?")[0]
    }
    if(videoId) {
        linkTitle = await $.get("https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + videoId + "&key=" + ytApiKey)
        return "["+linkTitle.items[0].snippet.title+"]"
    } else {return linkTitle}
}
async function sortchat() {
    if ("" != document.getElementById("inputchat").value && " " != document.getElementById("inputchat").value) {
        var message = document.getElementById("inputchat").value;
        document.getElementById("inputchat").value = "",
        message = message.replace(/</g, "&lt;"),
        message = message.replace(/>/g, "&gt;"),
        " " == message[0] && (message = message.replace(" ", ""));
        var messageparts = message.split(" ");
        for (i = 0; i < messageparts.length; i++)
            "http://" != messageparts[i].substr(0, 7).toLowerCase() && "https://" != messageparts[i].substr(0, 8).toLowerCase() || (-1 != messageparts[i].search(/redtube|xvideos|porn|xxx|motherless|efukt|beeg|spankbang|4tube|3movs|tube8|cumlouder|xxx|xhamster|brazzers|jizz|xnxx|penis|boobs|boobies|boobys|tube8|orgasm|goatse|lemonparty|rawtube|elephanttube|[^uni]sex|meatspin|2girls|painolympics|sluts|lolhello|horny|disgusting|naughty|hentai|artoftrolling|scrollbelow|1man2needles|loltrain|fruitlancher|vomitgirl|1priest1nun|4chan|erotic|smbc|playboy/i) ? messageparts[i] = '<a href="' + messageparts[i] + '" target="_blank">[NSFW]</a>' : messageparts[i] = `<a href="${messageparts[i]}" data-tippy-content="${(await processLink(messageparts[i]))}" target="_blank">[link]</a>`,
            message = messageparts.join(" "),
            message.length > 600 && (messageparts[i] = "[Link Removed Due to Length]"));
        if ("/w" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "w";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/r" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "reply";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/v" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "v";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/friends" == messageparts[0].toLowerCase())
            commands("friends");
        else if ("/dnd" == messageparts[0].toLowerCase()) {
            messageparts[0] = "";
            var arg = "dnd";
            message = messageparts.join(" "),
            message = encodeURIComponent(message),
            commands(arg + " " + message)
        } else if ("/who" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "who";
                message = messageparts.join(" "),
                commands(arg + " " + message)
            }
        } else if ("/whoguild" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "whoguild";
                message = messageparts.join(" "),
                commands(arg + " " + message)
            }
        } else if ("/invite" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                var arg = "invite";
                commands(arg + " " + messageparts[1])
            }
        } else if ("/gmotd" == messageparts[0].toLowerCase()) {
            messageparts[0] = "";
            var arg = "gmotd";
            message = messageparts.join(" "),
            commands(arg + " " + message)
        } else if ("/motd" == messageparts[0].toLowerCase()) {
            messageparts[0] = "";
            var arg = "motd";
            message = messageparts.join(" "),
            commands(arg + " " + message)
        } else if ("/smotd" == messageparts[0].toLowerCase()) {
            messageparts[0] = "";
            var arg = "smotd";
            message = messageparts.join(" "),
            commands(arg + " " + message)
        } else if ("/clear" == messageparts[0].toLowerCase())
            chat_window.empty();
        else if ("/warn" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "warn";
                message = messageparts.join(" "),
                commands(arg + message)
            }
        } else if ("/ignore" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                var arg = "ignore";
                message = messageparts[1],
                chatinput(message, arg)
            }
        } else if ("/spoiler" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "spoiler";
                ":" == messageparts[1].substr(0, 1) && ":" == messageparts[1].substr(-1) && (arg += messageparts[1].substr(1, messageparts[1].length - 2),
                messageparts[1] = ""),
                message = messageparts.join(" "),
                arg2 = "g" == document.getElementById("chatchannel").value ? "guild" : "s" == document.getElementById("chatchannel").value ? "staff" : "t" == document.getElementById("chatchannel").value ? "trade" : "au" == document.getElementById("chatchannel").value ? "auction" : "p" == document.getElementById("chatchannel").value ? "pub" : "a" == document.getElementById("chatchannel").value ? "a" : "o" == document.getElementById("chatchannel").value ? "officer" : "l" == document.getElementById("chatchannel").value ? "gamesroom" : document.getElementById("chatchannel").value,
                chatinput(message, arg, arg2)
            }
        } else if ("/g" == messageparts[0].toLowerCase() || "/c" == messageparts[0].toLowerCase() || "/guild" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "guild";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/t" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "trade";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/au" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "auction";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/s" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "staff";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/p" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "pub";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/o" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "officer";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/me" == messageparts[0].toLowerCase()) {
            messageparts[0] = "",
            message = messageparts.join(" ");
            var arg = "emote";
            arg2 = "g" == document.getElementById("chatchannel").value ? "guild" : "s" == document.getElementById("chatchannel").value ? "staff" : "t" == document.getElementById("chatchannel").value ? "trade" : "au" == document.getElementById("chatchannel").value ? "auction" : "p" == document.getElementById("chatchannel").value ? "pub" : "a" == document.getElementById("chatchannel").value ? "a" : "o" == document.getElementById("chatchannel").value ? "officer" : "l" == document.getElementById("chatchannel").value ? "gamesroom" : document.getElementById("chatchannel").value,
            chatinput(message, arg, arg2)
        } else if ("/my" == messageparts[0].toLowerCase()) {
            messageparts[0] = "",
            message = messageparts.join(" ");
            var arg = "emote2";
            arg2 = "g" == document.getElementById("chatchannel").value ? "guild" : "s" == document.getElementById("chatchannel").value ? "staff" : "t" == document.getElementById("chatchannel").value ? "trade" : "au" == document.getElementById("chatchannel").value ? "auction" : "p" == document.getElementById("chatchannel").value ? "pub" : "a" == document.getElementById("chatchannel").value ? "a" : "o" == document.getElementById("chatchannel").value ? "officer" : "l" == document.getElementById("chatchannel").value ? "gamesroom" : document.getElementById("chatchannel").value,
            chatinput(message, arg, arg2)
        } else if ("/roll" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                var roll = messageparts[1].split("-")
                  , minn = parseFloat(roll[0].replace("/[^0-9]/", ""))
                  , maxn = parseFloat(roll[1].replace("/[^0-9]/", ""));
                if (minn == parseInt(minn) && maxn == parseInt(maxn)) {
                    minn > maxn && (newminn = maxn,
                    newmaxn = minn,
                    minn = newminn,
                    maxn = newmaxn);
                    var outcome = Math.round(minn + Math.random() * (maxn - minn)) + " (" + minn + "-" + maxn + ")"
                } else
                    var outcome = Math.round(1 + 99 * Math.random()) + " (1-100)"
            } else
                var outcome = Math.round(1 + 99 * Math.random()) + " (1-100)";
            arg2 = "g" == document.getElementById("chatchannel").value ? "guild" : "s" == document.getElementById("chatchannel").value ? "staff" : "t" == document.getElementById("chatchannel").value ? "trade" : "au" == document.getElementById("chatchannel").value ? "auction" : "p" == document.getElementById("chatchannel").value ? "pub" : "a" == document.getElementById("chatchannel").value ? "a" : "o" == document.getElementById("chatchannel").value ? "officer" : "l" == document.getElementById("chatchannel").value ? "gamesroom" : document.getElementById("chatchannel").value,
            message = outcome;
            var arg = "roll";
            chatinput(message, arg, arg2)
        } else if ("/help" == messageparts[0].toLowerCase())
            openpage(5, 0);
        else if ("/profile" == messageparts[0].toLowerCase())
            messageparts[1] && profile(messageparts[1]);
        else if ("/ann" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "ann";
                "l" == document.getElementById("chatchannel").value && (arg2 = "gamesroom"),
                message = messageparts.join(" "),
                chatinput(message, arg, arg2)
            }
        } else if ("/gameann" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "lann"
                  , arg2 = "games";
                message = messageparts.join(" "),
                chatinput(message, arg, arg2)
            }
        } else if ("/gann" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "gann";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/a" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "a";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/l" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "gamesroom";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/m" == messageparts[0].toLowerCase()) {
            if (messageparts[1]) {
                messageparts[0] = "";
                var arg = "";
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/calc" == messageparts[0].toLowerCase()) {
            messageparts[0] = "",
            messager = messageparts.join(" "),
            message = messager.replace(/[a-zA-Z ]/g, "");
            var result = eval(message)
              , mes = "<span style='color:#00FF00;'>Calculator: " + message + " = " + result + "</span>";
            addChatLines(mes)
        } else if ("/time" == messageparts[0].toLowerCase()) {
            var d = new Date
              , hour = d.getHours()
              , minute = d.getMinutes()
              , second = d.getSeconds()
              , mes = "<span style='color:#00FF00;'>[" + hour + ":" + minute + ":" + second + "] Local Time</span>";
            addChatLines(mes)
        } else if ("/" == messageparts[0].substr(0, 1) && -1 != messageparts[0].search(/[0-9]/) && messageparts[0].length > 1) {
            if (messageparts[1]) {
                var arg = messageparts[0].substr(1);
                messageparts[0] = "",
                message = messageparts.join(" "),
                chatinput(message, arg)
            }
        } else if ("/set" == messageparts[0])
            for (i = 0; i < document.getElementById("chatchannel").length; i++)
                (document.getElementById("chatchannel").options[i].value == messageparts[1] || "0" == document.getElementById("chatchannel").options[i].value && "m" == messageparts[1]) && (document.getElementById("chatchannel").options[i].selected = !0);
        else if ("/" == messageparts[0].substr(0, 1)) {
            var arg = messageparts[0].slice(1);
            messageparts.shift(),
            message = messageparts.join(" "),
            commands(arg + " " + message)
        } else
            arg = "g" == document.getElementById("chatchannel").value ? "guild" : "s" == document.getElementById("chatchannel").value ? "staff" : "a" == document.getElementById("chatchannel").value ? "a" : "t" == document.getElementById("chatchannel").value ? "trade" : "au" == document.getElementById("chatchannel").value ? "auction" : "p" == document.getElementById("chatchannel").value ? "pub" : "o" == document.getElementById("chatchannel").value ? "officer" : "l" == document.getElementById("chatchannel").value ? "gamesroom" : "0" == document.getElementById("chatchannel").value ? "" : document.getElementById("chatchannel").value,
            message = messageparts.join(" "),
            chatinput(message, arg)
    }
}
