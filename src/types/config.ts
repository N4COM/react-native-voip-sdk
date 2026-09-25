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
    // Value of the SIP User-Agent header. JsSIP's default is used when omitted.
    userAgent?: string;
    // Seconds before an unanswered incoming call is rejected. JsSIP's default (60) is used when omitted.
    noAnswerTimeout?: number;
};

export type VoipSdkConfig = {
    getSipCredentials: () => Promise<SipCredentials>;
    onPushToken?: (info: PushTokenInfo) => Promise<void>;
    sipContactParams?: () => Record<string, string>;
    sipOptions?: SipOptions;
    onSdkEvent?: (event: SdkEvent) => void;
};
