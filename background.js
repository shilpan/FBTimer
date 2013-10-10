(function (window, undefined) {
  var usingFB = false, totalTime = 0, startTime, personID, timeZoneOffset = (new Date()).getTimezoneOffset() * 1000, fbOpen = true, prevPersonID;

  var startTime = function(tabId, changeInfo, tab) {
    var currTime = Date.now();
    if (usingFB) {
      totalTime += currTime - startTime;

      $.post('http://fbtimer.herokuapp.com/logsession', {
        personID: prevPersonID,
        sessionStart: startTime,
        sessionEnd: currTime,
        timeZoneOffset: timeZoneOffset
      });
      usingFB = false;
    }

    if (tab.url.indexOf('facebook.com') > -1) {
      startTime = Date.now();
      usingFB = true;
      fbOpen = true;

      if (prevPersonID != personID) {
        totalTime = 0;
        prevPersonID = personID;
      }

      chrome.tabs.sendMessage(tabId, {totalTime: totalTime});
    }
  }

  var checkTime = function(activeinfo, changeInfo) {
    var currTime = Date.now();
    if (usingFB) {
      totalTime += currTime - startTime;

      $.post('http://fbtimer.herokuapp.com/logsession', {
        personID: prevPersonID,
        sessionStart: startTime,
        sessionEnd: currTime,
        timeZoneOffset: timeZoneOffset
      });
      usingFB = false;
    }

    chrome.tabs.query({url: "*://www.facebook.com/*"}, function(tabs) {
      for (var i = 0; i < tabs.length; i++) {
        if(tabs[i].id == activeinfo.tabId) {
          startTime = Date.now();
          usingFB = true;
          fbOpen = true;

          if (prevPersonID != personID) {
            totalTime = 0;
            prevPersonID = personID;
          }

          chrome.tabs.sendMessage(tabs[i].id, {totalTime: totalTime});
          return;
        }
      }
    });
  }

  var closingFB = function(tabId, removeInfo) {
    chrome.tabs.query({url: "*://www.facebook.com/*"}, function(tabs) {
      if(tabs.length == 0 && fbOpen) {
        totalTime = 0;
        fbOpen = false;
        if (usingFB) {
          totalTime += currTime - startTime;

          $.post('http://fbtimer.herokuapp.com/logsession', {
            personID: prevPersonID,
            sessionStart: startTime,
            sessionEnd: currTime,
            timeZoneOffset: timeZoneOffset
          });
          usingFB = false;
        }

        $.post('http://fbtimer.herokuapp.com/endsession', {
          personID: personID
        });
      }
    });
  }

  // Add a listener so background knows when a tab has been reloaded or the URL is changed.
  chrome.tabs.onUpdated.addListener(startTime);

  //Also check time when tabs are switched
  chrome.tabs.onActivated.addListener(checkTime);

  //Check if all tabs are closed to know a session
  chrome.tabs.onRemoved.addListener(closingFB);

  //Check for messages from Contentscripts
  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.sendData == "time")
      sendResponse({totalTime: totalTime});

    if(request.personID)
      personID = request.personID;

    $.get('http://fbtimer.herokuapp.com/showtimer', function(response) {
      chrome.tabs.sendMessage(sender.tab.id, response);
    });
  });
})(window);