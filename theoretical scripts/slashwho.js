// p is an array, will slash who all names in said array
function getWho(p) {
    const interval = 1000;
    p.forEach(function (x, index) {
      setTimeout(function () {
        $("#inputchat").val(`/who ${x}`)
        $("#chatbutton").click()
      }, index * interval);
    })
}
let names = []
$('#popup div:nth-child(2)').each(function(x) {
    names.push($(this).text().split(' ')[0])
})
names.splice(1, 1)
closepage()
getWho(names)
