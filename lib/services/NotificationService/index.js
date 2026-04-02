"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerToken = void 0;
const react_native_voip_push_notification_1 = __importDefault(require("react-native-voip-push-notification"));
const messaging_1 = __importDefault(require("@react-native-firebase/messaging"));
const react_native_1 = require("react-native");
const react_native_onesignal_1 = __importDefault(require("react-native-onesignal"));
const registerToken = async (token, deviceType) => {
    const deviceState = await react_native_onesignal_1.default.getDeviceState();
    const data = {
        app_id: "541ab59a-c9a9-4906-ace3-ddee1b3a5d58",
        identifier: token,
        device_type: deviceType === "a" ? 1 : 0,
        external_user_id: deviceState === null || deviceState === void 0 ? void 0 : deviceState.userId,
        test_type: 1,
    };
    console.log('====================================');
    console.log('data', data);
    console.log('====================================');
    try {
        const res = await fetch('https://onesignal.com/api/v1/players', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const resData = await res.json();
            console.log(resData);
        }
    }
    catch (error) {
        console.log(error);
    }
};
exports.registerToken = registerToken;
class NotificationService {
    constructor(callService) {
        this.init();
        this.callService = callService;
    }
    init() {
        this.registerVoipListeners();
        this.registerOneSignalSdk();
        if (react_native_1.Platform.OS === 'android') {
            this.registerAndroid();
        }
    }
    registerOneSignalSdk() {
        react_native_onesignal_1.default.setLogLevel(6, 0);
        react_native_onesignal_1.default.setAppId("9d89f880-1565-42af-be2b-b33f43b114cc");
        //Prompt for push on iOS
        react_native_onesignal_1.default.promptForPushNotificationsWithUserResponse(response => {
            // console.log("Prompt response:", response);
        });
        //Method for handling notifications received while app in foreground
        react_native_onesignal_1.default.setNotificationWillShowInForegroundHandler(notificationReceivedEvent => {
            // console.log("OneSignal: notification will show in foreground:", notificationReceivedEvent);
            let notification = notificationReceivedEvent.getNotification();
            // console.log("notification: ", notification);
            const data = notification.additionalData;
            // console.log("additionalData: ", data);
            // Complete with null means don't show a notification.
            // notificationReceivedEvent.complete(notification);
            notificationReceivedEvent.complete();
        });
        //Method for handling notifications opened
        react_native_onesignal_1.default.setNotificationOpenedHandler(notification => {
            // console.log("OneSignal: notification opened:", notification);
        });
    }
    registerPushToken(pushToken, platform) {
        // this.callService.registerPushToken(pushToken,platform);
        // this.callService.analyticsService.trackEvent('registerPushToken',{pushToken, platform});
        (0, exports.registerToken)(pushToken, platform);
    }
    registerVoipListeners() {
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
