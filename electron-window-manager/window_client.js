var {ipcRenderer} = require('electron');  // Module to create native browser window.

class WindowManagerClient {
  static sendToServer(action, data) {
    const command = {
      action: action,
      data: data
    };
    ipcRenderer.send('WindowManager', command);
  };

  constructor(window_name, dispatcher) {
    this.window_name = window_name;
    this.dispatcher = dispatcher;
  }

  init() {
    ipcRenderer.on('WindowManager', function(event, arg) {
      this.dispatcher(event, arg);
    }.bind(this));

    // notify main process init done
    WindowManagerClient.sendToServer('ready', {name: this.window_name});
  }

  create(window_name, args) {
    WindowManagerClient.sendToServer('create', {name: window_name, args: args});
  }

  open(window_name, args) {
    WindowManagerClient.sendToServer('open', {name: window_name, args: args});
  }

  focus(window_name) {
    WindowManagerClient.sendToServer('focus', {name: window_name});
  }

  close(window_name = this.window_name) {
    WindowManagerClient.sendToServer('close', {target: window_name});
  }

  send(window_name, payload) {
    WindowManagerClient.sendToServer('send', {target: window_name, payload: payload});
  }

}
module.exports = WindowManagerClient;
