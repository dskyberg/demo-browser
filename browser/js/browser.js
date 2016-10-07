var WindowManagerClient = require('../electron-window-manager/window_client.js');
var windowManagerClient;
var webView;
var isLoading = false;

window.onresize = doLayout;
window.addEventListener('unload', doClose);

function receiveEvent(event, args) {

}

onload = function() {
  doLayout();
  webView = document.querySelector('webview');

  document.querySelector('#back').onclick = function() {
    webView.goBack();
  };

  document.querySelector('#forward').onclick = function() {
    webView.goForward();
  };

  document.querySelector('#home').onclick = function() {
    navigateTo('http://www.github.com/');
  };

  document.querySelector('#reload').onclick = function() {
    if (isLoading) {
      webView.stop();
    } else {
      webView.reload();
    }
  };

  document.querySelector('#reload').addEventListener(
    'webkitAnimationIteration',
    function() {
      if (!isLoading) {
        document.body.classList.remove('loading');
      }
    }
  );

  document.querySelector('#location-form').onsubmit = function(e) {
    e.preventDefault();
    navigateTo(document.querySelector('#location').value);
  };

  webView.addEventListener('close', handleExit);
  webView.addEventListener('did-start-loading', handleLoadStart);
  webView.addEventListener('did-stop-loading', handleLoadStop);
  webView.addEventListener('did-fail-load', handleLoadAbort);
  webView.addEventListener('did-get-redirect-request', handleLoadRedirect);
  webView.addEventListener('did-finish-load', handleLoadCommit);
  webView.addEventListener('dom-ready', handleDOMReady);

  webView.addEventListener('console-message', (e) => {
    console.log('Guest page logged a message:', e.message)
  })

  webView.addEventListener('ipc-message', (event) => {
    switch (event.channel) {
      case 'DOM_CHANGED':
        doCapture();
        break;
    }
  })

  // Test for the presence of the experimental <webview> zoom and find APIs.
  if (typeof(webView.setZoom) == "function" &&
      typeof(webView.find) == "function") {

    var findMatchCase = false;

    document.querySelector('#zoom').onclick = function() {
      if(document.querySelector('#zoom-box').style.display == '-webkit-flex') {
        closeZoomBox();
      } else {
        openZoomBox();
      }
    };

    document.querySelector('#zoom-form').onsubmit = function(e) {
      e.preventDefault();
      var zoomText = document.forms['zoom-form']['zoom-text'];
      var zoomFactor = Number(zoomText.value);
      if (zoomFactor > 5) {
        zoomText.value = "5";
        zoomFactor = 5;
      } else if (zoomFactor < 0.25) {
        zoomText.value = "0.25";
        zoomFactor = 0.25;
      }
      webView.setZoom(zoomFactor);
    }

    document.querySelector('#zoom-in').onclick = function(e) {
      e.preventDefault();
      increaseZoom();
    }

    document.querySelector('#zoom-out').onclick = function(e) {
      e.preventDefault();
      decreaseZoom();
    }

    document.querySelector('#find').onclick = function() {
      if(document.querySelector('#find-box').style.display == 'block') {
        document.querySelector('.mainWebview').stopFinding();
        closeFindBox();
      } else {
        openFindBox();
      }
    };

    document.querySelector('#find-text').oninput = function(e) {
      webView.find(document.forms['find-form']['find-text'].value,
                   {matchCase: findMatchCase});
    }

    document.querySelector('#find-text').onkeydown = function(e) {
      if (event.ctrlKey && event.keyCode == 13) {
        e.preventDefault();
        webView.stopFinding('activate');
        closeFindBox();
      }
    }

    document.querySelector('#match-case').onclick = function(e) {
      e.preventDefault();
      findMatchCase = !findMatchCase;
      var matchCase = document.querySelector('#match-case');
      if (findMatchCase) {
        matchCase.style.color = "blue";
        matchCase.style['font-weight'] = "bold";
      } else {
        matchCase.style.color = "black";
        matchCase.style['font-weight'] = "";
      }
      webView.find(document.forms['find-form']['find-text'].value,
                   {matchCase: findMatchCase});
    }

    document.querySelector('#find-backward').onclick = function(e) {
      e.preventDefault();
      webView.find(document.forms['find-form']['find-text'].value,
                   {backward: true, matchCase: findMatchCase});
    }

    document.querySelector('#find-form').onsubmit = function(e) {
      e.preventDefault();
      webView.find(document.forms['find-form']['find-text'].value,
                   {matchCase: findMatchCase});
    }

    webView.addEventListener('findupdate', handleFindUpdate);
    window.addEventListener('keydown', handleKeyDown);
  } else {
    var zoom = document.querySelector('#zoom');
    var find = document.querySelector('#find');
    zoom.style.visibility = "hidden";
    zoom.style.position = "absolute";
    find.style.visibility = "hidden";
    find.style.position = "absolute";
  }
};

