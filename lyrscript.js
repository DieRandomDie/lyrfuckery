// ==UserScript==
// @name         lyrshit
// @namespace    http://tampermonkey.net/
// @version      69.420
// @description  deez
// @author       yo mama
// @match        https://dev.lyrania.co.uk/game.php
// @icon         https://lyrania.co.uk/favicon.ico
// @grant        none
// ==/UserScript==

const killscount = document.getElementById("killscount")
const servertime = document.getElementById("serverTime")
const counter = document.getElementById("sidecounter")
const chat = document.getElementById("chatwindow")
const kph = document.createElement("span")
let kills = 0

counter.appendChild(document.createElement("br"))
counter.appendChild(kph)

function getFloatTime() {
    let nowtime = servertime.innerHTML.split(':')
    let ftime = parseInt(nowtime[0])+(parseInt(nowtime[1])/60)+(parseInt(nowtime[2])/60/60)
    return ftime
}

$( document ).ready(function() {
    const chatconfig = { attributes: true, childList: true, subtree: true };
    const killsconfig = { characterData: false, attributes: false, childList: true, subtree: false };
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                if (mutation.target.parentNode.id === "chattabs") {
                    $(`div.chatline:has([style*='${globalchatcolor.toUpperCase()}'])`).remove()
                }
                if (mutation.target.parentNode.id === "sidecounter") {
                    kills = parseInt(killscount.innerHTML.replaceAll(',', ''))
                    kph.innerHTML = "KPH: "+(kills/getFloatTime()).toFixed(1)
                }
            }
        }
    }
    const observer = new MutationObserver(callback)
    observer.observe(chat, chatconfig)
    observer.observe(killscount, killsconfig)
});
