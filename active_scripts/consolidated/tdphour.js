// ==UserScript==
// @name         TDP Hour
// @namespace    http://tampermonkey.net/
// @version      2024-02-23
// @description  try to take over the world!
// @author       You
// @match        https://lyrania.co.uk/game.php
// @match        https://dev.lyrania.co.uk/game.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lyrania.co.uk
// @grant        none
// ==/UserScript==

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
        return tdphourstring
    }
}

$( document ).ready(function() {
    $('<div>Triple Hour: <span id="tripleHour">00:00:00</span></div>').insertAfter($('#side1 div:eq(0)'))
    setInterval(function() {
        let time = new Time()
        $('#tripleHour').text(time.tdpHour())
    },1000)
})
