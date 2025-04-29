import { CallServiceType } from "../callService";
declare class NotificationService {
    private callService;
    constructor(callService: CallServiceType);
    init(): void;
    registerPushToken(pushToken: string, platform: "a" | "i"): void;
    registerVoipListeners(): void;
    destroy(): void;
    registerAndroid(): Promise<void>;
}
export default NotificationService;
