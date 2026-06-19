"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../API/api");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const react_native_background_timer_1 = __importDefault(require("react-native-background-timer"));
const softPhone_1 = __importDefault(require("../../classes/softPhone"));
const callOptions = {
    'mediaConstraints': { 'audio': true, 'video': false },
    'pcConfig': {
        'iceServers': [
            { 'urls': [
                    'stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'
                ] },
        ]
    }
};
function sipCallId(session, request) {
    var _a, _b;
    return (_a = request === null || request === void 0 ? void 0 : request.call_id) !== null && _a !== void 0 ? _a : (_b = session === null || session === void 0 ? void 0 : session._request) === null || _b === void 0 ? void 0 : _b.call_id;
}
const getSoftPhoneCredentials = async () => {
    try {
        const response = await (0, api_1.customFetch)('v1/users/me/webphone', {
            method: 'GET',
        });
        if (!response.ok) {
            const resData = await response.json();
            throw new Error(resData.error);
        }
        const resData = await response.json();
        const sipData = {
            id: resData.data.id,
            password: resData.data.password,
            realm: resData.data.realm,
            userName: resData.data.username,
            displayName: resData.data.displayName,
            displayNumber: resData.data.displayNumber,
            webSocket: resData.data.websocket,
            owner_id: resData.data.owner_id
        };
        return {
            ...sipData
        };
    }
    catch (error) {
        console.log('====================================');
        console.log('getSoftPhoneCredentials error', error);
        console.log('====================================');
        return undefined;
    }
};
class SipClient {
    constructor(callService) {
        this.sessionMap = new Map();
        this.iceTimeOutId = null;
        this.regFlag = false;
        this.isRegistered = false;
        this.callService = callService;
        this.registerClient();
    }
    async registerClient() {
        if (this.sipUA && this.sipUA.isConnected()) {
            return;
        }
        const credentials = await getSoftPhoneCredentials();
        if (!credentials) {
            console.log('====================================');
            console.log('credentials not found');
            console.log('====================================');
            this.callService.analyticsService.trackEvent('registerClientFailed');
            this.callService.onSipClientFailed();
            return;
        }

        console.log('====================================');
        console.log('credentials', credentials);
        console.log('====================================');

        const { ua, ownerID } = new softPhone_1.default(credentials.userName, credentials.password, credentials.realm, credentials.owner_id, credentials.webSocket);
        this.configurationParams = credentials;
        this.sipUA = ua;
        this.init();
        this.registerEventsListeners();
        this.callService.setCallServiceDeviceId(credentials.id);
        this.customRegister(ownerID);
    }
    async customRegister(ownerID) {
        const registerCallback = () => {
            if (this.regFlag) {
                return;
            }
            this.regFlag = true;
            this.sipUA.registrator().register();
            this.sipUA.removeListener("registered", registerCallback);
        };
        const isDev = await async_storage_1.default.getItem('isDev');
        // if (!this.sipUA || !this.pushToken || !this.platform) {
        //     return;
        // }

        console.log('====================================');
        console.log('ownerID', ownerID);
        console.log('====================================');

        this.sipUA.registrator().setExtraContactParams({
            'app-id': "svoolaz-v2",
            'pn-tok': ownerID,
            'pn-type': "n4com"
        });
        if (this.sipUA.isConnected()) {
            this.sipUA.registrator().register();
        }
        this.sipUA.on("registered", registerCallback);
    }
    async registerPushToken(pushToken, platform) {
        if (!pushToken) {
            return;
        }
        this.platform = platform;
        // this.pushToken=pushToken;
        // this.customRegister();
    }
    init() {
        var _a;
        if (!this.sipUA) {
            console.log('====================================');
            console.log('sipUA not found');
            console.log('====================================');
            return;
        }
        const statusMap = { 0: 'STATUS_INIT', 1: 'STATUS_READY', 2: 'STATUS_USER_CLOSED', 3: 'STATUS_NOT_READY' };
        const closeTimerPending = this.sipUA._closeTimer !== null && this.sipUA._closeTimer !== undefined;
        console.log('====================================');
        console.log('[SipService.init] isConnected:', this.sipUA.isConnected(), '| UA status:', (_a = statusMap[this.sipUA.status]) !== null && _a !== void 0 ? _a : this.sipUA.status, '| closeTimer:', closeTimerPending ? 'PENDING (deferred disconnect!)' : 'null');
        console.log('====================================');
        if (this.sipUA.isConnected() && this.sipUA.status !== 2 /* STATUS_USER_CLOSED */) {
            console.log('[SipService.init] ✓ truly connected and ready → skipping start()');
            return;
        }
        if (this.sipUA.isConnected() && this.sipUA.status === 2) {
            console.log('[SipService.init] ⚠️  isConnected=true BUT status=USER_CLOSED — closeTimer pending → calling start() to force proper restart');
        }
        this.sipUA.start();
    }
    registerEventsListeners() {
        this.sipUA.on('connected', (e) => console.log('connected'));
        this.sipUA.on('disconnected', (e) => console.log('disconnected'));
        this.sipUA.on('registered', (e) => { this.handleRegistration(e); });
        this.sipUA.on('unregistered', (e) => { this.handleUnRegistration(e); });
        this.sipUA.on('registrationFailed', (e) => { this.handleRegistration(e); });
        this.sipUA.on('newRTCSession', (e) => { this.handleNewRTCSession(e); });
    }
    destroy() {
        this.sipUA && this.sipUA.stop();
    }
    removeCredentials() {
        this.configurationParams = undefined;
        this.sipUA = undefined;
    }
    handleRegistration(e) {
        this.callService.onSipClientReady();
        this.isRegistered = true;
        this.callService.analyticsService.trackEvent('sipClientRegistered');
    }
    handleUnRegistration(e) {
        // some logic here
        this.isRegistered = false;
        this.callService.canCall = false;
        this.callService.analyticsService.trackEvent('sipClientUnregistered');
    }
    handleNewRTCSession(sessionEvent) {
        const { session } = sessionEvent;
        this.registerRTCSessionListeners(session);
        const callId = sipCallId(session, sessionEvent.request);
        if (!callId) {
            console.warn('handleNewRTCSession: missing SIP Call-ID');
            return;
        }
        this.sessionMap.set(callId, session);
        if (sessionEvent.originator === 'remote') {
            this.callService.onIncomingSipCall(sessionEvent);
            this.callService.analyticsService.trackEvent('sipIncomingCall', { callUUID: callId });
            return;
        }
        if (sessionEvent.originator === 'local') {
            this.callService.onSipLocalSessionCreated();
            this.callService.analyticsService.trackEvent('sipLocalSessionCreated');
            return;
        }
    }
    registerRTCSessionListeners(session) {
        session.on('failed', (e) => { this.handleFailedRTCSession(e); });
        session.on('ended', (e) => { this.handleEndedRTCSession(e); });
        session.on('confirmed', (e) => { this.handleConfirmedRTCSession(e); });
        session.on('icecandidate', (e) => { this.handleIceCandidateRTCSession(e); });
        session.on('peerconnection', (e) => { this.handlePeerConnectionRTCSession(e); });
        session.on('progress', (e) => { this.handleProgressRTCSession(e); });
        session.on('accepted', (e) => { this.handleAcceptedRTCSession(e); });
        session.on('sending', (e) => { this.handleSendingRTCSession(e); });
        session.on('sdp', (e) => { this.handleSdpRTCSession(e); });
    }
    handleFailedRTCSession(e) {
        var _a;
        this.callService.onSipCallFailed(e);
        this.callService.analyticsService.trackEvent('sipCallFailed', { callUUID: (_a = e === null || e === void 0 ? void 0 : e.message) === null || _a === void 0 ? void 0 : _a.call_id });
    }
    handleEndedRTCSession(e) {
        var _a;
        this.callService.onSipCallEnded(e);
        this.callService.analyticsService.trackEvent('sipCallEnded', { callUUID: (_a = e === null || e === void 0 ? void 0 : e.message) === null || _a === void 0 ? void 0 : _a.call_id });
    }
    handleConfirmedRTCSession(e) {
        this.callService.onSipCallConfirmed(e);
    }
    handleIceCandidateRTCSession(e) {
        if (this.iceTimeOutId) {
            react_native_background_timer_1.default.clearTimeout(this.iceTimeOutId);
        }
        //@ts-ignore
        this.iceTimeOutId = react_native_background_timer_1.default.setTimeout(e.ready, 500);
    }
    handlePeerConnectionRTCSession(e) {
        // this.callService.onSipCallPeerConnection(e);
    }
    handleProgressRTCSession(e) {
        this.callService.onSipCallProgress(e);
    }
    handleAcceptedRTCSession(e) {
        if (this.iceTimeOutId) {
            react_native_background_timer_1.default.clearTimeout(this.iceTimeOutId);
            this.iceTimeOutId = null;
        }
        this.callService.onSipCallAccepted(e);
    }
    handleSendingRTCSession(e) {
    }
    handleSdpRTCSession(e) {
    }
    answerCall(sessionId) {
        console.log('====================================');
        console.log('answerCall in SipService', sessionId);
        console.log('====================================');
        const session = this.sessionMap.get(sessionId);
        console.log('====================================');
        console.log('session', session);
        console.log('====================================');
        if (session) {
            session.answer(callOptions);
        }
    }
    removeSession(sessionId) {
        this.sessionMap.delete(sessionId);
    }
    endCall(sessionId, reason_phrase, status_code) {
        this.callService.analyticsService.trackEvent('endCall', { callUUID: sessionId, reason_phrase, status_code });
        const session = this.sessionMap.get(sessionId);
        if (session) {
            try {
                if (!status_code || !reason_phrase) {
                    session.terminate();
                    return;
                }
                session.terminate({ status_code: status_code || 486, reason_phrase: reason_phrase || 'Busy' });
            }
            catch (e) {
                console.log('====================================');
                console.log('error in endCall', e);
                console.log('====================================');
                this.callService.analyticsService.trackEvent('sipEndCallError', { callUUID: sessionId });
                // this.callService.reportCallError(e);
            }
        }
    }
    startCall(handle, extraCallData) {
        const options = { ...callOptions };
        if (extraCallData) {
            options.extraHeaders = [`X-2X-CallData: ${extraCallData}`];
        }
        const session = this.sipUA.call(handle, options);
        const callId = sipCallId(session);
        if (callId) {
            this.sessionMap.set(callId, session);
            this.callService.analyticsService.trackEvent('sipStartCall', { callUUID: callId, handle });
        }
        return session;
    }
    holdCall(sessionId, isHeld) {
        const session = this.sessionMap.get(sessionId);
        if (session) {
            isHeld ? session.hold() : session.unhold();
        }
    }
    muteCall(sessionId, isMuted) {
        const session = this.sessionMap.get(sessionId);
        if (session) {
            isMuted ? session.mute() : session.unmute();
        }
    }
    attendedTransferCall(originCall, targetCall) {
        try {
            const originSession = this.sessionMap.get(originCall.sessionId);
            const targetSession = this.sessionMap.get(targetCall.sessionId);
            if (originSession && targetSession) {
                originSession.refer(targetCall.handle, {
                    'replaces': targetSession,
                    'mediaConstraints': { 'audio': true, 'video': false },
                });
            }
        }
        catch (error) {
            console.log('====================================');
            console.log('error in attendedTransferCall', error);
            console.log('====================================');
            // this.callService.reportCallError(error);
        }
    }
    blindTransferCall(sessionId, handle) {
        try {
            const session = this.sessionMap.get(sessionId);
            if (session && this.configurationParams) {
                session.refer(handle, {
                    'extraHeaders': [`Referred-by: <sip:${this.configurationParams.userName}@${this.configurationParams.realm}>`]
                });
            }
        }
        catch (error) {
            console.log('====================================');
            console.log('error in blindTransferCall', error);
            console.log('====================================');
            // this.callService.reportCallError(error);
        }
    }
    sendDTMF(sessionId, dtmf) {
        const session = this.sessionMap.get(sessionId);
        if (session) {
            session.sendDTMF(dtmf);
        }
    }
}
exports.default = SipClient;
