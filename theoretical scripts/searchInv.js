

// removes case-sensitivity from jQuery's contains
jQuery.expr[':'].icontains = function(a, i, m) {
  return jQuery(a).text().toUpperCase()
      .indexOf(m[3].toUpperCase()) >= 0
}
// item search with optional auto-check box ticking. This only works from top to bottom so non-tradeables will be skipped and the final checked amount will be qty minus non-tradeables.
function searchInv(j, qty) {
    let jewel = $(`tr:has(td:icontains("${j}"))`)
    $('.unequippedItems tbody tr').each(function(i) {
        if(i>3){
            $(this).not(`:has(td:icontains("${j}"))`).hide()
        }
      })
    if(qty) {
        if (!jewel.length > qty) { qty = jewel.length }
        for (i=0;i<qty;i++) {
            jewel[i].children[0].children[0].checked = true
        }
    }
}