function handleDOMReady(event) {
  // Nothing to see here.
}

function navigateTo(url) {
  resetExitedState();
  document.querySelector('.mainWebview').src = url;
}

function doClose() {
  var id = windowName.split('-')[1];
  var targetThumb = 'thumb-' + id;
  const payload = {
    type: 'THUMBNAIL_CLOSE',
    target: targetThumb
  };
  windowManagerClient.send('mainWindow', payload);
}

function doLayout() {
  if (!webView) {
    webView = document.querySelector('webview');
  }
  var controls = document.querySelector('#controls');
  var controlsHeight = controls.offsetHeight;
  var windowWidth = document.documentElement.clientWidth;
  var windowHeight = document.documentElement.clientHeight;
  var webviewWidth = windowWidth;
  var webviewHeight = windowHeight - controlsHeight;
  webView.style.width = webviewWidth + 'px';
  webView.style.height = webviewHeight + 'px';
}

function doCapture() {
  var id = windowName.split('-')[1];
  var targetThumb = 'thumb-' + id;
  if (!webView ) {
    return
  };
  webView.capturePage(function(nativeImage) {
    const payload = {
      type: 'THUMBNAIL',
      target: targetThumb,
      data: nativeImage.toDataURL()
    };
    windowManagerClient.send('mainWindow', payload);
  });
}

function handleExit(event) {
  document.body.classList.add('exited');
  if (event.type == 'abnormal') {
    document.body.classList.add('crashed');
  } else if (event.type == 'killed') {
    document.body.classList.add('killed');
  }
}

function resetExitedState() {
  document.body.classList.remove('exited');
  document.body.classList.remove('crashed');
  document.body.classList.remove('killed');
}

function handleFindUpdate(event) {
  var findResults = document.querySelector('#find-results');
  if (event.searchText == "") {
    findResults.innerText = "";
  } else {
    findResults.innerText =
        event.activeMatchOrdinal + " of " + event.numberOfMatches;
  }

  // Ensure that the find box does not obscure the active match.
  if (event.finalUpdate && !event.canceled) {
    var findBox = document.querySelector('#find-box');
    findBox.style.left = "";
    findBox.style.opacity = "";
    var findBoxRect = findBox.getBoundingClientRect();
    if (findBoxObscuresActiveMatch(findBoxRect, event.selectionRect)) {
      // Move the find box out of the way if there is room on the screen, or
      // make it semi-transparent otherwise.
      var potentialLeft = event.selectionRect.left - findBoxRect.width - 10;
      if (potentialLeft >= 5) {
        findBox.style.left = potentialLeft + "px";
      } else {
        findBox.style.opacity = "0.5";
      }
    }
  }
}

function findBoxObscuresActiveMatch(findBoxRect, matchRect) {
  return findBoxRect.left < matchRect.left + matchRect.width &&
      findBoxRect.right > matchRect.left &&
      findBoxRect.top < matchRect.top + matchRect.height &&
      findBoxRect.bottom > matchRect.top;
}

