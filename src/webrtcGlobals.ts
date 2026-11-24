// Stock JsSIP reads window.RTCPeerConnection and navigator.mediaDevices as
// globals. The JsSIP fork this SDK used before called registerGlobals() itself;
// stock JsSIP does not, so the SDK does it here. Imported ahead of 'jssip' in
// classes/softPhone.ts so the globals exist before any JsSIP code can run.
// Calling registerGlobals() again from the host app is harmless.
import { registerGlobals } from 'react-native-webrtc';

declare const global: any;

if (global.window === undefined) {
    // registerGlobals() assigns to global.*, JsSIP looks under window.*.
    global.window = global;
}

registerGlobals();
