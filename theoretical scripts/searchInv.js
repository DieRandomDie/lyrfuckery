// ==UserScript==
// @name         Inventory Search
// @namespace    http://tampermonkey.net/
// @version      2025-04-22
// @description  add search bar to inventory (slow with big invs, filter by type to work a little faster
// @author       DieRandomDie
// @match        https://lyrania.co.uk/game.php
// @match        https://dev.lyrania.co.uk/game.php
// @icon         https://www.google.com/s2/favicons?sz=64&domain=lyrania.co.uk
// @grant        none
// ==/UserScript==

function newInventorySimple(...args) {
    let qs;
    if (xmlhttp.open("POST", "inventory_simplified.php", !0),
        xmlhttp.onreadystatechange = function() {
        if (4 == xmlhttp.readyState && 200 == xmlhttp.status) {
            var xyz = xmlhttp.responseText.split("[BREAK]");
            for (1 == popupui ? openpopuppane(xyz[0]) : document.getElementById("content").innerHTML = xyz[0],
                 i = 1; i < xyz.length; i++)
                eval(xyz[i]);
            "enchants" == args[0] && null != args[1] && $("#popupresdisplay").animate({
                scrollTop: 0
            }, "fast")
        }
        // add text input for filter
        $('<input type="text" id=filter_input>').insertBefore($('#limit').next())
        $('#filter_input').on("input", function() {
            // show hidden stuff
            $('.unequippedItems tbody tr').show()
            $('.unequippedItems tbody tr td input').attr('disabled', false)
            $('.unequippedItems tbody tr').each(function(i) {
                if(i>3){
                    // hide anything that doesn't match input text
                    $(this).not(`:has(td:icontains("${$('#filter_input').val()}"))`).hide()
                }
            })
            $('.unequippedItems tbody tr td input:hidden').attr('disabled', true)
        })
        //change select all data
        $('.select_all').attr('class','select_shown')
        $(document).on("change", ".select_shown", function(e) {
            var t = $('.unequippedItems tbody tr td input:enabled')
            $(t).prop("checked", $(this).is(":checked"))
            invCheck()
        })
    }
        ,
        qs = "tab=" + args[0],
        null != args[1] && (qs = qs + "&action=" + args[1]),
        "loadout" == args[1] && 1 == args[2]) {
        var askNameOfNewLoadout = prompt("What would you like to call this loadout?");
        askNameOfNewLoadout ? (args[3] = askNameOfNewLoadout,
                               args[4] = $("#pet").val()) : inventorySimple("jewellery")
    }
    "loadout" != args[1] || 2 != args[2] && 3 != args[2] || (args[3] = $("#loadout").val(),
                                                             args[4] = $("#pet").val()),
        "use_lockbox" == args[1] && (args[2] = $("#lockboxquant").val()),
        "purchase_lockbox" == args[1] && (args[2] = $("#buy_lockboxquant").val()),
        "remove_enchant_confirm" == args[1] && (args[3] = $("#enchantsavable").is(":checked"));
    let arg_num = 1;
    for (const e in args)
        args[e] != args[0] && args[e] != args[1] && (qs = qs + "&extrainfo" + arg_num + "=" + args[e],
                                                     arg_num++);
    xmlhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded"),
        xmlhttp.send(qs)
}



$( document ).ready(function() {
    //overwrite the existing invsimple
    inventorySimple = newInventorySimple

    // stack overflow solution to remove case sensitivity from jquery's "contains"
    jQuery.expr[':'].icontains = function(a, i, m) {
        return jQuery(a).text().toUpperCase()
            .indexOf(m[3].toUpperCase()) >= 0
    }
})
