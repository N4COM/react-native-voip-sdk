import React from "react";
import { Call, PendingCall } from "../../services/callService";
export type TransferType = 'blind' | 'attended';
interface CallServiceContext {
    startCall: (handle: string, name?: string) => void;
    endCall: () => void;
    holdCall: () => void;
    swapCall: () => void;
    stopCallService: () => void;
    callState: Call[];
    pendingCall: PendingCall | Call | undefined;
    toggleMuteCall: () => void;
    attendedTransferCall: (originCall: Call, targetCall: Call) => void;
    blindTransferCall: (targetNumber: string) => void;
    sendDTMF: (tones: string) => void;
    setAudioRoute: (audioRoute: string) => Promise<void>;
    getAudioRoutes: () => Promise<void>;
    callServiceSipInitFailed: boolean;
    initiateCallService: () => void;
}
declare const CallServiceContext: React.Context<CallServiceContext | null>;
declare const CallServiceProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useCallService: () => CallServiceContext | null;
export default CallServiceProvider;
