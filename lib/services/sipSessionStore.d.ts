import { SipCredentials } from '../types/config';
export type SipSession = {
    credentials: SipCredentials;
    contactParams: Record<string, string>;
};
export declare function isUsableSipCredentials(credentials: any): credentials is SipCredentials;
export declare function loadSipSession(): Promise<SipSession | undefined>;
export declare function saveSipSession(session: SipSession): Promise<void>;
export declare function clearSipSession(): Promise<void>;
