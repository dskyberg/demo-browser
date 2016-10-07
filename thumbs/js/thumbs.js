var WindowManagerClient = require('../electron-window-manager/window_client.js');
var windowManagerClient;

var counter = 0;

window.onresize = doLayout;

// Remember that paths are relative to the renderer (html) loading the file.
onload = function() {
  //windowManagerClient = new WindowManagerClient('Thumbs', receiveEvent);
  //windowManagerClient.init();
  doLayout();
  console.log('onload complete');
};

function updateThumbnail(id, data) {
  var thumb = document.getElementById(id);
  if (!thumb) {
    console.log('updateThumbnail - bad id:', id);
    return;
  }
  if (!data) {
    console.log('updateThumbnail - bad or no data');
    return;
  }
  thumb.style.backgroundImage = 'url(' + data + ')';
  thumb.style.backgroundSize = 'contain';

}
function removeThumbnail(id) {
  const elem = document.getElementById(id);
  if (elem) {
    elem.parentNode.removeChild(elem);
  }
}

function receiveEvent(event, args) {
  //console.log('Thumbs - received:', args);
  switch (args.type) {
    case 'THUMBNAIL':
      updateThumbnail(args.target, args.data);
      break;
    case 'THUMBNAIL_CLOSE':
      console.log('Received THUMBNAIL_CLOSE:', args);
      removeThumbnail(args.target);
      break;
  }
}

function clickThumb(e) {

  var activeThumb = document.getElementsByClassName('thumbWebview active')[0];
  if (activeThumb.dataset.id === e.target.dataset.id) {
    return;
  }
  activeThumb.classList.remove('active');
  e.target.classList.add('active');
  windowManagerClient.focus(e.target.dataset.target);
  //activeWv.classList.remove('mainWebview');
  //activeWv.classList.add('hide');
  //wv.classList.remove('hide');
  //wv.classList.add('mainWebview');
}

function doLayout() {
  var aside = document.querySelector('.aside');
  var asideWidth = aside && aside.offsetWidth || 0;

  var ratio_y = Math.round( (asideWidth / 16) * 9);

  var thumbs = document.querySelectorAll('.thumbWebview');
  for (var i = 0; i < thumbs.length; i++) {
    console.log('  - setting height:', ratio_y);
    thumbs[i].style.height = ratio_y + 'px';
  }
};


// <div class="thumbWebview active" onClick="clickThumb(this);"></div>
function handleAdd(event) {
  const activeThumb = document.querySelector('.thumbWebview.active');
  if (activeThumb) {
    activeThumb.classList.remove('active');
  }
  const browserNumber = counter++;

  const id = 'thumb-' + browserNumber;
  const browserName = 'browser-' + browserNumber;
  const div = document.createElement('div');
  div.id = id;
  div.classList.add('thumbWebview','active');
  div.onclick = clickThumb;
  div.dataset.id = browserNumber;
  div.dataset.target = browserName;
  const aside = document.querySelector('div.aside');
  aside.appendChild(div);
  doLayout();
  windowManagerClient.open(browserName, 'browser');
}
