//给 <a> 标签批量加上 `tartget = "_blank"
function addaTarget(id) {
    var aTags = document.getElementById(id).getElementsByTagName("a");
    for (i = 0; i < aTags.length; i++) {
        var aTags_item = aTags[i];
        aTags_item.target = "_blank";
    }
}