"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Stock JsSIP reads window.RTCPeerConnection and navigator.mediaDevices as
// globals. The JsSIP fork this SDK used before called registerGlobals() itself;
// stock JsSIP does not, so the SDK does it here. Imported ahead of 'jssip' in
// classes/softPhone.ts so the globals exist before any JsSIP code can run.
// Calling registerGlobals() again from the host app is harmless.
const react_native_webrtc_1 = require("react-native-webrtc");
if (global.window === undefined) {
    // registerGlobals() assigns to global.*, JsSIP looks under window.*.
    global.window = global;
}
(0, react_native_webrtc_1.registerGlobals)();
