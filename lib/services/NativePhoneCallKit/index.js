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
const react_native_1 = require("react-native");
const react_native_callkeep_1 = __importStar(require("react-native-callkeep"));
const react_native_uuid_1 = __importDefault(require("react-native-uuid"));
// import InCallManager from 'react-native-incall-manager';
const react_native_2 = require("react-native");
const getNewUuid = () => react_native_uuid_1.default.v4().toString().toLowerCase();
const parseCauseCode = (cause) => {
    switch (cause) {
        case "Canceled":
            return react_native_callkeep_1.CONSTANTS.END_CALL_REASONS.MISSED;
        case "Failed":
            return react_native_callkeep_1.CONSTANTS.END_CALL_REASONS.FAILED;
        case 'Ended':
            return react_native_callkeep_1.CONSTANTS.END_CALL_REASONS.REMOTE_ENDED;
        default:
            return react_native_callkeep_1.CONSTANTS.END_CALL_REASONS.REMOTE_ENDED;
    }
};
class NativePhone {
    constructor(callService) {
        // private androidCallBridge!: AndroidCallBridge|null;
        this.callStartingMap = new Map();
        console.log('====================================');
        console.log('NativePhone initiated');
        console.log('====================================');
        if (NativePhone.instance) {
            console.log('====================================');
            console.log('NativePhone instance already exists');
            console.log('====================================');
            return NativePhone.instance;
        }
        NativePhone.instance = this;
        this.callService = callService;
        // this.androidCallBridge = Platform.OS==='android' ?new AndroidCallBridge(this.showIncomingCall.bind(this),this.androidEndCallHandler.bind(this),this.androidAnswerCallHandler.bind(this)):null;
        this.init();
    }
    async init() {
        console.log('====================================');
        console.log('init of NativePhone');
        console.log('====================================');
        try {
            await react_native_callkeep_1.default.setup({
                ios: {
                    appName: 'N4COM App',
                },
                android: {
                    alertTitle: 'Permissions required',
                    alertDescription: 'This application needs to access your phone accounts',
                    cancelButton: 'Cancel',
                    okButton: 'ok',
                    foregroundService: {
                        channelId: 'com.buniq.n4com',
                        channelName: 'Foreground service for my app',
                        notificationTitle: 'My app is running on background',
                        notificationIcon: 'Path to the resource icon of the notification',
                    },
                    selfManaged: false,
                    additionalPermissions: [],
                },
            });
            react_native_callkeep_1.default.setAvailable(true);
            react_native_callkeep_1.default.canMakeMultipleCalls(false);
            this.registerEventsListeners();
        }
        catch (error) {
            react_native_callkeep_1.default.setAvailable(false);
            react_native_callkeep_1.default.canMakeMultipleCalls(false);
            this.registerEventsListeners();
            console.log('====================================');
            console.log('error in init of NativePhone', error);
            console.log('====================================');
        }
    }
    registerEventsListeners() {
        console.log('====================================');
        console.log('NativePhoneCallKit registerEventsListeners');
        console.log('====================================');
        react_native_callkeep_1.default.addEventListener('didReceiveStartCallAction', (obj) => this.onNativeCallStart(obj));
        react_native_callkeep_1.default.addEventListener('answerCall', ({ callUUID }) => this.onNativeCallAnswer(callUUID));
        react_native_callkeep_1.default.addEventListener('endCall', ({ callUUID }) => this.onNativeCallEnd(callUUID));
        react_native_callkeep_1.default.addEventListener("didLoadWithEvents", (events) => this.onNativeCallLoad(events));
        react_native_callkeep_1.default.addEventListener('didDisplayIncomingCall', (event) => this.onNativeCallDisplay(event));
        react_native_callkeep_1.default.addEventListener('didPerformSetMutedCallAction', ({ muted, callUUID }) => this.onNativeCallMute(muted, callUUID));
        react_native_callkeep_1.default.addEventListener('didToggleHoldCallAction', ({ hold, callUUID }) => this.onNativeCallHold(hold, callUUID));
        // if (Platform.OS==='android')  RNCallKeep.addEventListener("showIncomingCallUi",({handle, callUUID, name })=> this.onNativeAndroidCallShow(handle, callUUID, name ));
        react_native_callkeep_1.default.addEventListener("didPerformDTMFAction", (obj) => this.onNativeCallDTMF(obj));
        react_native_callkeep_1.default.addEventListener("didChangeAudioRoute", (obj) => this.onNativeCallAudioRoute(obj));
        react_native_2.DeviceEventEmitter.addListener('Proximity', function (data) {
        });
        if (react_native_1.Platform.OS === 'ios') {
            //  NativeModules.InCallManager.addListener('Proximity')             
        }
        this.getInitialEvents();
    }
    removeEventsListeners() {
        react_native_callkeep_1.default.removeEventListener('didReceiveStartCallAction');
        react_native_callkeep_1.default.removeEventListener('answerCall');
        react_native_callkeep_1.default.removeEventListener('endCall');
        react_native_callkeep_1.default.removeEventListener('didLoadWithEvents');
        react_native_callkeep_1.default.removeEventListener('didPerformSetMutedCallAction');
        react_native_callkeep_1.default.removeEventListener('didToggleHoldCallAction');
        react_native_callkeep_1.default.removeEventListener('showIncomingCallUi');
        react_native_callkeep_1.default.removeEventListener('didPerformDTMFAction');
        react_native_callkeep_1.default.removeEventListener('didChangeAudioRoute');
    }
    async getInitialEvents() {
        console.log('====================================');
        console.log('getInitialEvents');
        console.log('====================================');
        const events = await react_native_callkeep_1.default.getInitialEvents();
        console.log('====================================');
        console.log('getInitialEvents', events);
        console.log('====================================');
    }
    onNativeCallStart(obj) {
        console.log('====================================');
        console.log('onNativeCallStart', obj);
        console.log('====================================');
        if (!obj.handle) {
            return;
        }
        // if callUUID is not provided, it means the call was initiated by phone app in ios
        if (!obj.callUUID) {
            if (this.callService.callStore.getAllCalls().length > 0) {
                return;
            }
            const callUUID = getNewUuid();
            react_native_callkeep_1.default.startCall(callUUID, obj.handle, obj.handle, 'number', false);
            return;
        }
        let name = this.callStartingMap.get(obj.callUUID);
        this.callService.startedCall(obj.handle, obj.callUUID, obj.name ? obj.name : name);
        name !== null && name !== void 0 ? name : this.callStartingMap.delete(obj.callUUID);
    }
    onNativeCallAnswer(callUUID) {
        console.log('====================================');
        console.log('onNativeCallAnswer', callUUID);
        console.log('====================================');
        try {
            this.callService.answeredCall(callUUID);
            // if (Platform.OS==='android') {
            //     // this.androidCallBridge?.dismissCall(callUUID);                    
            // }
        }
        catch (error) {
            console.log('error in answering native call', error);
            this.reportCallEnded(callUUID, 'Failed', 'local');
            // this.callService.reportCallError(error);
        }
    }
    onNativeCallEnd(callUUID) {
        console.log('====================================');
        console.log('onNativeCallEnd', callUUID);
        console.log('====================================');
        this.callService.endCallByUUID(callUUID);
    }
    onNativeCallLoad(events) {
        let endedCallsUUID = events.map((ev) => {
            if (ev.name === 'RNCallKeepPerformEndCallAction') {
                return ev.data.callUUID;
            }
            return null;
        });
        events.forEach((element) => {
            switch (element.name) {
                case 'RNCallKeepDidDisplayIncomingCall':
                    if (endedCallsUUID.indexOf(element.data.callUUID) === -1) {
                        this.callService.callScreenDisplayed(element.data.callUUID, element.data.handle, element.data.localizedCallerName);
                    }
                    break;
                case 'RNCallKeepPerformAnswerCallAction':
                    this.callService.preLaunchAnswerCall(element.data.callUUID);
                    break;
                case 'RNCallKeepDidReceiveStartCallAction':
                    //   this.callService.preLaunchStartCall(element.data.handle,element.data.callUUID,element.data.name);
                    break;
                default:
                    break;
            }
        });
    }
    onNativeCallMute(muted, callUUID) {
        this.callService.onCallMuted(muted, callUUID);
    }
    onNativeCallHold(hold, callUUID) {
        this.callService.onCallHeld(callUUID, hold);
    }
    onNativeAndroidCallShow(handle, callUUID, name) {
        // if (this.androidCallBridge?.incomingCallScreenActive && this.androidCallBridge?.incomingCallScreenPayload.uuid!==callUUID) {
        //     this.reportCallEnded(callUUID,'Failed','local');
        //     return;
        // }
        // this.androidCallBridge?.showIncomingCallScreen({uuid:callUUID, callerName:name, callerHandle:handle});
        // this.onNativeCallDisplay({ error:null, callUUID, handle, localizedCallerName:name, hasVideo:false, fromPushKit:null, payload:null });
    }
    onNativeCallDTMF(obj) {
        this.callService.sendDTMF(obj.digits, obj.callUUID);
    }
    onNativeCallAudioRoute(obj) {
        this.callService.changeAudioRoute(obj.output, obj === null || obj === void 0 ? void 0 : obj.callUUID);
    }
    onNativeCallDisplay(event) {
        console.log('====================================');
        console.log('onNativeCallDisplay', event);
        console.log('====================================');
        this.callService.callScreenDisplayed(event.callUUID, event.handle, event.localizedCallerName);
        // if (Platform.OS==='android') {
        //     RNCallKeep.backToForeground();
        // }
    }
    setEstablishedCall(callUUID) {
        if (!callUUID) {
            return;
        }
        react_native_callkeep_1.default.setCurrentCallActive(callUUID);
    }
    showIncomingCall(callUUID, handle, name) {
        console.log('showIncomingCall', callUUID, handle, name);
        react_native_callkeep_1.default.displayIncomingCall(callUUID, handle, name);
        if (react_native_1.Platform.OS === 'android') {
            // RNCallKeep.backToForeground();
            this.onNativeCallDisplay({ callUUID, handle, localizedCallerName: name, hasVideo: false, fromPushKit: null, payload: null });
        }
    }
    reportCallEnded(callUUID, cause, originator) {
        const causeCode = parseCauseCode(cause);
        react_native_callkeep_1.default.reportEndCallWithUUID(callUUID, causeCode);
        // todo add call status check
        // this.androidCallBridge?.incomingCallScreenActive&& this.androidCallBridge?.dismissCall(callUUID);
    }
    androidEndCallHandler(payload) {
        console.log('====================================');
        console.log('androidEndCallHandler', payload);
        console.log('====================================');
        react_native_callkeep_1.default.endCall(payload.uuid);
        // this.androidCallBridge?.dismissCall(payload.uuid);
    }
    androidAnswerCallHandler(payload) {
        react_native_callkeep_1.default.answerIncomingCall(payload.uuid);
        if (payload.isHeadless) {
            // this.androidCallBridge?.launchApp(payload.uuid,payload.callerName);   
        }
        else {
            // this.androidCallBridge?.backToForeground();
        }
    }
    startInCallManager() {
        // console.log('====================================');
        // console.log('starting incall manager');
        // console.log('====================================');
        // InCallManager.start({media: 'audio'}); 
    }
    stopInCallManager() {
        // console.log('====================================');
        // console.log('stopping incall manager');
        // console.log('====================================');
        // InCallManager.stop();
    }
    async setAudioRoute(route, uuid) {
        await react_native_callkeep_1.default.setAudioRoute(uuid, route);
    }
    async getAudioRoutes() {
        const routes = await react_native_callkeep_1.default.getAudioRoutes();
        return routes;
    }
    startCall(callUUID, handle, name) {
        console.log('====================================');
        console.log('startCall', callUUID, handle, name);
        console.log('====================================');
        react_native_callkeep_1.default.startCall(callUUID, handle, name, 'number', false);
        react_native_callkeep_1.default.updateDisplay(callUUID, name, handle);
        this.callStartingMap.set(callUUID, name);
    }
    endCall(callUUID) {
        console.log('====================================');
        console.log('endCall', callUUID);
        console.log('====================================');
        react_native_callkeep_1.default.endCall(callUUID);
    }
    holdCall(callUUID, hold) {
        react_native_callkeep_1.default.setOnHold(callUUID, hold);
    }
    muteCall(callUUID, muted) {
        react_native_callkeep_1.default.setMutedCall(callUUID, muted);
    }
    clear() {
        console.log('====================================');
        console.log('clear');
        console.log('====================================');
        react_native_callkeep_1.default.endAllCalls();
    }
    updateDisplay(callUUID, name, handle) {
        react_native_callkeep_1.default.updateDisplay(callUUID, name, handle);
        // this.androidCallBridge?.updateDisplay(callUUID,name,handle);
    }
}
exports.default = NativePhone;
