import React from "react";
import { Call, CallError, PendingCall, SipStatus } from "../../services/callService";
import { PromptsType } from "../../prompts";
import { VoipSdkConfig } from "../../types/config";
export type TransferType = 'blind' | 'attended';
interface CallServiceContext {
    startCall: (handle: string, name?: string, calldata?: string) => void;
    addCall: (handle: string, name?: string, calldata?: string) => void;
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
    sipStatus: SipStatus;
    addCallErrorListener: (listener: (error: CallError) => void) => () => void;
    startCallService: (config: VoipSdkConfig) => Promise<boolean | void>;
    setSdkStrings: (prompts: PromptsType) => void;
}
declare const CallServiceContext: React.Context<CallServiceContext | null>;
declare const CallServiceProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useCallService: () => CallServiceContext | null;
export default CallServiceProvider;
