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
export type VoipSdkConfig = {
    getSipCredentials: () => Promise<SipCredentials>;
    onPushToken?: (info: PushTokenInfo) => Promise<void>;
    sipContactParams?: () => Record<string, string>;
};
