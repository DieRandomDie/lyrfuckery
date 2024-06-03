// ==UserScript==
// @name         Dungeon Map Mod
// @namespace    http://tampermonkey.net/
// @version      2024-02-23
// @description  try to take over the world!
// @author       You
// @match        https://lyrania.co.uk/game.php
// @match        https://dev.lyrania.co.uk/game.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lyrania.co.uk
// @grant        none
// ==/UserScript==

function newdungeonmap(x) {
    xmlhttp.open("POST", "dungeonmap.php", !0),
    xmlhttp.onreadystatechange = function() {
        if (4 == xmlhttp.readyState && 200 == xmlhttp.status) {
            var xyz = xmlhttp.responseText.split("[BREAK]");
            for (openpopuppane(xyz[0]),
            i = 1; i < xyz.length; i++)
                eval(xyz[i])
    // NEW STUFF
    let mobs_left = 0
    let reg = 0
    let chal = 0
    let empty = 0
    $('.dungeonmapRoomType').css('color','white')
    $('#dungeonmapcontainer div div:not(:has(img))').each(function() {
        c = $(this).css('-webkit-text-stroke-color')
        m = parseInt($(this).text())
        if(m) {
            switch(c) {
                case "rgb(255, 215, 0)": reg++; break;
                case "rgb(139, 0, 0)": chal++; break;
            }
        } else { empty++ }
        mobs_left += m
    })
    $('.dungeonmapRoomType:eq(0)').text(`Mobs Left (${mobs_left}) | `)
    $('.dungeonmapRoomType:eq(1)').text(`Regular Rooms (${reg}) | `)
    $('.dungeonmapRoomType:eq(2)').text(`Challenge Rooms (${chal}) | `)
    $('.dungeonmapRoomType:eq(3)').text(`Empty Rooms (${empty})`)
    $("#dungeonmapcontainer img").css("opacity",0)
    //END NEW STUFF
        }
    }
    ,
    xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded"),
    xmlhttp.send("x=" + x)
}

$( document ).ready(function() {
    dungeonmap = newdungeonmap
})
