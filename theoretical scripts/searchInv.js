// add text input for filter
$('<input type="text" oninput="filterItems(this.value)">').insertBefore($('#limit').next())

// overrides the existing client code for the check-all box in inventory
$(document).on("change", ".select_all", function(e) {
    $('.unequippedItems tbody tr td input:hidden').prop("checked", false);
})
// stack overflow solution to remove case sensitivity from jquery's "contains"
jQuery.expr[':'].icontains = function(a, i, m) {
  return jQuery(a).text().toUpperCase()
      .indexOf(m[3].toUpperCase()) >= 0
}

// jank solutions will be jank
function filterItems(j) {
    // show hidden stuff
    $('.unequippedItems tbody tr').show()
    $('.unequippedItems tbody tr').each(function(i) {
        if(i>3){
            // hide anything that doesn't match input text
            $(this).not(`:has(td:icontains("${j}"))`).hide()
        }
      })
}
