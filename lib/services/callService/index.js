"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ESTABLISHED = exports.RINGING = exports.CONNECTING = exports.CALL_PROGRESS = exports.HELD = void 0;
const NativePhoneCallKit_1 = __importDefault(require("../NativePhoneCallKit"));
const NotificationService_1 = __importDefault(require("../NotificationService"));
const SipService_1 = __importDefault(require("../SipService"));
const callStore_1 = __importDefault(require("./callStore"));
const react_native_uuid_1 = __importDefault(require("react-native-uuid"));
const react_native_1 = require("react-native");
const react_native_background_timer_1 = __importDefault(require("react-native-background-timer"));
const eventemitter3_1 = require("eventemitter3");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
exports.HELD = 'held';
exports.CALL_PROGRESS = 'call_progress';
exports.CONNECTING = 'connecting';
exports.RINGING = 'ringing';
exports.ESTABLISHED = 'established';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'cryp... Remove this comment to see the full error message
const crypto_js_1 = require("crypto-js");
function standardizeRouteName(route) {
    if (route.toUpperCase() === 'PHONE' ||
        route.toUpperCase() === 'EARPIECE' ||
        route.toUpperCase() === 'RECEIVER') {
        return 'PHONE';
    }
    if (route.toUpperCase().includes('SPEAKER')) {
        return 'SPEAKER';
    }
    if (route.toUpperCase().includes('HEADSET') || route.toUpperCase().includes('HEADPHONES')) {
        return 'HEADSET';
    }
    if (route.toUpperCase().includes('BLUETOOTH')) {
        return 'BLUETOOTH';
    }
    return 'PHONE';
}
const getNewUuid = () => react_native_uuid_1.default.v4().toString().toLowerCase();
class CallService extends eventemitter3_1.EventEmitter {
    constructor() {
        super();
        this.appState = react_native_1.AppState.currentState;
        this.sipServiceInitFailed = false;
        this.canCall = false;
        this.callStore = new callStore_1.default();
        this.nativePhone = new NativePhoneCallKit_1.default(this);
        this.sipClient = new SipService_1.default(this);
        this.notificationService = new NotificationService_1.default(this);
        this.appStateListener();
    }
    async init(token) {
        const saved = await this.saveToken(token);
        if (!saved) {
            return;
        }
        this.initiateCallService();
    }
    async saveToken(token) {
        try {
            await async_storage_1.default.setItem('token', token);
            return true;
        }
        catch (error) {
            console.log('====================================');
            console.log('saveToken error', error);
            console.log('====================================');
            return false;
        }
    }
    registerPushToken(pushToken, platform) {
        this.sipClient.registerPushToken(pushToken, platform);
    }
    initiateCallService() {
        this.sipClient.registerClient();
        this.notificationService.registerAndroid();
    }
    appStateListener() {
        react_native_1.AppState.addEventListener('change', (nextAppState) => {
            if (this.appState.match(/inactive|background/) && nextAppState === 'active') {
                this.sipClient.init();
            }
            if (this.appState.match(/active/) && nextAppState === 'background') {
                this.callStore.callUUIDMap.size === 0 && this.stopCallService();
            }
            this.appState = nextAppState;
        });
    }
    stopCallService() {
        this.sipClient.destroy();
    }
    removeSipCredentials() {
        this.sipClient.destroy();
        this.sipClient.removeCredentials();
    }
    setCallServiceDeviceId(deviceId) {
        this.callServiceDeviceId = deviceId;
    }
    callScreenDisplayed(callUUID, handle, name) {
        var _a;
        const call = this.callStore.getCallByCallUUID(callUUID);
        if (call) {
            console.log('callScreenDisplayed call', call);
            return;
        }
        if (this.pendingCall && this.pendingCall.callUUID !== callUUID && this.pendingCallTimeout) {
            console.log('callScreenDisplayed pendingCall', this.pendingCall);
            (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.reportCallEnded(this.pendingCall.callUUID, 'Failed', 'local');
            react_native_background_timer_1.default.clearTimeout(this.pendingCallTimeout);
            this.pendingCall = undefined;
            this.pendingCallTimeout = undefined;
            this.emit('callPending', this.pendingCall);
        }
        this.pendingCall = { callUUID, handle, name, isAnswered: false };
        console.log('callScreenDisplayed pendingCall', this.pendingCall);
        // auto destroy the call after 5 seconds
        this.pendingCallTimeout = react_native_background_timer_1.default.setTimeout(() => {
            var _a;
            console.log('callScreenDisplayed pendingCallTimeout');
            this.emit('callFailed');
            this.pendingCall = undefined;
            (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.reportCallEnded(callUUID, 'Failed', 'local');
            this.pendingCallTimeout = undefined;
            this.emit('callPending', this.pendingCall);
            this.callCleanUp();
        }, 5000);
        this.sipClient.init();
    }
    onSipClientReady() {
        this.canCall = true;
        this.sipServiceInitFailed = false;
        if (this.pendingOutgoingCall && this.pendingOutgoingCallTimeout) {
            this.startedCall(this.pendingOutgoingCall.handle, this.pendingOutgoingCall.callUUID, this.pendingOutgoingCall.name);
            react_native_background_timer_1.default.clearTimeout(this.pendingOutgoingCallTimeout);
            this.pendingOutgoingCall = undefined;
            this.pendingOutgoingCallTimeout = undefined;
        }
    }
    onSipClientFailed() {
        this.canCall = false;
        this.sipServiceInitFailed = true;
        this.emit('sipServiceFailed');
    }
    makeSureUUIDisUUID4(uuid) {
        if (uuid.length === 32 || react_native_1.Platform.OS === 'android') {
            return uuid;
        }
        // Create a deterministic UUID using a hash of the input string
        const hashHex = (0, crypto_js_1.MD5)(uuid).toString();
        const uuid4 = `${hashHex.slice(0, 8)}-${hashHex.slice(8, 12)}-4${hashHex.slice(12, 15)}-a${hashHex.slice(15, 18)}-${hashHex.slice(18, 30)}`;
        return uuid4.toLowerCase();
    }
    onIncomingSipCall(sessionEvent) {
        var _a, _b;
        if (sessionEvent.originator === 'remote' && (!this.canCall || this.callConnectingUUID || this.callStore.callUUIDMap.size > 1)) {
            this.sipClient.endCall(sessionEvent.request.call_id);
            return;
        }
        let callUUID = this.makeSureUUIDisUUID4(sessionEvent.request.call_id);
        let showIncomingCallScreen = true;
        let isAnswered = false;
        let name = sessionEvent.request.from._display_name;
        let handle = sessionEvent.request.from._uri._user;
        if (this.pendingCall && this.pendingCallTimeout && this.pendingCall.callUUID === this.makeSureUUIDisUUID4(sessionEvent.request.call_id)) {
            callUUID = this.pendingCall.callUUID;
            name = this.pendingCall.name;
            isAnswered = this.pendingCall.isAnswered;
            react_native_background_timer_1.default.clearTimeout(this.pendingCallTimeout);
            this.pendingCall = undefined;
            showIncomingCallScreen = false;
            this.pendingCallTimeout = undefined;
        }
        if (this.pendingCall && this.pendingCallTimeout && this.pendingCall.callUUID !== this.makeSureUUIDisUUID4(sessionEvent.request.call_id)) {
            (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.reportCallEnded(this.pendingCall.callUUID, 'Failed', 'local');
            this.pendingCall = undefined;
            react_native_background_timer_1.default.clearTimeout(this.pendingCallTimeout);
            this.pendingCallTimeout = undefined;
            this.emit('callPending', this.pendingCall);
        }
        const newCall = {
            sessionId: sessionEvent.request.call_id,
            callUUID,
            name,
            handle,
            isMuted: false,
            callStatus: 'connecting',
            isHeld: false,
            callDirection: 'incoming',
            callType: 'audio',
            timeStarted: null,
            audioRoute: 'PHONE'
        };
        this.callConnectingUUID = callUUID;
        this.callStore.addCall(newCall);
        this.focusedCallUUID = callUUID;
        this.emit('newCall', newCall);
        isAnswered && this.sipClient.answerCall(sessionEvent.request.call_id);
        showIncomingCallScreen && ((_b = this.nativePhone) === null || _b === void 0 ? void 0 : _b.showIncomingCall(callUUID, handle, name));
    }
    onSipCallFailed(sessionEvent) {
        var _a;
        if (sessionEvent.originator === 'local') {
            const calls = this.callStore.getAllCalls();
            calls.forEach((call) => {
                var _a;
                (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.reportCallEnded(call.callUUID, sessionEvent.cause, 'local');
                this.callStore.removeCallByCallUUID(call.callUUID);
                this.emit('callEnded', call);
            });
            this.callCleanUp();
            return;
        }
        const call = this.callStore.getCallBySessionId(sessionEvent.message.call_id);
        const originator = sessionEvent.originator;
        const cause = sessionEvent.cause;
        if (call) {
            call.endReason = cause;
            (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.reportCallEnded(call.callUUID, cause, originator);
            this.callStore.removeCallBySessionId(sessionEvent.message.call_id);
            this.emit('callEnded', call);
            this.sipClient.removeSession(sessionEvent.message.call_id);
            this.callCleanUp();
        }
    }
    onSipCallEnded(sessionEvent) {
        var _a;
        if (sessionEvent.originator === 'local') {
            const calls = this.callStore.getAllCalls();
            calls.forEach((call) => {
                var _a;
                (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.reportCallEnded(call.callUUID, sessionEvent.cause, 'local');
                this.callStore.removeCallByCallUUID(call.callUUID);
                this.emit('callEnded', call);
            });
            this.callCleanUp();
            return;
        }
        const call = this.callStore.getCallBySessionId(sessionEvent.message.call_id);
        const originator = sessionEvent.originator;
        const cause = sessionEvent.cause;
        if (call) {
            call.endReason = cause;
            (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.reportCallEnded(call.callUUID, cause, originator);
            this.callStore.removeCallBySessionId(sessionEvent.message.call_id);
            this.emit('callEnded', call);
            this.sipClient.removeSession(sessionEvent.message.call_id);
            this.callCleanUp();
        }
    }
    onSipCallConfirmed(session) {
        var _a, _b;
        if (session.originator === 'local') {
            return;
        }
        const call = this.callStore.getCallBySessionId(session.ack.call_id);
        this.callStore.startCallTimer(session.ack.call_id);
        this.callStore.updateCallStatusBySessionId(session.ack.call_id, 'established');
        (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.setEstablishedCall((call === null || call === void 0 ? void 0 : call.callUUID) || '');
        this.callConnectingUUID = undefined;
        this.holdOtherCalls(session.ack.call_id);
        this.emit('callUpdated', call);
        // this line seems to be not needed, to be tested
        this.emit('callPending', this.pendingCall);
        (_b = this.nativePhone) === null || _b === void 0 ? void 0 : _b.startInCallManager();
    }
    onSipCallAccepted(sessionEvent) {
        var _a;
        if (sessionEvent.originator === 'local') {
            return;
        }
        const call = this.callStore.getCallBySessionId(sessionEvent.response.call_id);
        this.callStore.startCallTimer(sessionEvent.response.call_id);
        this.callStore.updateCallStatusBySessionId(sessionEvent.response.call_id, 'established');
        this.callConnectingUUID = undefined;
        (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.setEstablishedCall((call === null || call === void 0 ? void 0 : call.callUUID) || '');
        this.holdOtherCalls(sessionEvent.response.call_id);
        this.emit('callUpdated', call);
    }
    // onSipCallPeerConnection(session:any){
    // }
    onSipCallProgress(session) {
        if (session.originator === 'local') {
            return;
        }
        const call = this.callStore.getCallBySessionId(session.response.call_id);
        this.callStore.updateCallStatusBySessionId(session.response.call_id, 'ringing');
        this.emit('callUpdated', call);
    }
    onIncomingFcmCall(callUUID, handle, name) {
        var _a;
        (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.showIncomingCall(callUUID, handle, name);
        // this.callScreenDisplayed(callUUID,handle,name)
    }
    onSipLocalSessionCreated() {
        var _a;
        (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.startInCallManager();
    }
    startedCall(handle, callUUID, name) {
        name = name || handle;
        handle = handle.replace(/[^\d+*#]/g, '');
        if (!this.canCall) {
            this.pendingOutgoingCall = { callUUID, handle, name };
            this.pendingOutgoingCallTimeout = react_native_background_timer_1.default.setTimeout(() => {
                var _a;
                this.pendingOutgoingCall = undefined;
                this.pendingOutgoingCallTimeout = undefined;
                (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.reportCallEnded(callUUID, 'Failed', 'local');
            }, 5000);
            this.sipClient.init();
            return;
        }
        const session = this.sipClient.startCall(handle);
        const newCall = {
            sessionId: session._request.call_id,
            callUUID,
            name,
            handle,
            isMuted: false,
            callStatus: 'connecting',
            isHeld: false,
            callDirection: 'outgoing',
            callType: 'audio',
            timeStarted: null,
            audioRoute: 'PHONE'
        };
        this.callConnectingUUID = callUUID;
        this.callStore.addCall(newCall);
        this.emit('newCall', newCall);
        this.focusedCallUUID = callUUID;
    }
    makeCall(handle, name) {
        var _a;
        console.log("makeCall", handle, name);
        if (!this.canCall) {
            console.log("makeCall failed");
            this.emit('outgoingCallFailed');
            return;
        }
        const callUUID = getNewUuid();
        (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.startCall(callUUID, handle, name ? name : handle);
    }
    answeredCall(callUUID) {
        if (this.pendingCall && this.pendingCall.callUUID === callUUID) {
            this.pendingCall.isAnswered = true;
            this.emit('callPending', this.pendingCall);
            return;
        }
        const call = this.callStore.getCallByCallUUID(callUUID);
        if (call) {
            this.sipClient.answerCall(call.sessionId);
            this.emit('callPending', call);
        }
    }
    terminateCall() {
        var _a, _b;
        if (!this.focusedCallUUID) {
            (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.clear();
            return;
        }
        (_b = this.nativePhone) === null || _b === void 0 ? void 0 : _b.endCall(this.focusedCallUUID);
    }
    endCallByUUID(callUUID) {
        if (this.pendingCallTimeout && this.pendingCall && this.pendingCall.callUUID === callUUID) {
            this.pendingCall = undefined;
            react_native_background_timer_1.default.clearTimeout(this.pendingCallTimeout);
            this.pendingCallTimeout = undefined;
            this.emit('callPending', this.pendingCall);
            return;
        }
        const call = this.callStore.getCallByCallUUID(callUUID);
        if (call) {
            this.sipClient.endCall(call.sessionId);
            this.sipClient.removeSession(call.sessionId);
            this.callStore.removeCallByCallUUID(callUUID);
            this.emit('callEnded', call);
            this.callCleanUp();
        }
    }
    preLaunchAnswerCall(callUUID) {
        if (this.pendingCall && this.pendingCall.callUUID === callUUID) {
            this.pendingCall.isAnswered = true;
            this.emit('callPending', this.pendingCall);
            return;
        }
    }
    // preLaunchStartCall(handle:string,callUUID:string,name:string){
    // }
    muteCall() {
        var _a;
        if (!this.focusedCallUUID) {
            return;
        }
        const call = this.callStore.getCallByCallUUID(this.focusedCallUUID);
        if (call) {
            const isMuted = call.isMuted;
            (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.muteCall(call.callUUID, !isMuted);
        }
    }
    onCallMuted(isMuted, callUUID) {
        const call = this.callStore.getCallByCallUUID(callUUID);
        if (call) {
            this.sipClient.muteCall(call.sessionId, isMuted);
            this.callStore.updateCallMuteStatus(call.sessionId, isMuted);
            this.emit('callUpdated', call);
        }
    }
    toggleHoldCall() {
        var _a;
        if (!this.focusedCallUUID) {
            return;
        }
        const call = this.callStore.getCallByCallUUID(this.focusedCallUUID);
        if (call) {
            const isHeld = call.isHeld;
            (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.holdCall(call.callUUID, !isHeld);
        }
    }
    onCallHeld(callUUID, isHeld) {
        const call = this.callStore.getCallByCallUUID(callUUID);
        if (call) {
            this.sipClient.holdCall(call.sessionId, isHeld);
            this.callStore.updateCallHoldStatus(call.sessionId, isHeld);
            this.emit('callUpdated', call);
        }
    }
    swapCall() {
        var _a, _b;
        if (!this.focusedCallUUID) {
            return;
        }
        const calls = this.callStore.getAllCalls();
        if (calls.length === 1) {
            return;
        }
        const heldCall = calls.find((call) => call.callUUID !== this.focusedCallUUID && call.isHeld);
        if (heldCall) {
            (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.holdCall(this.focusedCallUUID, true);
            (_b = this.nativePhone) === null || _b === void 0 ? void 0 : _b.holdCall(heldCall.callUUID, false);
            this.focusedCallUUID = heldCall.callUUID;
        }
    }
    attendedTransferCall(originCall, targetCall) {
        this.sipClient.attendedTransferCall(originCall, targetCall);
    }
    blindTransferCall(targetNumber) {
        var _a;
        if (!this.focusedCallUUID) {
            return;
        }
        const sessionId = (_a = this.callStore.getCallByCallUUID(this.focusedCallUUID)) === null || _a === void 0 ? void 0 : _a.sessionId;
        if (sessionId) {
            this.sipClient.blindTransferCall(sessionId, targetNumber);
        }
    }
    sendDTMF(digits, callUUID) {
        if (!this.focusedCallUUID) {
            return;
        }
        const call = this.callStore.getCallByCallUUID(callUUID || this.focusedCallUUID);
        if (call) {
            this.sipClient.sendDTMF(call.sessionId, digits);
        }
    }
    changeAudioRoute(output, callUUID) {
        if (!this.focusedCallUUID) {
            return;
        }
        const call = this.callStore.getCallByCallUUID(callUUID || this.focusedCallUUID);
        if (call) {
            const audioRoute = standardizeRouteName(output);
            this.callStore.updateCallAudioRoute(call.sessionId, audioRoute);
            this.emit('callUpdated', call);
        }
    }
    resetIncomingCallProps() {
    }
    callCleanUp() {
        var _a;
        if (this.callStore.callUUIDMap.size === 0 && this.appState === 'background') {
            this.sipClient.destroy();
        }
        if (this.callConnectingUUID) {
            this.callConnectingUUID = undefined;
        }
        if (this.callStore.callUUIDMap.size === 0) {
            this.focusedCallUUID = undefined;
            (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.stopInCallManager();
            this.emit('callPending', this.pendingCall);
        }
        else {
            const calls = this.callStore.getAllCalls();
            const call = calls.find((call) => call.callStatus === 'established');
            if (call) {
                this.focusedCallUUID = call.callUUID;
            }
        }
    }
    holdOtherCalls(sessionId) {
        const calls = this.callStore.getAllCalls();
        calls.forEach((call) => {
            var _a;
            if (call.sessionId !== sessionId && !call.isHeld) {
                (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.holdCall(call.callUUID, true);
                this.callStore.updateCallHoldStatus(call.sessionId, true);
                this.emit('callUpdated', call);
            }
        });
    }
    async getAudioRoutes() {
        var _a;
        return await ((_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.getAudioRoutes());
    }
    async setAudioRoute(route) {
        var _a;
        if (!this.focusedCallUUID) {
            return;
        }
        await ((_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.setAudioRoute(route, this.focusedCallUUID));
    }
    updateCallInfo(callUUID, info) {
        var _a;
        this.callStore.updateCallInfo(callUUID, info);
        const call = this.callStore.getCallByCallUUID(callUUID);
        if (call) {
            (_a = this.nativePhone) === null || _a === void 0 ? void 0 : _a.updateDisplay(callUUID, info, call.handle);
            this.emit('callUpdated', this.callStore.getCallByCallUUID(callUUID));
        }
    }
}
const callServiceInstance = new CallService();
exports.default = callServiceInstance;
