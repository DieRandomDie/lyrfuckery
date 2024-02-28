// ==UserScript==
// @name         Chat Mod
// @version      2024-02-28
// @description  Adds toggleable chat filter and global removal (globals need to be on).
// @author       DieRandomDie
// @updateURL    https://raw.githubusercontent.com/DieRandomDie/lyrfuckery/main/active_scripts/chat.js
// @downloadURL  https://github.com/DieRandomDie/lyrfuckery/blob/main/active_scripts/chat.js
// @match        https://lyrania.co.uk/game.php
// @match        https://dev.lyrania.co.uk/game.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lyrania.co.uk
// ==/UserScript==

const chat = document.getElementById("chat")
const chatwindow = document.getElementById("chatwindow")
const channel = document.getElementById("chatchannel")

const chattoggler = document.createElement("input")
const globalkiller = document.createElement("input")
const whisperoption = document.createElement("option")

chattoggler.setAttribute("type","checkbox")
chattoggler.setAttribute("class","chattogglebutton")
chattoggler.setAttribute("data-tippy-content","Chat Tabs")

globalkiller.setAttribute("type","checkbox")
globalkiller.setAttribute("class","chattogglebutton")
globalkiller.setAttribute("data-tippy-content","Global Destroyer")

whisperoption.setAttribute("value","w")
whisperoption.innerHTML = "Whispers"
channel.appendChild(whisperoption)

chat.insertBefore(chattoggler, chat.childNodes[6])
chat.insertBefore(globalkiller, chat.childNodes[7])

function killGlobals() {
    if (globalkiller.checked) {
        $('.globalchatcolor').parent().hide()
        //$(`div.chatline:not(":has('a')")`).hide()
    }
}

function filterChat() {
    $('div.chatline').show()
    if (chattoggler.checked) {
        $(`div.chatline:not(:has("span.${channelvalues[channel.value]}"))`).hide()
    }
    killGlobals()
}

const channelvalues = {
    '0': 'mainchatcolor',
    'l': 'gameschatcolor',
    'g': 'guildchatcolor',
    'o': 'officerchatcolor',
    't': 'tradechatcolor',
    'au': 'auctionchatcolor',
    'p': 'pubchatcolor',
    'a': 'areachatcolor',
    'w': 'whisperchatcolor'
}

channel.addEventListener("change",function() {
    filterChat()
})

chattoggler.addEventListener("change",function() {
    filterChat()
})

globalkiller.addEventListener("change",function() {
    filterChat()
})

$( document ).ready(function() {
    const chatconfig = { attributes: true, childList: true, subtree: true };
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                if (mutation.target.parentNode.id === "chattabs") {
                    filterChat()
                }
            }
        }
    }
    const observer = new MutationObserver(callback)
    setTimeout( () => {
        observer.observe(chatwindow, chatconfig)
    },1000)
})
