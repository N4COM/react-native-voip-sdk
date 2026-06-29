import VoipPushNotification from 'react-native-voip-push-notification';
import messaging from '@react-native-firebase/messaging';
import { CallServiceType } from "../callService";

class NotificationService {

   private callService!:CallServiceType;
   // The push token (iOS VoIP / FCM) can be delivered by the OS before the host
   // app calls startCallService and provides `onPushToken`. We cache the latest
   // token and flush it once the config is available, so it's never lost.
   private lastToken: string | null = null;
   private deliveredToken: string | null = null;

    constructor(callService:CallServiceType) {
        this.callService=callService;
        this.init();
    }

    init() {
        this.registerVoipListeners();
    }

    async registerPushToken(pushToken:string){
        if (!pushToken) {
            return;
        }
        this.lastToken = pushToken;
        await this.deliverPushToken();
    }

    // Delivers the most recent token to the client's onPushToken if it's
    // available and hasn't already been delivered. Safe to call repeatedly:
    // it's deduped by token, and retried on failure or when config arrives.
    async deliverPushToken(){
        if (!this.lastToken || this.lastToken === this.deliveredToken) {
            return;
        }

        const onPushToken = this.callService.getSdkConfig()?.onPushToken;
        if (!onPushToken) {
            return;
        }

        const token = this.lastToken;
        try {
            await onPushToken({
                token,
            });
            this.deliveredToken = token;
        } catch (error) {
            console.log('onPushToken error', error);
        }
    }


    registerVoipListeners() {
            VoipPushNotification.addEventListener('register', (token) => {
             this.registerPushToken(token);            
            });
            VoipPushNotification.addEventListener('didLoadWithEvents', (events) => {

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
            });
        
    }

    destroy() {
        VoipPushNotification.removeEventListener('register');   
        VoipPushNotification.removeEventListener('didLoadWithEvents');
        VoipPushNotification.removeEventListener('notification');
    }
    

    async registerAndroid() {
        try {
            const fcmToken = await messaging().getToken();
            this.registerPushToken(fcmToken);
        } catch (error) {
            console.log(error);
        }

    }

}


export default  NotificationService;
