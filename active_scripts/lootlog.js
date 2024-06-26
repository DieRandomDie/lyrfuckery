// ==UserScript==
// @name         Lootlog Mod
// @namespace    http://tampermonkey.net/
// @version      69.420
// @description  deez
// @author       yo mama
// @match        https://lyrania.co.uk/game.php
// @match        https://dev.lyrania.co.uk/game.php
// @icon         https://lyrania.co.uk/favicon.ico
// @grant        none
// ==/UserScript==

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
        let bo = l >= 2 ? l-1 : 0
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
        return `${x}: <span data-tippy-content="Base: ${parsegold(y.base,1)}</br>Bonus: ${parsegold(y.bonus,1)}</br>Looted ${format(y.loots)} times.">${parsegold(y.total,1)}</span></br>`
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
$( document ).ready(function() {
    lootlog = newlootlog
    $('#lootlog').css('overflow','hidden')
    $('#lootlog').prepend('<div id="newlog"></div>')
    $('#newlog').prepend('<div id="logsum" class="lootlogitem" style="position:absolute;top:5px;overflow:auto;width:20%;height:100%"></div>')
    $('#newlog').prepend('<div id="loggies" style="position:absolute;top:5px;left:20%;overflow:auto;width:80%;height:100%;border-left:1px solid white"></div>')
    newlootlog('Welcome to Lyrania!')
})
