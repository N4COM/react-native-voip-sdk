"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerToken = void 0;
const react_native_voip_push_notification_1 = __importDefault(require("react-native-voip-push-notification"));
const messaging_1 = __importDefault(require("@react-native-firebase/messaging"));
const react_native_1 = require("react-native");
const react_native_onesignal_1 = require("react-native-onesignal");
const api_1 = require("../../API/api");
// The VoIP `register` event and the cached `didLoadWithEvents` replay both
// resolve to the same push token on launch, which caused this endpoint to be
// hit twice. Track the last token we (started to) register so an identical
// token is only POSTed once. Cleared on failure so a retry/new token still goes through.
let lastRegisteredPushToken;
const registerToken = async (token, deviceType) => {
    // const subscriptionId= await OneSignal.User.pushSubscription.getIdAsync();
    // const data= {
    //   app_id:"70bdb783-341c-402a-b31b-83b4122ea581",
    //   identifier:token,
    //   device_type:deviceType==="a"?1:0,
    //   external_user_id:subscriptionId,
    //   test_type:1,
    // };
    if (!token || lastRegisteredPushToken === token) {
        return;
    }
    lastRegisteredPushToken = token;
    const data = {
        push_token: token,
        device_type: deviceType === "a" ? "AndroidPush" : "iOSPush",
        test_type: 1,
    };
    console.log('====================================');
    console.log('data', data);
    console.log('====================================');
    try {
        const res = await (0, api_1.customFetch)('v2/users/me/push/register', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            lastRegisteredPushToken = undefined;
            const resData = await res.json();
            console.log(resData);
        }
    }
    catch (error) {
        lastRegisteredPushToken = undefined;
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
        react_native_onesignal_1.OneSignal.Debug.setLogLevel(react_native_onesignal_1.LogLevel.Verbose);
        react_native_onesignal_1.OneSignal.initialize("2c78d842-2725-4d3c-808b-b56f30e99f67");
        //Prompt for push on iOS
        react_native_onesignal_1.OneSignal.Notifications.requestPermission(true);
        //Method for handling notifications received while app in foreground
        react_native_onesignal_1.OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
            // console.log("OneSignal: notification will show in foreground:", event);
            let notification = event.getNotification();
            // console.log("notification: ", notification);
            const data = notification.additionalData;
            // console.log("additionalData: ", data);
            // preventDefault() means don't show the notification.
            event.preventDefault();
        });
        //Method for handling notifications opened
        react_native_onesignal_1.OneSignal.Notifications.addEventListener('click', (event) => {
            // console.log("OneSignal: notification clicked:", event);
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
