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

// Existing Elements
const killscount = document.getElementById("killscount")
const timediv = document.getElementById("side1").children[0]
const servertime = document.getElementById("serverTime")
const counter = document.getElementById("sidecounter")
const chat = document.getElementById("chat")
const chatwindow = document.getElementById("chatwindow")
const channel = document.getElementById("chatchannel")

// New Elements
const triplehour = document.createElement("div")
const kph = document.createElement("span")
const chattoggler = document.createElement("input")
const globalkiller = document.createElement("input")
const whisperoption = document.createElement("option")

kph.innerHTML = "KPH: 0"
counter.appendChild(document.createElement("br"))
counter.appendChild(kph)

triplehour.innerHTML = "Triple Hour: 00:00:00"
timediv.appendChild(triplehour)

chattoggler.setAttribute("type","checkbox")
chattoggler.setAttribute("class","chattogglebutton")
chattoggler.setAttribute("data-tippy-content","Chat Tabs")
chat.insertBefore(chattoggler, chat.childNodes[6])

globalkiller.setAttribute("type","checkbox")
globalkiller.setAttribute("class","chattogglebutton")
globalkiller.setAttribute("data-tippy-content","Global Destroyer")
chat.insertBefore(globalkiller, chat.childNodes[7])

whisperoption.setAttribute("value","w")
whisperoption.innerHTML = "Whispers"
channel.appendChild(whisperoption)



class Time {
    constructor() {
        let date = new Date().toLocaleString('en-GB', {timeZone: 'Europe/London'})
        this.day = parseInt(date.split('/')[0])
        let time = date.split(', ')[1].split(':')
        this.hour = parseInt(time[0])
        this.minute = parseInt(time[1])
        this.second = parseInt(time[2])
    }
    fTime() {
        return this.hour+(this.minute/60)+(this.second/60/60)
    }
    tdpHour() {
        let tdphour = 0
        let tdphourstring = '00:00:00'
        let now = this.fTime()
        switch(this.day%5) {
            case 1: tdphour = 20;break;
            case 2: tdphour = 16;break;
            case 3: tdphour = 12;break;
            case 4: tdphour = 8;break;
            default:
                if (now < 4) {
                    tdphour = 4
                }
        }
        if (now > tdphour) {
            if (now < tdphour+1) {
                tdphour = -1
            } else {
                tdphour -= 4
            }
        }
        if (tdphour < 0) {
            tdphourstring = "NOW"
        } else if (tdphour > 0) {
            tdphourstring = `${tdphour}:00:00`
        }
        return `Triple Hour: ${tdphourstring}`
    }
}

function killGlobals() {
    if (globalkiller.checked) {
        $(`div.chatline:has([style*='${globalchatcolor.toUpperCase()}'])`).hide()
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
    const killsconfig = { characterData: false, attributes: false, childList: true, subtree: false };
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                let time = new Time()
                if (mutation.target.parentNode.id === "chattabs") {
                    filterChat()
                }
                if (mutation.target.parentNode.id === "sidecounter") {
                    kills = parseInt(killscount.innerHTML.replaceAll(',', ''))
                    kph.innerHTML = "KPH: "+(kills/time.fTime()).toFixed(1)
                }
                if (mutation.target.id === "serverTime") {
                    triplehour.innerHTML = time.tdpHour()
                }
            }
        }
    }
    const observer = new MutationObserver(callback)
    observer.observe(chatwindow, chatconfig)
    observer.observe(killscount, killsconfig)
    observer.observe(servertime, killsconfig)
})
