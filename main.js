const electron = require('electron');
const {Menu, app, shell, BrowserWindow} = electron;
const WindowManagerServer = require('./electron-window-manager/window_server.js');
require('electron-reload')(__dirname);
const defaultMenu = require('./menu');

const thumbsUrl = 'file://' + __dirname + '/thumbs/index.html';
const browserUrl = 'file://' + __dirname + '/browser/index.html';

/*
  hialan electron-window-mamager
*/
const windowManagerServer = new WindowManagerServer({
  thumbs: {
    url: thumbsUrl,
    width: 150,
    height: 786,
    frame: true,
//    titleBarStyle: 'hidden',
    position: 'topLeft',
    //showDevTools: true
  },
  browser: {
    url: browserUrl,
    width: 1130,
    height: 786,
    x: 150,
    y: 0,
    frame: true,
//    titleBarStyle: 'hidden',
    showDevTools: true,
    skipTaskbar: true,
    webPreferences: {
      //offscreen: true,
      useContentSize: true,
      webSecurity: false,
      plugins: true,
      experimentalFeatures: true,
      experimentalCanvasFeatures: true,
      scrollBounce: true,
      zoomFactor: 1.0
    }
  }
});


// Quit when all windows are closed.
app.on('window-all-closed', function() {
  //if (process.platform != 'darwin') {
    app.quit();
  //}
});


// This method will be called when Electron has done everything
// initialization and ready for creating browser windows.
app.on('ready', function() {

  const template = defaultMenu(app, shell);
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  windowManagerServer.open('mainWindow', 'thumbs');
});
