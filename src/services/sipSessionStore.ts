import AsyncStorage from '@react-native-async-storage/async-storage';
import { SipCredentials } from '../types/config';

export type SipSession = {
    credentials: SipCredentials;
    contactParams: Record<string, string>;
};

const SIP_SESSION_STORAGE_KEY = '@voip-sdk/sipSession';

export function isUsableSipCredentials(credentials: any): credentials is SipCredentials {
    return !!(credentials
        && credentials.id
        && credentials.userName
        && credentials.password
        && credentials.realm
        && credentials.webSocket);
}

export async function loadSipSession(): Promise<SipSession | undefined> {
    try {
        const raw = await AsyncStorage.getItem(SIP_SESSION_STORAGE_KEY);
        if (!raw) {
            return undefined;
        }
        const session = JSON.parse(raw);
        if (!isUsableSipCredentials(session?.credentials)) {
            return undefined;
        }
        return {
            credentials: session.credentials,
            contactParams: session.contactParams ?? {},
        };
    } catch (error) {
        console.log('loadSipSession error', error);
        return undefined;
    }
}

export async function saveSipSession(session: SipSession): Promise<void> {
    try {
        await AsyncStorage.setItem(SIP_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch (error) {
        console.log('saveSipSession error', error);
    }
}

export async function clearSipSession(): Promise<void> {
    try {
        await AsyncStorage.removeItem(SIP_SESSION_STORAGE_KEY);
    } catch (error) {
        console.log('clearSipSession error', error);
    }
}
