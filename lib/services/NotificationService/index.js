"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_voip_push_notification_1 = __importDefault(require("react-native-voip-push-notification"));
const messaging_1 = __importDefault(require("@react-native-firebase/messaging"));
const react_native_1 = require("react-native");
class NotificationService {
    constructor(callService) {
        this.init();
        this.callService = callService;
    }
    init() {
        this.registerVoipListeners();
        this.registerAndroid();
    }
    registerPushToken(pushToken, platform) {
        this.callService.registerPushToken(pushToken, platform);
    }
    registerVoipListeners() {
        if (react_native_1.Platform.OS === 'android') {
            return;
        }
        // get the ios VOIP token and register it on the onesignal Voip app
        react_native_voip_push_notification_1.default.addEventListener('register', (token) => {
            // --- send token to your apn provider server
            this.registerPushToken(token, "i");
        });
        // VoipPushNotification.addEventListener('notification', (notification) => {
        //   // --- when receive remote voip push, register your VoIP client, show local notification ... etc
        //   // --- optionally, if you `addCompletionHandler` from the native side, once you have done the js jobs to initiate a call, call `completion()`
        //   VoipPushNotification.onVoipNotificationCompleted(notification.uuid);
        // });
        react_native_voip_push_notification_1.default.addEventListener('didLoadWithEvents', (events) => {
            // --- this will fire when there are events occured before js bridge initialized
            // --- use this event to execute your event handler manually by event type
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
            // --- when receive remote voip push, register your VoIP client, show local notification ... etc      
            // --- optionally, if you `addCompletionHandler` from the native side, once you have done the js jobs to initiate a call, call `completion()`
            // VoipPushNotification.onVoipNotificationCompleted(notification.uuid);
        });
    }
    destroy() {
        react_native_voip_push_notification_1.default.removeEventListener('register');
        react_native_voip_push_notification_1.default.removeEventListener('didLoadWithEvents');
        react_native_voip_push_notification_1.default.removeEventListener('notification');
    }
    async registerAndroid() {
        if (react_native_1.Platform.OS === 'ios') {
            return;
        }
        console.log('====================================');
        console.log('registerAndroid');
        console.log('====================================');
        try {
            const fcmToken = await (0, messaging_1.default)().getToken();
            this.registerPushToken(fcmToken, "a");
        }
        catch (error) {
            console.log(error);
        }
    }
}
exports.default = NotificationService;
