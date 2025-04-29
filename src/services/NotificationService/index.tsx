import VoipPushNotification from 'react-native-voip-push-notification';
import messaging from '@react-native-firebase/messaging';
import { CallServiceType } from "../callService";


class NotificationService {

   private callService!:CallServiceType;

    constructor(callService:CallServiceType) {
        this.init();
        this.callService=callService;
    }

    init() {
        this.registerVoipListeners();
        this.registerAndroid();
    }

    registerPushToken(pushToken:string, platform:"a"|"i"){
        this.callService.registerPushToken(pushToken,platform);
    }


    registerVoipListeners() {
            // get the ios VOIP token and register it on the onesignal Voip app
            VoipPushNotification.addEventListener('register', (token) => {
            // --- send token to your apn provider server
             this.registerPushToken(token,"i");            
            });
            // VoipPushNotification.addEventListener('notification', (notification) => {
            //   // --- when receive remote voip push, register your VoIP client, show local notification ... etc

            //   // --- optionally, if you `addCompletionHandler` from the native side, once you have done the js jobs to initiate a call, call `completion()`
            //   VoipPushNotification.onVoipNotificationCompleted(notification.uuid);
            // });
            VoipPushNotification.addEventListener('didLoadWithEvents', (events) => {
            // --- this will fire when there are events occured before js bridge initialized
            // --- use this event to execute your event handler manually by event type

            if (!events || !Array.isArray(events) || events.length < 1) {
                return;
            }
            for (let voipPushEvent of events) {
                let { name, data } = voipPushEvent;
                if (name === VoipPushNotification.RNVoipPushRemoteNotificationsRegisteredEvent) {
                // @ts-expect-error TS(2554): Expected 0 arguments, but got 1.
                VoipPushNotification.registerVoipToken(data)

                } else if (name === VoipPushNotification.RNVoipPushRemoteNotificationReceivedEvent) {
                    
                }
            }
            });

             
            VoipPushNotification.addEventListener('notification', (notification) => {
                // --- when receive remote voip push, register your VoIP client, show local notification ... etc      
                // --- optionally, if you `addCompletionHandler` from the native side, once you have done the js jobs to initiate a call, call `completion()`
                // VoipPushNotification.onVoipNotificationCompleted(notification.uuid);

            });
        
    }

    destroy() {
        VoipPushNotification.removeEventListener('register');   
        VoipPushNotification.removeEventListener('didLoadWithEvents');
        VoipPushNotification.removeEventListener('notification');
    }
    

    async registerAndroid() {

        console.log('====================================');
        console.log('registerAndroid');
        console.log('====================================');
        try {
            const fcmToken = await messaging().getToken();
            this.registerPushToken(fcmToken,"a");
        } catch (error) {
            console.log(error);
        }

    }

}


export default  NotificationService;