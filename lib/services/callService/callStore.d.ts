import { AudioRoute, Call, CallStatus } from ".";
declare class CallStore {
    callSessionMap: Map<string, Call>;
    callUUIDMap: Map<string, Call>;
    constructor();
    addCall(call: Call): void;
    getCallBySessionId(sessionId: string): Call | undefined;
    getCallByCallUUID(callUUID: string): Call | undefined;
    removeCallBySessionId(sessionId: string): void;
    removeCallByCallUUID(callUUID: string): void;
    clear(): void;
    updateCallStatusBySessionId(sessionId: string, status: CallStatus): void;
    updateCallStatusByCallId(callUUID: string, status: CallStatus): void;
    updateCallHoldStatus(sessionId: string, hold: boolean): void;
    updateCallMuteStatus(sessionId: string, mute: boolean): void;
    updateCallAudioRoute(sessionId: string, audioRoute: AudioRoute): void;
    startCallTimer(sessionId: string): void;
    getAllCalls(): Call[];
    updateCallInfo(callUUID: string, callInfo: string): void;
}
export default CallStore;
