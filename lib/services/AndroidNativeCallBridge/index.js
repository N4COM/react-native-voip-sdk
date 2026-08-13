"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_1 = require("react-native");
const react_native_incoming_call_1 = __importDefault(require("react-native-incoming-call"));
const prompts_1 = __importDefault(require("../../prompts"));
class AndroidCallBridge {
    constructor(onShowNativeCall, endCallCallBack, answerCallCallBack) {
        this.incomingCallScreenActive = false;
        this.incomingCallScreenPayload = null;
        this.onShowNativeCall = onShowNativeCall;
        this.endCallCallBack = endCallCallBack;
        this.answerCallCallBack = answerCallCallBack;
        this.init();
    }
    async init() {
        this.registerAndroidCallListeners();
        const payload = await react_native_incoming_call_1.default.getExtrasFromHeadlessMode();
        if (payload) {
            this.handlePayload(payload);
        }
    }
    registerAndroidCallListeners() {
        react_native_1.DeviceEventEmitter.addListener("endCall", (payload) => this.endCallCallBack(payload));
        react_native_1.DeviceEventEmitter.addListener("answerCall", (payload) => this.answerCallCallBack(payload));
    }
    destroy() {
        react_native_1.DeviceEventEmitter.removeAllListeners("endCall");
        react_native_1.DeviceEventEmitter.removeAllListeners("answerCall");
    }
    handlePayload(payload) {
        this.onShowNativeCall(payload.uuid, payload.callerName, payload.callerName);
    }
    async showIncomingCallScreen(payload) {
        console.log('====================================');
        console.log('showIncomingCallScreen in AndroidNativeCallBridge', payload);
        console.log('====================================');
        this.incomingCallScreenActive = true;
        this.incomingCallScreenPayload = payload;
        const incomingCallScreen = await prompts_1.default.getIncomingCallScreen();
        react_native_incoming_call_1.default.display(payload.uuid, // Call UUID v4
        payload.callerName, // Username
        'https://gravatar.com/avatar/10b2db7467c1d5e5ffcf2df2e7bde120?s=400&d=mp&r=x', // Avatar URL
        incomingCallScreen.info, 180000, // Timeout for end call after 180s
        incomingCallScreen.accept, incomingCallScreen.decline);
    }
    dismissCall(callUUID) {
        if (!this.incomingCallScreenPayload || callUUID !== this.incomingCallScreenPayload.uuid) {
            return;
        }
        react_native_incoming_call_1.default.dismiss();
        this.incomingCallScreenActive = false;
        this.incomingCallScreenPayload = null;
    }
    backToForeground() {
        react_native_incoming_call_1.default.backToForeground();
    }
    launchApp(callUUID, callerName) {
        react_native_incoming_call_1.default.openAppFromHeadlessMode(callUUID, callerName);
    }
    async updateDisplay(callUUID, name, handle) {
        react_native_incoming_call_1.default.updateDisplay(callUUID, name, handle);
    }
}
exports.default = AndroidCallBridge;
