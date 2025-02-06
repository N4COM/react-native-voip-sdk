import { AudioRoute, Call, CallStatus } from ".";



class CallStore {

    callSessionMap: Map<string, Call>;
    callUUIDMap: Map<string,Call>;

    constructor() {
        this.callSessionMap = new Map();
        this.callUUIDMap = new Map();
    }


    addCall(call: Call) {    
        this.callSessionMap.set(call.sessionId, call);
        this.callUUIDMap.set(call.callUUID, call);
  
    }
    
    getCallBySessionId(sessionId: string) {
        return this.callSessionMap.get(sessionId);
    }

    getCallByCallUUID(callUUID: string) {
        return this.callUUIDMap.get(callUUID);
    }

    removeCallBySessionId(sessionId: string) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            this.callSessionMap.delete(sessionId);
            this.callUUIDMap.delete(call.callUUID);            
        }
    }

    removeCallByCallUUID(callUUID: string) {
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


    updateCallStatusBySessionId(sessionId: string, status: CallStatus) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            call.callStatus = status;
        }
    }

    updateCallStatusByCallId(callUUID: string, status: CallStatus) {
        const call = this.callUUIDMap.get(callUUID);
        if (call) {
            call.callStatus = status;
        }
    }

    updateCallHoldStatus(sessionId: string, hold: boolean) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            call.isHeld = hold;
        }
    }   


    updateCallMuteStatus(sessionId: string, mute: boolean) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            call.isMuted = mute;
        }
    }


    updateCallAudioRoute(sessionId: string, audioRoute: AudioRoute) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            call.audioRoute = audioRoute;
        }
    }


    startCallTimer(sessionId: string) {
        const call = this.callSessionMap.get(sessionId);
        if (call) {
            call.timeStarted= Date.now();
        }
    }

    getAllCalls() {
        return Array.from(this.callSessionMap.values());
    }
    
    updateCallInfo(callUUID: string, callInfo: string) {

        const call = this.callUUIDMap.get(callUUID);
        if (call) {
            call.name = callInfo;
        }
    }
}


export default CallStore;