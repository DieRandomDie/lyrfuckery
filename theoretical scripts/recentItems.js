// show the most recent items in inventory
function recentItems(qty) {
  let arr = []
  $('.unequippedItems input[type=checkbox]').each(function() {
      arr.push($(this).val())
  })
  let newest = arr.sort().reverse().slice(1,qty)
  $('.unequippedItems tbody tr').each(function(i) {
      if(i>3){
          if(jQuery.inArray($(this).children(':first').children(':first').val(),newest) === -1) {
              $(this).hide()
          }
      }
  })
}
