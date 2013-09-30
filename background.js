(function (window, undefined) {
  var usingFB = false, totalTime = 0, startTime;

  var startTime = function(tabId, changeInfo, tab) {
    if (usingFB) {
      totalTime = totalTime + Date.now() - startTime;
      usingFB = false;
    }

    if (tab.url.indexOf('facebook.com') > -1) {
      startTime = Date.now();
      usingFB = true;
      chrome.tabs.sendMessage(tabId, {totalTime: totalTime});
    }
  }

  var checkTime = function(activeinfo, changeInfo) {
    if (usingFB) {
      totalTime = totalTime + Date.now() - startTime;
      usingFB = false;
    }

    chrome.tabs.query({url: "*://www.facebook.com/*"}, function(tabs) {
      for (var i = 0; i < tabs.length; i++) {
        if(tabs[i].id == activeinfo.tabId) {
          startTime = Date.now();
          usingFB = true;
          chrome.tabs.sendMessage(tabs[i].id, {totalTime: totalTime});
          return;
        }
      }
    });
  }

  var closingFB = function(tabId, removeInfo) {
    //TODO: send the session information to the server logging the amount of time used here
    chrome.tabs.query({url: "*://www.facebook.com/*"}, function(tabs) {
      if(tabs.length == 0)
        totalTime = 0;
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
  });
})(window);