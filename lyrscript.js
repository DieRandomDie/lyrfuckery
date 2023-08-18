// ==UserScript==
// @name         lyrscript
// @namespace    http://tampermonkey.net/
// @version      69.420
// @description  deez
// @author       yo mama
// @match        https://dev.lyrania.co.uk/game.php
// @match        https://lyrania.co.uk/game.php
// @icon         https://lyrania.co.uk/favicon.ico
// @grant        none
// ==/UserScript==

const killscount = document.getElementById("killscount")
const servertime = document.getElementById("serverTime")
const counter = document.getElementById("sidecounter")
const chat = document.getElementById("chat")
const chatwindow = document.getElementById("chatwindow")
const channel = document.getElementById("chatchannel")
const kph = document.createElement("span")
const chattoggler = document.createElement("input")
const globalkiller = document.createElement("input")
let kills = 0

kph.innerHTML = "KPH: 0"
counter.appendChild(document.createElement("br"))
counter.appendChild(kph)
chattoggler.setAttribute("type","checkbox")
chattoggler.setAttribute("class","chattogglebutton")
chattoggler.setAttribute("data-tippy-content","Chat Tabs")
globalkiller.setAttribute("type","checkbox")
globalkiller.setAttribute("class","chattogglebutton")
globalkiller.setAttribute("data-tippy-content","Global Destroyer")
chat.insertBefore(chattoggler, chat.childNodes[6])
chat.insertBefore(globalkiller, chat.childNodes[7])


function getFloatTime() {
    let nowtime = servertime.innerHTML.split(':')
    //idk a better way and idc~~ :D
    let ftime = parseInt(nowtime[0])+(parseInt(nowtime[1])/60)+(parseInt(nowtime[2])/60/60)
    return ftime
}

function killGlobals() {
    if (globalkiller.checked) {
        $(`div.chatline:has([style*='${globalchatcolor.toUpperCase()}'])`).hide()
        // this gets rid of guild announcements so prob no bueno
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
    'a': 'areachatcolor'
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
    const killsconfig = { characterData: false, attributes: false, childList: true, subtree: false };
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                if (mutation.target.parentNode.id === "chattabs") {
                    filterChat()
                }
                if (mutation.target.parentNode.id === "sidecounter") {
                    kills = parseInt(killscount.innerHTML.replaceAll(',', ''))
                    kph.innerHTML = "KPH: "+(kills/getFloatTime()).toFixed(1)
                }
            }
        }
    }
    const observer = new MutationObserver(callback)
    observer.observe(chatwindow, chatconfig)
    observer.observe(killscount, killsconfig)
})
