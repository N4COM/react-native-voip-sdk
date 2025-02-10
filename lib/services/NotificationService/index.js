"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import OneSignal from "react-native-onesignal";
const react_native_voip_push_notification_1 = __importDefault(require("react-native-voip-push-notification"));
const oneSignalApi_1 = require("../../API/oneSignalApi");
const react_native_onesignal_1 = __importDefault(require("react-native-onesignal"));
const react_native_1 = require("react-native");
let firebaseApp;
if (react_native_1.Platform.OS === 'android') {
    firebaseApp = require('@react-native-firebase/app');
}
class NotificationService {
    constructor(callService) {
        this.init();
        this.callService = callService;
    }
    init() {
        this.registerOneSignalSdk();
        this.registerVoipListeners();
        this.registerAndroid();
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
    registerVoipListeners() {
        // get the ios VOIP token and register it on the onesignal Voip app
        react_native_voip_push_notification_1.default.addEventListener('register', (token) => {
            // --- send token to your apn provider server
            // registerToken(token, 0);            
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
        if (react_native_1.Platform.OS !== 'android') {
            return;
        }
        console.log('====================================');
        console.log('registerAndroid');
        console.log('====================================');
        try {
            const fcmToken = await firebaseApp.messaging().getToken();
            console.log({ fcmToken });
            (0, oneSignalApi_1.registerToken)(fcmToken, 1);
        }
        catch (error) {
            console.log(error);
        }
    }
}
exports.default = NotificationService;
