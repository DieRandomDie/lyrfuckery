// ==UserScript==
// @name         New Chat Mod
// @namespace    http://tampermonkey.net/
// @version      2024-02-23
// @description  try to take over the world!
// @author       You
// @match        https://lyrania.co.uk/game.php
// @match        https://dev.lyrania.co.uk/game.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lyrania.co.uk
// @grant        none
// ==/UserScript==

let selected_channel = 'all'
let globals = true

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

function setup() {
    $('#chatchannel').hide()
    $('#chat_row').prepend('<div id="chat-select"></div>')
    $('#chatchannel option').each(function() {
        $('#chat-select').append(`<button class="sidechatbutton" value="${$(this).val()}">${$(this).text()}</button>`)
    })
    $('#chat-select').prepend('<button class="sidechatbutton" value="all">All</button>')
    $('#chat-select').append('<button class="globalsbutton" value="global">Globals - ON</button>')
    $('.sidechatbutton,.globalsbutton').css("margin","0 0 5 0").css("background-color","black").css("border","none").css("color","white").css("width","100%").css("text-align","left").css("padding","0 0 0 5")
    $('.sidechatbutton').hover(function() {
        if($(this).val() !== selected_channel) {
            $(this).css("background-color","#222222")
        }
    }, function() {
        if($(this).val() === selected_channel) {
            $(this).css("background-color","#555555")
        } else {
            $(this).css("background-color","black")
        }
    })
    $('.sidechatbutton').on( "click", function() {
        selected_channel = $(this).val()
        $(`#chatchannel option[value=${$(this).val()}]`).prop('selected',true)
        filterChat()
        $('.sidechatbutton').css("background-color","black")
        $(this).css("background-color","#555555")
    })
    $('.globalsbutton').on( "click", function() {
        globals = !globals
        if(globals) {
            $(this).text("Globals - ON")
        } else {
            $(this).text("Globals - OFF")
        }
        filterChat()
    })
    $('#chatchannel select')
    $('#chat-select').css("position","relative").css("border","1px solid white").css("border-radius","15px").css("width","10%").css("margin-top","10px").css("padding","10 0 0 0")
    $('#chat').css("margin-left","5px")
    $('button[value="all"]').css("background-color","#555555")
}

function filterChat() {
    $('div.chatline').show()
    if(selected_channel === 'all') {
        if(!globals) {
            $('.globalchatcolor').parent().hide()
        }
    } else {
        if(Object.keys(channelvalues).includes(selected_channel)) {
            $(`div.chatline:not(:has("span.${channelvalues[selected_channel]}"))`).hide()
        } else {
            $(`div.chatline:not(:has("span:contains([ ${$(`#chatchannel option[value="${selected_channel}"]`).text()} ])"))`).hide()
        }
    }
    $('.whisperchatcolor').parent().show()
}

$( document ).ready(function() {
    setup()
    const chatconfig = { attributes: true, childList: true, subtree: true };
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                if (mutation.target.parentNode.id === "chattabs") {
                    filterChat()
                }
            }
        }
    }
    const observer = new MutationObserver(callback)
    setTimeout( () => {
        observer.observe(chatwindow, chatconfig)
    },1000)
})

