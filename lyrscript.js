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
const killscount = document.getElementById('killscount')
const timediv = document.getElementById('side1').children[0]
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

globalkiller.setAttribute("type","checkbox")
globalkiller.setAttribute("class","chattogglebutton")
globalkiller.setAttribute("data-tippy-content","Global Destroyer")

whisperoption.setAttribute("value","w")
whisperoption.innerHTML = "Whispers"
channel.appendChild(whisperoption)

chat.insertBefore(chattoggler, chat.childNodes[6])
chat.insertBefore(globalkiller, chat.childNodes[7])


class Time {
    constructor() {
        let d = new Date().toLocaleString('en-GB', {timeZone: 'Europe/London'})
        this.day = parseInt(d.split('/')[0])
        let time = d.split(', ')[1].split(':')
        this.hour = parseInt(time[0])
        this.minute = parseInt(time[1])
        this.second = parseInt(time[2])
    }
    fTime() {
        return this.hour+(this.minute/60)+(this.second/60/60)
    }
    tdpHour() {
        let tdphour = 24
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
        } else if (tdphour < 24) {
            tdphourstring = `${tdphour}:00:00`
        } else {
            tdphourstring = '00:00:00'
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
let totalloots = 0
let jade = {total:0,base:0,bonus:0,loots:0}
let frag = {total:0,base:0,bonus:0,loots:0}
let gold = {total:0,base:0,bonus:0,loots:0}
let token = {total:0,base:0,bonus:0,loots:0}
let diamond = {total:0,base:0,bonus:0,loots:0}
let sapphire = {total:0,base:0,bonus:0,loots:0}
let ruby = {total:0,base:0,bonus:0,loots:0}
let emerald = {total:0,base:0,bonus:0,loots:0}
let opal = {total:0,base:0,bonus:0,loots:0}
let health = {total:0,base:0,bonus:0,loots:0}
let attack = {total:0,base:0,bonus:0,loots:0}
let defence = {total:0,base:0,bonus:0,loots:0}
let accuracy = {total:0,base:0,bonus:0,loots:0}
let evasion = {total:0,base:0,bonus:0,loots:0}
/*gold (10g +1p 15g level bonus)
silver (50s +6g 50s level bonus)
jade (51 +586 level bonus)
fragments (159 + 437 level bonus)
Ruby, Rubies, Opal, Emerald, Diamond, Sapphire
*/
function parselog(e) {
    let check = 0
    let l
    let str = e.substring(e.length-7,e.length)
    if(str == 'bonus)!' || str == ' bonus)'){check = 1}
    if (check) {
        l = e.substring(e.indexOf('(')+1,e.length-13).split('+')
        let ba = parseInt(l[0])
        let bo = parseInt(l[1])
        if (e.indexOf('jade') > 0) {
            updateloot(jade, ba, bo)
        } else if (e.indexOf('fragments') > 0) {
            updateloot(frag, ba, bo)
        } else if (e.indexOf('Diamond') > 0) {
            updateloot(diamond, ba, bo)
        } else if (e.indexOf('Sapphire') > 0) {
            updateloot(sapphire, ba, bo)
        } else if (e.indexOf('Rub') > 0) {
            updateloot(ruby, ba, bo)
        } else if (e.indexOf('Emerald') > 0) {
            updateloot(emerald, ba, bo)
        } else if (e.indexOf('Opal') > 0) {
            updateloot(opal, ba, bo)
        } else {
            console.log(e)
        }
    } else if (e.indexOf('gained')) {
        let l = parseInt(e.substring(e.indexOf('gained')+7,e.indexOf('gained')+8))
        let bo = l == 2 ? 1 : 0
        console.log(bo)
        if (e.indexOf('Health') > 0) {
            updateloot(health, 1, bo)
        } else if (e.indexOf('Attack') > 0) {
            updateloot(attack, 1, bo)
        } else if (e.indexOf('Defence') > 0) {
            updateloot(defence, 1, bo)
        } else if (e.indexOf('Accuracy') > 0) {
            updateloot(accuracy, 1, bo)
        } else if (e.indexOf('Evasion') > 0) {
            updateloot(evasion, 1, bo)
        } else {
            console.log(e)
        }
    } else {
            console.log(e)
    }
}
function updateloot(l, ba, bo) {
    l.total+=ba
    l.loots++
    l.base+=ba
    if(bo) {
        l.total+=bo
        l.bonus+=bo
    }
}
function format(n) {
    let f = n > 1e3 ? 1 : 0
    f = n > 1e6 ? 2 : f
    switch(f) {
        case 2: return (n/1e6).toFixed(1)+"m"
        case 1: return (n/1e3).toFixed(1)+"k"
        default: return n
    }
}
function newlootlog(e) {
    parselog(e)
    totalloots++
    $("#logsum").html(`
    <div style="flex-grow:1;width:33%">
    Total loot drops: ${totalloots}</br>
    Jade: ${format(jade.total)} (${format(jade.base)} + ${format(jade.bonus)}) Looted ${format(jade.loots)} times.</br>
    Frag: ${format(frag.total)} (${format(frag.base)} + ${format(frag.bonus)}) Looted ${format(frag.loots)} times.</br>
    Gold: ${'?'} (${'?'} + ${'?'}) Looted ${gold.loots} times.</br>
    Tokens: ${'?'} (${'?'} + ${'?'}) Looted ${token.loots} times.<hr>
    </div>
    <div style="flex-grow:1;width:33%">
    Diamond: ${format(diamond.total)} (${format(diamond.base)} + ${format(diamond.bonus)}) Looted ${format(diamond.loots)} times.</br>
    Sapphire: ${format(sapphire.total)} (${format(sapphire.base)} + ${format(sapphire.bonus)}) Looted ${format(sapphire.loots)} times.</br>
    Ruby: ${format(ruby.total)} (${format(ruby.base)} + ${format(ruby.bonus)}) Looted ${format(ruby.loots)} times.</br>
    Emerald: ${format(emerald.total)} (${format(emerald.base)} + ${format(emerald.bonus)}) Looted ${format(emerald.loots)} times.</br>
    Opal: ${format(opal.total)} (${format(opal.base)} + ${format(opal.bonus)}) Looted ${format(opal.loots)} times.<hr>
    </div>
    <div style="flex-grow:1;width:33%">
    Health: ${format(health.total)} (${format(health.base)} + ${format(health.bonus)}) Looted ${format(health.loots)} times.</br>
    Attack: ${format(attack.total)} (${format(attack.base)} + ${format(attack.bonus)}) Looted ${format(attack.loots)} times.</br>
    Defence: ${format(defence.total)} (${format(defence.base)} + ${format(defence.bonus)}) Looted ${format(defence.loots)} times.</br>
    Accuracy: ${format(accuracy.total)} (${format(accuracy.base)} + ${format(accuracy.bonus)}) Looted ${format(accuracy.loots)} times.</br>
    Evasion: ${format(evasion.total)} (${format(evasion.base)} + ${format(evasion.bonus)}) Looted ${format(evasion.loots)} times.<hr>
    </div>
    `)
    $("#lootlog").prepend($('#logsum'), "<div class='lootlogitem'>" + e + "</div>")
    $("#lootlog div.lootlogitem:gt(999)").remove()
}

$( document ).ready(function() {
    lootlog = newlootlog
    $('#lootlog').prepend('<div id="logsum" class="lootlogitem" style="display:flex">')
    const chatconfig = { attributes: true, childList: true, subtree: true };
    const killsconfig = { characterData: false, attributes: false, childList: true, subtree: false };
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                if (mutation.target.parentNode.id === "chattabs") {
                    filterChat()
                }
                if (mutation.target.id === "serverTime") {
                    let time = new Time()
                    triplehour.innerHTML = time.tdpHour()
                    let kills = parseInt(killscount.innerHTML.replaceAll(',', ''))
                    kph.innerHTML = "KPH: "+(kills/time.fTime()).toFixed(1)
                }
            }
        }
    }
    const observer = new MutationObserver(callback)
    setTimeout( () => {
        observer.observe(chatwindow, chatconfig)
        observer.observe(servertime, killsconfig)
    },1000)
})
