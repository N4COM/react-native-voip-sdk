import { CallServiceType } from "../callService";
declare class NotificationService {
    private callService;
    constructor(callService: CallServiceType);
    init(): void;
    registerOneSignalSdk(): void;
    registerVoipListeners(): void;
    destroy(): void;
    registerAndroid(): Promise<void>;
}
export default NotificationService;
