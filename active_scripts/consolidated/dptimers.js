// ==UserScript==
// @name         DP Timers
// @namespace    http://tampermonkey.net/
// @version      2024-02-23
// @description  try to take over the world!
// @author       You
// @match        https://lyrania.co.uk/game.php
// @match        https://dev.lyrania.co.uk/game.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lyrania.co.uk
// @grant        none
// ==/UserScript==

//maybe update to $().splice later to hide lesser boosts
function hideDPTimers() {
    if($('#doubledp').text() == "Inactive"){$('#ddpword').hide()}else{$('#ddpword').show()}
    if($('#tripledp').text() == "Inactive"){$('#tdpword').hide()}else{$('#tdpword').show()}
    if($('#quaddp').text() == "Inactive"){$('#qdpword').hide()}else{$('#qdpword').show()}
}
function newRunTimer(e, t, n, a="00:00") {
    hideDPTimers()
    if (n.length) {
        var o = Math.ceil((e - (new Date).getTime()) / 1e3);
        o > 0 ? (tm2 = Math.floor(o / 60),
        h2 = Math.floor(tm2 / 60),
        m2 = tm2 - 60 * h2,
        s2 = o - 60 * tm2,
        s2 < 10 && (s2 = "0" + s2),
        m2 < 10 && (m2 = "0" + m2),
        h2 < 10 && (h2 = "0" + h2),
        n.html(h2 + ":" + m2 + ":" + s2)) : (n.html(a),
        clearInterval(t),
        t = null)
    } else
        clearInterval(t)
}

$( document ).ready(function() {
    RunTimer = newRunTimer
    hideDPTimers()
})
