export type IncomingCallPayload = {
    uuid: string;
    callerName: string;
    callerHandle: string;
};
declare class AndroidCallBridge {
    onShowNativeCall: (callUUID: string, handle: string, name: string) => void;
    endCallCallBack: (payload: any) => void;
    answerCallCallBack: (payload: any) => void;
    incomingCallScreenActive: boolean;
    incomingCallScreenPayload: any;
    constructor(onShowNativeCall: (callUUID: string, handle: string, name: string) => void, endCallCallBack: (payload: any) => void, answerCallCallBack: (payload: any) => void);
    init(): Promise<void>;
    registerAndroidCallListeners(): void;
    destroy(): void;
    handlePayload(payload: any): void;
    showIncomingCallScreen(payload: IncomingCallPayload): Promise<void>;
    getAppLanguage(): Promise<string | null>;
    dismissCall(callUUID: string): void;
    backToForeground(): void;
    launchApp(callUUID: string, callerName: string): void;
    updateDisplay(callUUID: string, name: string, handle: string): Promise<void>;
}
export default AndroidCallBridge;
