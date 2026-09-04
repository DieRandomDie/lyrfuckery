// ==UserScript==
// @name         bufferXP
// @namespace    http://tampermonkey.net/
// @version      2025-04-23
// @description  replaces the useless xp% with current ending level
// @author       DieRandomDie
// @match        https://lyrania.co.uk/game.php
// @match        https://dev.lyrania.co.uk/game.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lyrania.co.uk
// @grant        none
// ==/UserScript==

async function newupdategems(...e) {
    $(".jadeli").html(numeral(e[0]).format("0,0"))
    $(".diamondsli").html('<span data-tippy-content="' + numeral(e[1]).format("0,0") + '">' + abbreviateNumber(e[1]) + "</span>")
    $(".rubiesli").html('<span data-tippy-content="' + numeral(e[2]).format("0,0") + '">' + abbreviateNumber(e[2]) + "</span>")
    $(".sapphiresli").html('<span data-tippy-content="' + numeral(e[3]).format("0,0") + '">' + abbreviateNumber(e[3]) + "</span>")
    $(".emeraldsli").html('<span data-tippy-content="' + numeral(e[4]).format("0,0") + '">' + abbreviateNumber(e[4]) + "</span>")
    $(".opalsli").html('<span data-tippy-content="' + numeral(e[5]).format("0,0") + '">' + abbreviateNumber(e[5]) + "</span>")
    $(".userFragments").html(numeral(e[6]).format("0,0"))
    $(".tokenli").html(e[7])
    let t = moneyformat(e[8])
    $("#goldli").html(t)
    $("#ticketcount").html(e[9])
    $("#dp").html(numeral(e[10]).format("0,0"))
    $("#lvlli").html(numeral(e[11]).format("0,0"))
    let n = e[12] / (25 * e[11]) * 100
    let expgain = 0
    if (n >= 100) {
        try {
            expgain = parseInt($('#content div.lrow').eq(1).text().split("Exp: ")[1].split(" ")[0].replaceAll(",",""))
        } catch(e) {}
        bufferincrease = Number(Math.sqrt((numeral(e[11]).value()+1)**2 + (2*(numeral(e[12]).value()+(expgain-(numeral(e[11]).value()+1)*25))/25))-Math.sqrt(numeral(e[11]).value()**2 + (2*numeral(e[12]).value()/25))-1).toFixed(2)
        $("#expli").html("<span data-tippy-content='" + numeral(e[12]).format("0,0") + "/" + numeral(25 * e[11]).format("0,0") + "'>" + Math.round(Math.sqrt(numeral(e[11]).value()**2 + (2*numeral(e[12]).value()/25))).toLocaleString() + " (" +bufferincrease+ ")</span>")
        $("#Healthli").html(numeral(e[13]).format("0,0"))
        $("#Attackli").html(numeral(e[14]).format("0,0"))
        $("#Defenceli").html(numeral(e[15]).format("0,0"))
        $("#Accuracyli").html(numeral((5e3 + e[16]) / 100).format("0,0.00") + "%")
        $("#Evasionli").html(numeral(e[17] / 100).format("0,0.00") + "%")
        }
    if (e[18] != 0) {
        var a = e[18].split("/")
          , o = parseFloat(a[1]) - parseFloat(a[0]);
        0 == o ? $("#questupdateid").html("<font color='yellow'>Click to hand in!</font>") : $("#questupdateid").html(e[18] + " (" + o + " to go)")
    }
    await updateRainCounters(e[19], $("#jaderaincounter"))
    await updateRainCounters(e[20], $("#gemraincounter"))
}

$( document ).ready(function() {
    updategems = newupdategems
    $('#expli').prev().replaceWith("<b>Buffer Lv:</b>")
})
