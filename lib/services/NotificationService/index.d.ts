import { CallServiceType } from "../callService";
export declare const registerToken: (token: any, deviceType: any) => Promise<void>;
declare class NotificationService {
    private callService;
    constructor(callService: CallServiceType);
    init(): void;
    registerOneSignalSdk(): void;
    registerPushToken(pushToken: string, platform: "a" | "i"): void;
    registerVoipListeners(): void;
    destroy(): void;
    registerAndroid(): Promise<void>;
}
export default NotificationService;