function handleKeyDown(event) {
  if (event.ctrlKey) {
    switch (event.keyCode) {
      // Ctrl+F.
      case 70:
        event.preventDefault();
        openFindBox();
        break;

      // Ctrl++.
      case 107:
      case 187:
        event.preventDefault();
        increaseZoom();
        break;

      // Ctrl+-.
      case 109:
      case 189:
        event.preventDefault();
        decreaseZoom();
    }
  }
}

function handleLoadCommit(event) {
  console.log('handleLoadCommit', windowName);
  resetExitedState();
  //var webView = document.querySelector('.mainWebview');
  document.querySelector('#location').value = webView.getURL();
  document.querySelector('#back').disabled = !webView.canGoBack();
  document.querySelector('#forward').disabled = !webView.canGoForward();
  closeBoxes();
}

function handleLoadStart(event) {
  document.body.classList.add('loading');
  isLoading = true;

  resetExitedState();
  if (!event.isTopLevel) {
    return;
  }

  document.querySelector('#location').value = event.url;
}

function handleLoadStop(event) {
  // We don't remove the loading class immediately, instead we let the animation
  // finish, so that the spinner doesn't jerkily reset back to the 0 position.
  isLoading = false;
}

function handleLoadAbort(event) {
  console.log('LoadAbort');
  console.log('  url: ' + event.url);
  console.log('  isTopLevel: ' + event.isTopLevel);
  console.log('  type: ' + event.type);
}

function handleLoadRedirect(event) {
  resetExitedState();
  document.querySelector('#location').value = event.newUrl;
}

function getNextPresetZoom(zoomFactor) {
  var preset = [0.25, 0.33, 0.5, 0.67, 0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2,
                2.5, 3, 4, 5];
  var low = 0;
  var high = preset.length - 1;
  var mid;
  while (high - low > 1) {
    mid = Math.floor((high + low)/2);
    if (preset[mid] < zoomFactor) {
      low = mid;
    } else if (preset[mid] > zoomFactor) {
      high = mid;
    } else {
      return {low: preset[mid - 1], high: preset[mid + 1]};
    }
  }
  return {low: preset[low], high: preset[high]};
}

function increaseZoom() {
  //var webView = document.querySelector('.mainWebview');
  webView.getZoom(function(zoomFactor) {
    var nextHigherZoom = getNextPresetZoom(zoomFactor).high;
    webView.setZoom(nextHigherZoom);
    document.forms['zoom-form']['zoom-text'].value = nextHigherZoom.toString();
  });
}

function decreaseZoom() {
  //var webView = document.querySelector('.mainWebview');
  webView.getZoom(function(zoomFactor) {
    var nextLowerZoom = getNextPresetZoom(zoomFactor).low;
    webView.setZoom(nextLowerZoom);
    document.forms['zoom-form']['zoom-text'].value = nextLowerZoom.toString();
  });
}

function openZoomBox() {
  document.querySelector('.mainWebview').getZoom(function(zoomFactor) {
    var zoomText = document.forms['zoom-form']['zoom-text'];
    zoomText.value = Number(zoomFactor.toFixed(6)).toString();
    document.querySelector('#zoom-box').style.display = '-webkit-flex';
    zoomText.select();
  });
}

function closeZoomBox() {
  document.querySelector('#zoom-box').style.display = 'none';
}

function openFindBox() {
  document.querySelector('#find-box').style.display = 'block';
  document.forms['find-form']['find-text'].select();
}

function closeFindBox() {
  var findBox = document.querySelector('#find-box');
  findBox.style.display = 'none';
  findBox.style.left = "";
  findBox.style.opacity = "";
  document.querySelector('#find-results').innerText= "";
}

function closeBoxes() {
  closeZoomBox();
  closeFindBox();
}
