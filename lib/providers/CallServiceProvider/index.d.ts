import React from "react";
import { Call, PendingCall } from "../../services/callService";
import { PromptsType } from "../../prompts";
export type TransferType = 'blind' | 'attended';
export type AnalyticsOptions = {
    isEnabled: true;
    userId: string;
    properties: Record<string, any>;
} | {
    isEnabled: false;
};
interface CallServiceContext {
    startCall: (handle: string, name?: string, calldata?: string) => void;
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
    initiateCallService: (token: string, isDev?: boolean) => void;
    setPermissionsPrompts: (prompts: PromptsType) => void;
    enableAnalytics: (options: AnalyticsOptions) => void;
}
declare const CallServiceContext: React.Context<CallServiceContext | null>;
declare const CallServiceProvider: ({ children }: {
    children: React.ReactNode;
}) => React.JSX.Element;
export declare const useCallService: () => CallServiceContext | null;
export default CallServiceProvider;
