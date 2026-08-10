"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const react_native_1 = require("react-native");
const react_native_incoming_call_1 = __importDefault(require("react-native-incoming-call"));
const Localization = __importStar(require("expo-localization"));
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
        const appLanguage = await this.getAppLanguage();
        const isLanguageItalian = (appLanguage === null || appLanguage === void 0 ? void 0 : appLanguage.substring(0, 2)) === 'it';
        isLanguageItalian ?
            react_native_incoming_call_1.default.display(payload.uuid, // Call UUID v4
            payload.callerName, // Username
            'https://gravatar.com/avatar/10b2db7467c1d5e5ffcf2df2e7bde120?s=400&d=mp&r=x', // Avatar URL
            'Chiamata in arrivo', // Info text
            180000, // Timeout for end call after 180s
            'Accetta', 'Rifiuta')
            :
                react_native_incoming_call_1.default.display(payload.uuid, // Call UUID v4
                payload.callerName, // Username
                'https://gravatar.com/avatar/10b2db7467c1d5e5ffcf2df2e7bde120?s=400&d=mp&r=x', // Avatar URL
                'Incoming Call', // Info text
                180000, // Timeout for end call after 180s
                'Accept', 'Decline');
    }
    async getAppLanguage() {
        let appLanguage = await async_storage_1.default.getItem('app_language');
        if (!appLanguage)
            appLanguage = Localization.getLocales()[0].languageCode;
        return appLanguage;
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
