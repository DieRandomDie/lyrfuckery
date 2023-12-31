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
function parsegold(s, t) {
    if(!t) {
        let money = s.substring(s.indexOf('(')+1,s.indexOf('level')-1).split(' +')
        let basestring = money[0] //50g
        let baseint = parseInt(basestring) //50
        let basetype = basestring.split(baseint)[1] //g
        let basegold = 0
        if(basetype == 'p') {
            basegold = baseint*1000000
        } else if (basetype == 'g') {
            basegold = baseint*10000
        } else {
            basegold = baseint*100
        }
        let bonusstring = money[1].split(' ') //[1p, 15g]
        let bonusgold = 0
        for (let i = 0; i < bonusstring.length; i++) {
            let bonusint = parseInt(bonusstring[i]) //50
            let bonustype = bonusstring[i].split(bonusint)[1]
            if(bonustype == 'p') {
                bonusgold += bonusint*1000000
            } else if (bonustype == 'g') {
                bonusgold += bonusint*10000
            } else {
                bonusgold += bonusint*100
            }
        }
        updateloot(gold,basegold,bonusgold)
    } else {
        return `${format(Math.floor(s/1e6))}p ${Math.floor(s%1e6/10000)}g ${s%1e4/100}s ${s%100}c`
    }
}
//You found a lockbox of jade (59 +767 level bonus) but it was donated to the jade god!
//You found a Bottle of Rum! - pirate day
//You found a Pirate Flag! - pirate day
//You found a Tricorn! - pirate day
//You found a [Blue|Green|Orange|Red|Yellow] Party Bag!
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
        } else if (e.indexOf('gold') > 0 || e.indexOf('silver') > 0 || e.indexOf('platinum') > 0) {
        parsegold(e)
        } else {
            console.log('error at jade/frag/gems\n'+e)
        }
    } else if (e.indexOf('gained') > 0) {
        let l = parseInt(e.substring(e.indexOf('gained')+7,e.indexOf('gained')+8))
        let bo = l == 2 ? 1 : 0
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
            console.log('error at stats\n'+e)
        }
    } else if (e.indexOf('token source') > 0) {
        let l = parseInt(e.substring(e.indexOf('(')+1,e.indexOf('(')+2))
        updateloot(token, l, 0)
    } else if (e.indexOf('token') > 0) {
        let l = parseInt(e.substring(e.indexOf('token')-2,e.indexOf('token')-1))
        updateloot(token, l, 0)
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
    return n.toLocaleString()
}
function newLogLine(x, y, z) {
    if(!z) {
        return `${x}: <span data-tippy-content="Base: ${format(y.base)}</br>Bonus: ${format(y.bonus)}</br>Looted ${format(y.loots)} times.">${format(y.total)}</span></br>`
    } else {
        return `${x}: <span data-tippy-content="Base: ${parsegold(y.base,1)}</br>Bonus: ${parsegold(y.bonus,1)}</br>Looted ${parsegold(y.loots,1)} times.">${format(y.total)}</span></br>`
    }
}
function newlootlog(e) {
    parselog(e)
    if(e.indexOf("Welcome")){totalloots++}
    $("#logsum").html(`
    <div style="width:100%">
    Total loot drops: ${totalloots}
    </div>
    <div style="flex-grow:1">
    ${newLogLine("Jade", jade)}
    ${newLogLine("Frag", frag)}
    ${newLogLine("Gold", gold, 1)}
    ${newLogLine("Token", token)}
    ${newLogLine("Diamond", diamond)}
    ${newLogLine("Sapphire", sapphire)}
    ${newLogLine("Ruby", ruby)}
    ${newLogLine("Emerald", emerald)}
    ${newLogLine("Opal", opal)}
    ${newLogLine("Health", health)}
    ${newLogLine("Attack", attack)}
    ${newLogLine("Defence", defence)}
    ${newLogLine("Accuracy", accuracy)}
    ${newLogLine("Evasion", evasion)}
    `)
    $("#newlog").prepend($('#logsum'))
    $("#loggies").prepend("<div class='lootlogitem'>" + e + "</div>")
    $("#lootlog div.lootlogitem:gt(999)").remove()
}
function newwhisper(e, f) {
    if(f) {
        document.getElementById("inputchat").value = "/" + f + " " + e + " ",
        document.getElementById("inputchat").focus(),
        document.getElementById("inputchat").style.color = "#DD77DD"
    }
}
$( document ).ready(function() {
    lootlog = newlootlog
    whisper = newwhisper
    $(document).on("click", function(e) {
        $('#shortcut').remove()
        if (e.target.classList[0] === 'chatname') {
            let name = e.target.innerHTML
            e.target.innerHTML = `${name}<div id="shortcut" style='display:inline;position:absolute;margin:3px;padding:3px;border: 1px solid white;background-color:black'>
                <a href='javascript:profile("${name}")'>Profile</a></br>
                <a href='javascript:whisper("${name}", "w")'>Whisper</a></br>
                <a href='javascript:post(0,"${name}","")'>Mail</a></br>
                <a href='javascript:whisper("${name}","wire")'>Wire Plat</a></br>
                <a href='javascript:whisper("${name}","wirejade")'>Wire Jade</a></br>
                <a href='javascript:whisper("${name}","wireitem")'>Wire Item</a>
            </div>`
        }
    })
    $('#lootlog').css('overflow','hidden')
    $('#lootlog').prepend('<div id="newlog"></div>')
    $('#newlog').prepend('<div id="logsum" class="lootlogitem" style="position:absolute;top:5px;overflow:auto;width:20%;height:100%"></div>')
    $('#newlog').prepend('<div id="loggies" style="position:absolute;top:5px;left:20%;overflow:auto;width:80%;height:100%;border-left:1px solid white"></div>')
    newlootlog('Welcome to Lyrania!')
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
