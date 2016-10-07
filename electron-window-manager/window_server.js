'use strict';
const Electron = require('electron');
const { ipcMain, BrowserWindow} = require('electron');  // Module to create native browser window.

const windows = [];
const eventQueue = [];


/**
  * Resolves a position name into x & y coordinates.
  * @param setup The window setup object
*/
function resolvePosition(setup){
     var screen = Electron.screen,
         screenSize = screen.getPrimaryDisplay().workAreaSize,
         position = setup.position,
         x = 0, y = 0,
         positionMargin = 0,
         windowWidth = setup.width,
         windowHeight = setup.height;

     // If the window dimensions are not set
     if(!windowWidth || !windowHeight){
         console.log('Cannot position a window with the width/height not defined!');

         // Put in in the center
         setup.center = true;
         return false;
     }

     // If the position name is incorrect
     if(['center', 'top', 'right', 'bottom', 'left', 'topLeft', 'leftTop', 'topRight',
             'rightTop', 'bottomRight', 'rightBottom', 'bottomLeft', 'leftBottom'].indexOf(position) < 0){

         console.log('The specified position "' + position + '" is\'not correct! Check the docs.');
         return false;
     }

     // It's center by default, no need to carry on
     if(position == 'center'){
         return false;
     }

     // Compensate for the frames
   if (setup.frame === true) {
       switch (position) {
           case 'left':
               break;

           case 'right':
               windowWidth += 8;
               break;

           case 'top':
               windowWidth += 13;
               break;

           case 'bottom':
               windowHeight += 50;
               windowWidth += 13;
               break;

           case 'leftTop':
           case 'topLeft':
               windowWidth += 0;
               windowHeight += 50;
               break;

           case 'rightTop':
           case 'topRight':
               windowWidth += 8;
               windowHeight += 50;
               break;

           case 'leftBottom':
           case 'bottomLeft':
               windowWidth -= 0;
               windowHeight += 50;
               break;

           case 'rightBottom':
           case 'bottomRight':
               windowWidth += 8;
               windowHeight += 50;
               break;
       }
   }

       switch (position) {
       case 'left':
           y = Math.floor((screenSize.height - windowHeight) / 2);
           x = positionMargin - 8;
           break;

       case 'right':
           y = Math.floor((screenSize.height - windowHeight) / 2);
           x = (screenSize.width - windowWidth) - positionMargin;
           break;

       case 'top':
           y = positionMargin;
           x = Math.floor((screenSize.width - windowWidth) / 2);
           break;

       case 'bottom':
           y = (screenSize.height - windowHeight) - positionMargin;
           x = Math.floor((screenSize.width - windowWidth) / 2);
           break;

       case 'leftTop':
       case 'topLeft':
           y = positionMargin;
           x = positionMargin - 8;
           break;

       case 'rightTop':
       case 'topRight':
           y = positionMargin;
           x = (screenSize.width - windowWidth) - positionMargin;
           break;

       case 'leftBottom':
       case 'bottomLeft':
           y = (screenSize.height - windowHeight) - positionMargin;
           x = positionMargin - 8;
           break;

       case 'rightBottom':
       case 'bottomRight':
           y = (screenSize.height - windowHeight) - positionMargin;
           x = (screenSize.width - windowWidth) - positionMargin;
           break;
  }
  console.log('resolvePosition:', [x,y]);
  return [x, y];
};


class WindowManagerServer {

  static sendMessage(windowName) {
    if(!(windowName in windows) || !windows[windowName]) {
      return;
    }
    if(!(windowName in eventQueue) || !eventQueue[windowName]) {
      return;
    }
    while(eventQueue[windowName].length > 0) {
      const obj = eventQueue[windowName].shift();
      if (windows[windowName] && windows[windowName].webContents) {
        windows[windowName].webContents.send('WindowManager', obj);
      }
    }
  };

  static push_message_queue(windowName, payload) {
    if(!(windowName in eventQueue) || typeof eventQueue[windowName] !== 'array') {
      eventQueue[windowName] = [];
    }
    eventQueue[windowName].push(payload);
  };

  constructor(windowDefinitions) {

    this.window_definitions = windowDefinitions || {};

    ipcMain.on('WindowManager', function(event, arg) {
      this.handleChannelWindowManager(event, arg);
    }.bind(this));
  }

  create(windowName, definition) {
    if (!(windowName in this.window_definitions)) {
      this.window_definitions[windowName] = definition;
    }
  }

  open(windowName, templateName) {
    if(windowName in windows && windows[windowName] != null) {
      return null;
    }
    if (!(templateName in this.window_definitions)) {
      console.log('WindowManagerServer.open - Error: could not find template:', templateName);
      return null;
    }

    const wdef = this.window_definitions[templateName];
    if ('position' in wdef) {
      const xy = resolvePosition(wdef);
      if(xy) {
        wdef.x = xy[0];
        wdef.y = xy[1];
      }
    }

    const window = new BrowserWindow(wdef);
    window.setMenu(null);
    window.loadURL(wdef.url);

    windows[windowName] = window;
    window.webContents.executeJavaScript(`
      var windowName ='${windowName}';
      (function() {
        windowManagerClient = new WindowManagerClient(windowName, receiveEvent);
        windowManagerClient.init();
      })();
    `);


    if ('showDevTools' in wdef && wdef.showDevTools === true) {
      window.openDevTools();
    }
    return window;
  }

  window(windowName) {
    if(windowName in windows && windows[windowName] != null) {
      return windows[windowName];
    }
    return null;
  }

  close(windowName) {
    console.log('WindowmanagerServer.close:', windowName);
    if(this.isOpened(windowName)) {
      windows[windowName].close();
    }
  }

  isOpened(windowName) {
    if(windowName in windows && windows[windowName] != null) {
      return true;
    }
    return false;
  }

  focus(windowName) {
    console.log('WindowmanagerServer.close:', windowName);
    if(this.isOpened(windowName)) {
      windows[windowName].focus();
    }
  }

  handleChannelWindowManager(event, command) {
    //console.log('WindowManagerServer - received event:', command);
    switch (command.action) {
      case 'create':
        {
          const windowName = command.data.name;
          const windowArgs = command.data.args;
          this.create(windowName, windowArgs);
        }
        break;
      case 'open':
        {
          const windowName = command.data.name;
          let windowArgs = command.data.args;
          if(command.data.args === undefined || command.data.args === null) {
            console.log('WindowManagerServer - open: No templateName supplied');
            return;
          } else {
            windowArgs = command.data.args;
          }
          if(this.isOpened(windowName)) {
            WindowManagerServer.sendMessage(windowName);
          } else {
            this.open(windowName, windowArgs);
          }
        }
        break;
      case 'ready':
        {
          const windowName = command.data.name;
          WindowManagerServer.sendMessage(windowName);
        }
        break;
      case 'focus':
      {
        const windowName = command.data.name;
        this.focus(windowName);
      }
      break;
      case 'send': {
        const windowName = command.data.target;
        const payload = command.data.payload;
        WindowManagerServer.push_message_queue(windowName, payload);
        WindowManagerServer.sendMessage(windowName);
      }
        break;
      case 'close': {
        const target_window = command.data.target;
        this.close(target_window);
      }
        break;
    }
  }

}

module.exports = WindowManagerServer;
