"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class CallStore {
    constructor() {
        this.callSessionMap = new Map();
        this.callUUIDMap = new Map();
    }
    addCall(call) {
        this.callSessionMap.set(call.sessionId, call);
        this.callUUIDMap.set(call.callUUID, call);
    }
    getCallBySessionId(sessionId) {
        return this.callSessionMap.get(sessionId);
    }
    getCallByCallUUID(callUUID) {
        return this.callUUIDMap.get(callUUID);
    }
    removeCallBySessionId(sessionId) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            this.callSessionMap.delete(sessionId);
            this.callUUIDMap.delete(call.callUUID);
        }
    }
    removeCallByCallUUID(callUUID) {
        const call = this.callUUIDMap.get(callUUID);
        if (call) {
            this.callUUIDMap.delete(callUUID);
            this.callSessionMap.delete(call.sessionId);
        }
    }
    clear() {
        this.callSessionMap.clear();
        this.callUUIDMap.clear();
    }
    updateCallStatusBySessionId(sessionId, status) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            call.callStatus = status;
        }
    }
    updateCallStatusByCallId(callUUID, status) {
        const call = this.callUUIDMap.get(callUUID);
        if (call) {
            call.callStatus = status;
        }
    }
    updateCallHoldStatus(sessionId, hold) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            call.isHeld = hold;
        }
    }
    updateCallMuteStatus(sessionId, mute) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            call.isMuted = mute;
        }
    }
    updateCallAudioRoute(sessionId, audioRoute) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            call.audioRoute = audioRoute;
        }
    }
    startCallTimer(sessionId) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            call.timeStarted = Date.now();
        }
    }
    getAllCalls() {
        return Array.from(this.callSessionMap.values());
    }
    updateCallInfo(callUUID, callInfo) {
        const call = this.callUUIDMap.get(callUUID);
        if (call) {
            call.name = callInfo;
        }
    }
}
exports.default = CallStore;
