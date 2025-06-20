"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("../../API/api");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
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
const getSoftPhoneCredentials = async () => {
    try {
        const response = await (0, api_1.customFetch)('/webphone', {
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
            webSocket: resData.data.wssUrl
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
        const credentials = await getSoftPhoneCredentials();
        if (!credentials) {
            console.log('====================================');
            console.log('credentials not found');
            console.log('====================================');
            this.callService.onSipClientFailed();
            return;
        }
        const { ua, ownerID } = new softPhone_1.default(credentials.userName, credentials.password, credentials.realm, credentials.ownerID, credentials.webSocket);
        this.configurationParams = credentials;
        this.sipUA = ua;
        this.init();
        this.registerEventsListeners();
        this.callService.setCallServiceDeviceId(credentials.id);
        this.customRegister();
    }
    async customRegister() {
        const registerCallback = () => {
            if (this.regFlag) {
                return;
            }
            this.regFlag = true;
            this.sipUA.registrator().register();
            this.sipUA.removeListener("registered", registerCallback);
        };
        const isDev = await async_storage_1.default.getItem('isDev');
        if (!this.sipUA || !this.pushToken || !this.platform) {
            return;
        }
        this.sipUA.registrator().setExtraContactParams({
            'app-id': isDev ? "alpitour-test" : "alpitour",
            'pn-tok': `${this.platform}:${this.pushToken}`,
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
        this.pushToken = pushToken;
        this.customRegister();
    }
    init() {
        if (!this.sipUA) {
            console.log('====================================');
            console.log('sipUA not found');
            console.log('====================================');
            return;
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
    }
    handleUnRegistration(e) {
        // some logic here
        this.isRegistered = false;
        this.callService.canCall = false;
    }
    handleNewRTCSession(sessionEvent) {
        const { session } = sessionEvent;
        this.registerRTCSessionListeners(session);
        this.sessionMap.set(sessionEvent.request.call_id, session);
        if (sessionEvent.originator === 'remote') {
            this.callService.onIncomingSipCall(sessionEvent);
            return;
        }
        if (sessionEvent.originator === 'local') {
            this.callService.onSipLocalSessionCreated();
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
        this.callService.onSipCallFailed(e);
    }
    handleEndedRTCSession(e) {
        this.callService.onSipCallEnded(e);
    }
    handleConfirmedRTCSession(e) {
        this.callService.onSipCallConfirmed(e);
    }
    handleIceCandidateRTCSession(e) {
        if (this.iceTimeOutId) {
            clearTimeout(this.iceTimeOutId);
        }
        //@ts-ignore
        this.iceTimeOutId = setTimeout(e.ready, 500);
    }
    handlePeerConnectionRTCSession(e) {
        // this.callService.onSipCallPeerConnection(e);
    }
    handleProgressRTCSession(e) {
        this.callService.onSipCallProgress(e);
    }
    handleAcceptedRTCSession(e) {
        if (this.iceTimeOutId) {
            clearTimeout(this.iceTimeOutId);
            this.iceTimeOutId = null;
        }
        this.callService.onSipCallAccepted(e);
    }
    handleSendingRTCSession(e) {
    }
    handleSdpRTCSession(e) {
    }
    answerCall(sessionId) {
        const session = this.sessionMap.get(sessionId);
        if (session) {
            session.answer(callOptions);
        }
    }
    removeSession(sessionId) {
        this.sessionMap.delete(sessionId);
    }
    endCall(sessionId) {
        const session = this.sessionMap.get(sessionId);
        if (session) {
            try {
                session.terminate({ status_code: 603, reason_phrase: 'Decline' });
            }
            catch (e) {
                console.log('====================================');
                console.log('error in endCall', e);
                console.log('====================================');
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
        this.sessionMap.set(session._request.call_id, session);
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
