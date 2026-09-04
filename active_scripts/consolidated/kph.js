// ==UserScript==
// @name         Kills Per Hour
// @namespace    http://tampermonkey.net/
// @version      2024-02-23
// @description  try to take over the world!
// @author       You
// @match        https://lyrania.co.uk/game.php
// @match        https://dev.lyrania.co.uk/game.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lyrania.co.uk
// @grant        none
// ==/UserScript==

$( document ).ready(function() {
    $('#sidecounter').append('<br>KPH: <span id="kph">0.0</span>')
    setInterval(function() {
        let kills = parseInt(killscount.innerHTML.replaceAll(',', ''))
        let t = $('#serverTime').text().split(':')
        let ftime = parseInt(t[0])+(parseInt(t[1])/60)+(parseInt(t[2])/60/60)
        $('#kph').text((kills/ftime).toFixed(1))
    },1000)
})
