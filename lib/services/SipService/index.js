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
const getSoftPhoneCredentialsFromServer = async () => {
    const token = await async_storage_1.default.getItem('token');
    if (!token) {
        return undefined;
    }
    try {
        const response = await (0, api_1.customFetch)('/webphone', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
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
const saveCredentials = async (credentials) => {
    await async_storage_1.default.setItem('softPhoneCredentials', JSON.stringify(credentials));
};
const getCachedCredentials = async () => {
    const credentials = await async_storage_1.default.getItem('softPhoneCredentials');
    return credentials ? JSON.parse(credentials) : undefined;
};
const removeCachedCredentials = async () => {
    await async_storage_1.default.removeItem('softPhoneCredentials');
};
const getSoftPhoneCredentials = async () => {
    const cachedCredentials = await getCachedCredentials();
    if (cachedCredentials) {
        return cachedCredentials;
    }
    const credentials = await getSoftPhoneCredentialsFromServer();
    if (credentials) {
        await saveCredentials(credentials);
    }
    return credentials;
};
class SipClient {
    constructor(callService) {
        this.sessionMap = new Map();
        this.iceTimeOutId = null;
        this.platform = null;
        this.pushToken = null;
        this.regFlag = false;
        this.regFailedFlag = false;
        this.isRegistered = false;
        this.callService = callService;
        this.registerClient();
        this.platform = null;
        this.pushToken = null;
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
        this.tokenRegistration();
    }
    async updateCredentials() {
        const credentials = await getSoftPhoneCredentialsFromServer();
        if (credentials) {
            await saveCredentials(credentials);
        }
    }
    async tokenRegistration() {
        if (!this.pushToken || !this.platform || !this.sipUA) {
            return;
        }
        const isDev = await async_storage_1.default.getItem('isDev');
        this.sipUA.registrator().setExtraContactParams({
            'app-id': isDev ? "alpitour-test" : "alpitour",
            'pn-tok': `${this.platform}:${this.pushToken}`,
            'pn-type': "n4com"
        });
        this.sipUA.registrator().register();
        const callBack = () => {
            if (this.regFlag) {
                return;
            }
            this.regFlag = true;
            this.sipUA.registrator().register();
            this.sipUA.removeListener('registered', callBack);
        };
        this.sipUA.on('registered', callBack);
    }
    async registerPushToken(pushToken, platform) {
        if (!pushToken) {
            return;
        }
        this.pushToken = pushToken;
        this.platform = platform;
        this.tokenRegistration();
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
        this.sipUA.on('registrationFailed', (e) => { this.handleRegistrationFailed(e); });
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
    async handleRegistrationFailed(e) {
        this.callService.onSipClientFailed();
        this.isRegistered = false;
        if (!this.regFailedFlag) {
            this.regFailedFlag = true;
            await this.callService.updateToken();
            await this.sipUA.registrator().register();
        }
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
    startCall(handle) {
        const session = this.sipUA.call(handle, callOptions);
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
