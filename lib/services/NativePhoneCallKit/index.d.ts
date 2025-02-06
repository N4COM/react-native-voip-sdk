import { CallServiceType } from "../callService";
declare class NativePhone {
    private callService;
    private static instance;
    private callStartingMap;
    constructor(callService: CallServiceType);
    init(): Promise<void>;
    registerEventsListeners(): void;
    removeEventsListeners(): void;
    getInitialEvents(): Promise<void>;
    onNativeCallStart(obj: any): void;
    onNativeCallAnswer(callUUID: string): void;
    onNativeCallEnd(callUUID: string): void;
    onNativeCallLoad(events: {
        name: string;
        data: any;
    }[]): void;
    onNativeCallMute(muted: boolean, callUUID: string): void;
    onNativeCallHold(hold: boolean, callUUID: string): void;
    onNativeAndroidCallShow(handle: string, callUUID: string, name: string): void;
    onNativeCallDTMF(obj: {
        digits: string;
        callUUID: string;
    }): void;
    onNativeCallAudioRoute(obj: {
        output: string;
        callUUID?: string;
        handle?: string;
        reason?: number;
    }): void;
    onNativeCallDisplay(event: any): void;
    setEstablishedCall(callUUID: string): void;
    showIncomingCall(callUUID: string, handle: string, name: string): void;
    reportCallEnded(callUUID: string, cause: string, originator: string): void;
    androidEndCallHandler(payload: any): void;
    androidAnswerCallHandler(payload: any): void;
    startInCallManager(): void;
    stopInCallManager(): void;
    setAudioRoute(route: string, uuid: string): Promise<void>;
    getAudioRoutes(): Promise<void>;
    startCall(callUUID: string, handle: string, name: string): void;
    endCall(callUUID: string): void;
    holdCall(callUUID: string, hold: boolean): void;
    muteCall(callUUID: string, muted: boolean): void;
    clear(): void;
    updateDisplay(callUUID: string, name: string, handle: string): void;
}
export default NativePhone;
