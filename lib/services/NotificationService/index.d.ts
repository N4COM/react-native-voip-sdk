import { CallServiceType } from "../callService";
declare class NotificationService {
    private callService;
    private lastToken;
    private deliveredToken;
    constructor(callService: CallServiceType);
    init(): void;
    registerPushToken(pushToken: string): Promise<void>;
    deliverPushToken(): Promise<void>;
    registerVoipListeners(): void;
    destroy(): void;
    registerAndroid(): Promise<void>;
}
export default NotificationService;
