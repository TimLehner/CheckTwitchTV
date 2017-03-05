/**
 * main.js
 * Created by Tim on 05/03/2017.
 */
var channelInfo = {};
var channelList = [];

//Load info from twitch
$(getTwitchInfo());

$( document ).ready(function() {
    // Hack to set label for radio button active
     setTimeout(function() {$('#On').click()}, 500);
});

jQuery('#searchTxt').on('input', function() {
    redraw();
});

function remove(channelName) {
    // remove a channel from list of required channels
    var index = channelList.indexOf(channelName.toLowerCase());
    if (index > -1) {
        channelList.splice(index, 1);
    }
    localStorage.setItem("twitchchannels", JSON.stringify(channelList));
    setTimeout(update, 10);
}

function add(channelName) {
    if (channelList.indexOf(channelName.toLowerCase()) == -1) {
        channelGet(channelName, function() {
            channelList.push(channelName.toLowerCase());
            localStorage.setItem("twitchchannels", JSON.stringify(channelList));
            $('#searchTxt').val("")
            setTimeout(update, 100);
        }, function() {
            alert("Error: " + channelName + " does not exists.")
        });
    }
}

function update() {
    getTwitchInfo();
    setTimeout(redraw, 500);
}

function delayRedraw() {
    setTimeout(redraw, 10)
}



function redraw() {
    var searchName = $('#searchTxt').val();
    var source   = $("#entry-template").html();
    var template = Handlebars.compile(source);
    streams = getValidStreams();
    context = {channels: streams,
        valid: streams.length > 0,
        searchName: searchName};
    var html    = template(context);
    $('#content').html(html);
}

function buildPage() {
    // Build page from channelInfo object, build by getTwitchInfo();
    streams = getValidStreams();
    if (streams.length > 0) {
        for (i = 0; i < streams.length; i++) {
            console.log(streams[i]['name'])
        }
    } else {
        console.log("Can't find any streams");
    }
}

function getValidStreams() {
    // Get user variables for filter
    filter = $('#searchTxt').val().toLowerCase();
    checkFilterSkip = filter === "";
    hideOnline = $("#offline").is(":checked");
    hideOffline = $("#online").is(":checked");
    validChannels = [];

    keyset = Object.keys(channelInfo);
    for (i = 0; i < keyset.length; i++) {
        channelInfoPart = channelInfo[keyset[i]];
        if (checkFilter(channelInfoPart, filter, hideOffline, hideOnline)) {
            validChannels.push(channelInfoPart);
        }
    }
    return validChannels;
}

function checkFilter(channelInfoPart, filter, hideOffline, hideOnline) {
    filterCheck = checkFilterSkip || channelInfoPart['name'].toLowerCase().includes(filter);
    onlineCheck = !hideOnline || channelInfoPart['status'] == "Offline";
    offlineCheck = !hideOffline || channelInfoPart['status'] == "Online";
    return filterCheck && onlineCheck && offlineCheck;
}

function getTwitchInfo() {
    channelInfo = {};
    channelList = [];
    // Get list of channels to follow from local storage
    args = localStorage.getItem("twitchchannels");
    if (args == null) {
        // If there are no channels, load the default list
        localStorage.setItem("twitchchannels", JSON.stringify(["esl_sc2", "freecodecamp"]));
        setTimeout(getTwitchInfo, 10);
    } else {
        // Otherwise load into array
        channelList = JSON.parse(args);
        for (i = 0; i < channelList.length; i++) {
            // Get all info from Twitch API
            getChannelInfo(channelList[i]);
        }
    }
}

function channelGet(channelName, func, errFunc) {
    var settings = {
        "async": true,
        "crossDomain": true,
        "url": "https://api.twitch.tv/kraken/channels/" + channelName,
        "method": "GET",
        "headers": {
            "client-id": "24qhl52p6gsn2sum8yybjxj94pdanf",
            "cache-control": "no-cache",
        }
    }

    $.ajax(settings).done(func).fail(errFunc);
}

function getChannelInfo(channelName) {
    channelGet(channelName, function (response) {
        logo = response['logo'];
        name = response['display_name'];
        url = response['url'];
        var channelInfoPart = {};
        channelInfoPart['name'] = name;
        channelInfoPart['logo'] = logo;
        channelInfoPart['url'] = url;
        channelInfo[name.toLowerCase()] = channelInfoPart;
        setTimeout(function() {checkChannelStatus(channelName)}, 10);
    }, function() {});
}



function checkChannelStatus(channelName) {
    var settings = {
        "async": true,
        "crossDomain": true,
        "url": "https://api.twitch.tv/kraken/streams/" + channelName,
        "method": "GET",
        "headers": {
            "client-id": "24qhl52p6gsn2sum8yybjxj94pdanf"
        }
    }

    $.ajax(settings).done(function (response) {
        stream = response['stream'];
        if (stream == null) {
            channelInfo[channelName]['status'] = "Offline";
            channelInfo[channelName]['hasPreview'] = false;
            channelInfo[channelName]['hasMessage'] = false;
            channelInfo[channelName]['preview'] = null;
            channelInfo[channelName]['message'] = null;
        } else {
            channelInfo[channelName]['status'] = "Online";
            channelInfo[channelName]['preview'] = stream['preview']['medium'];
            channelInfo[channelName]['message'] = stream['channel']['status'];
            channelInfo[channelName]['hasPreview'] = true;
            channelInfo[channelName]['hasMessage'] = true;
        }
        redraw();
    });
}