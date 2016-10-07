/**
  observer.js

  Sets up a mutation observer that fires every 300ms, if there has been a DOM
  change.

  The variable names are purposely over-expressive, to reduce the risk of
  collisions with guest vars.
*/

// Since the guest is running in a node-enabled WebView, we can use the Electron
// IPC manager to communicate with the host.
const {ipcRenderer} = require('electron')
var dvs_wv_send_dom_changed_flag = false;
var dvs_wv_send_dom_changed_session = null;
const dvs_wv_send_dom_changed_session_interval = 300;
var dvs_wv_send_dom_changed_last_scroll_pos = 0;
var dvs_wv_send_dom_changed_ticking = false;

const observeDOM = (function(){
    const MutationObserver = window.MutationObserver;

    return function(obj, callback){
      // define a new observer
      var obs = new MutationObserver(function(mutations, observer){
        callback();
      });
      // have the observer watch for all changes.
      obs.observe( obj, { childList:true, subtree:true, attributes:true ,characterData:true});
    }
})();


/**
 Called by the dvs_wv_send_dom_changed_session timer every 300ms.  Checks to see if
 the dvs_wv_send_dom_changed_flag is set.  If so, it clears the flag and sends the IPC.
 */
function send_dom_changed_ipc() {

  if (!dvs_wv_send_dom_changed_flag) {
    return;
  }
  dvs_wv_send_dom_changed_flag = false;
  if (dvs_wv_send_dom_changed_session === null) {
    // Make sure the interval wasn't cleared during the delay
    return;
  }

  ipcRenderer.sendToHost('DOM_CHANGED');
}

// Before setting the interval, setup the interval killer.
// If the page is being unloaded, then clear the timer
document.addEventListener("beforeunload", function(event) {
  if (dvs_wv_send_dom_changed_session !== null) {
    window.clearInterval(dvs_wv_send_dom_changed_session);
    dvs_wv_send_dom_changed_session = null;
  }
});

// Wait for the DOM to load, so that the document is ready. Then launch the
// interval checker and the mutation observer.
document.addEventListener("DOMContentLoaded", function(event) {
  // Start the interval.
  dvs_wv_send_dom_changed_session = window.setInterval(send_dom_changed_ipc,
    dvs_wv_send_dom_changed_session_interval);

  // Start the mutation observer, and have it watch the entire body.
  observeDOM( document.body ,function(){
    dvs_wv_send_dom_changed_flag = true;
  });
});

// While the MutationObserver will event on all DOM changes, it won't detect
// when the view changed due to scrolling.  So, add a scroll tracker, and send
// an event when scrolling changes.
window.addEventListener('scroll', function(e) {
  dvs_wv_send_dom_changed_last_scroll_pos = window.scrollY;
  if (!dvs_wv_send_dom_changed_ticking) {
    window.requestAnimationFrame(function() {
      dvs_wv_send_dom_changed_flag = true;
      dvs_wv_send_dom_changed_ticking = false;
    });
  }
  dvs_wv_send_dom_changed_ticking = true;
});
