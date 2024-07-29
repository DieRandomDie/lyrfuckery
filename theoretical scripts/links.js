//tbf
function processLink(x) {
    var ytApiKey = "AIzaSyB3vE0QO1Ep9p_XXpMXy97Dn4Lw3ielys8"
    let videoId = ""
    if(x.search("youtube") >= 0) {
        videoId = x.split("=")[1]
    } else if(x.search("youtu.be") >= 0) {
        videoId = x.split("/")[3].split("?")[0]
    }
    console.log(videoId)
    $.get("https://www.googleapis.com/youtube/v3/videos?part=snippet&id=" + videoId + "&key=" + ytApiKey, function(data) {
      console.log(data.items[0].snippet.title);
    })
}
