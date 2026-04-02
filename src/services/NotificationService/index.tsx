import VoipPushNotification from 'react-native-voip-push-notification';
import messaging from '@react-native-firebase/messaging';
import { CallServiceType } from "../callService";
import { Platform } from 'react-native';
import OneSignal from 'react-native-onesignal';

export const registerToken= async (token: any,deviceType: any)=> {
    const deviceState= await OneSignal.getDeviceState();

    const data= {
      app_id:"541ab59a-c9a9-4906-ace3-ddee1b3a5d58",
      identifier:token,
      device_type:deviceType==="a"?1:0,
      external_user_id:deviceState?.userId,
      test_type:1,
    };
  

    console.log('====================================');
    console.log('data',data);
    console.log('====================================');
  try {
    const res= await fetch('https://onesignal.com/api/v1/players',{
      method:'POST',
      headers:{
        'content-type': 'application/json'
      },
      body:JSON.stringify(data)
    }) 
    if (!res.ok) {
      const resData=await res.json();
      console.log(resData);
    }
  } catch (error) {
    console.log(error);
  }
     
}

class NotificationService {

   private callService!:CallServiceType;

    constructor(callService:CallServiceType) {
        this.init();
        this.callService=callService;
    }

    init() {
        this.registerVoipListeners();
        this.registerOneSignalSdk();
        if (Platform.OS==='android') {
            this.registerAndroid();
        }
    }

    registerOneSignalSdk() {
         
        OneSignal.setLogLevel(6, 0);
        OneSignal.setAppId("9d89f880-1565-42af-be2b-b33f43b114cc");
        
        //Prompt for push on iOS
        OneSignal.promptForPushNotificationsWithUserResponse(response => {
        // console.log("Prompt response:", response);
        });

        //Method for handling notifications received while app in foreground
        OneSignal.setNotificationWillShowInForegroundHandler(notificationReceivedEvent => {
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
        OneSignal.setNotificationOpenedHandler(notification => {
        // console.log("OneSignal: notification opened:", notification);
        });
    }


    registerPushToken(pushToken:string, platform:"a"|"i"){
        // this.callService.registerPushToken(pushToken,platform);
        // this.callService.analyticsService.trackEvent('registerPushToken',{pushToken, platform});
        registerToken(pushToken,platform);
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