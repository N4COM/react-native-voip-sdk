"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_voip_push_notification_1 = __importDefault(require("react-native-voip-push-notification"));
const messaging_1 = __importDefault(require("@react-native-firebase/messaging"));
class NotificationService {
    constructor(callService) {
        // The push token (iOS VoIP / FCM) can be delivered by the OS before the host
        // app calls startCallService and provides `onPushToken`. We cache the latest
        // token and flush it once the config is available, so it's never lost.
        this.lastToken = null;
        this.deliveredToken = null;
        this.callService = callService;
        this.init();
    }
    init() {
        this.registerVoipListeners();
    }
    async registerPushToken(pushToken) {
        if (!pushToken) {
            return;
        }
        this.lastToken = pushToken;
        await this.deliverPushToken();
    }
    // Delivers the most recent token to the client's onPushToken if it's
    // available and hasn't already been delivered. Safe to call repeatedly:
    // it's deduped by token, and retried on failure or when config arrives.
    async deliverPushToken() {
        var _a;
        if (!this.lastToken || this.lastToken === this.deliveredToken) {
            return;
        }
        const onPushToken = (_a = this.callService.getSdkConfig()) === null || _a === void 0 ? void 0 : _a.onPushToken;
        if (!onPushToken) {
            return;
        }
        const token = this.lastToken;
        try {
            await onPushToken({
                token,
            });
            this.deliveredToken = token;
        }
        catch (error) {
            console.log('onPushToken error', error);
        }
    }
    registerVoipListeners() {
        react_native_voip_push_notification_1.default.addEventListener('register', (token) => {
            this.registerPushToken(token);
        });
        react_native_voip_push_notification_1.default.addEventListener('didLoadWithEvents', (events) => {
            if (!events || !Array.isArray(events) || events.length < 1) {
                return;
            }
            for (let voipPushEvent of events) {
                let { name, data } = voipPushEvent;
                if (name === react_native_voip_push_notification_1.default.RNVoipPushRemoteNotificationsRegisteredEvent) {
                    // @ts-expect-error TS(2554): Expected 0 arguments, but got 1.
                    react_native_voip_push_notification_1.default.registerVoipToken(data);
                }
                else if (name === react_native_voip_push_notification_1.default.RNVoipPushRemoteNotificationReceivedEvent) {
                }
            }
        });
        react_native_voip_push_notification_1.default.addEventListener('notification', (notification) => {
        });
    }
    destroy() {
        react_native_voip_push_notification_1.default.removeEventListener('register');
        react_native_voip_push_notification_1.default.removeEventListener('didLoadWithEvents');
        react_native_voip_push_notification_1.default.removeEventListener('notification');
    }
    async registerAndroid() {
        try {
            const fcmToken = await (0, messaging_1.default)().getToken();
            this.registerPushToken(fcmToken);
        }
        catch (error) {
            console.log(error);
        }
    }
}
exports.default = NotificationService;
