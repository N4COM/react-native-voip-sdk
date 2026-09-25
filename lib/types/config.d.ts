export type SipCredentials = {
    id: string;
    userName: string;
    password: string;
    realm: string;
    webSocket: string;
    displayName?: string;
    displayNumber?: string;
    ownerId?: string;
};
export type PushTokenInfo = {
    token: string;
};
export type SdkEvent = {
    name: string;
    properties?: Record<string, any>;
};
export type SipOptions = {
    userAgent?: string;
    noAnswerTimeout?: number;
};
export type VoipSdkConfig = {
    getSipCredentials: () => Promise<SipCredentials>;
    onPushToken?: (info: PushTokenInfo) => Promise<void>;
    sipContactParams?: () => Record<string, string>;
    sipOptions?: SipOptions;
    onSdkEvent?: (event: SdkEvent) => void;
};
