import VoipPushNotification from 'react-native-voip-push-notification';
import messaging from '@react-native-firebase/messaging';
import { CallServiceType } from "../callService";
import { Platform } from 'react-native';
import { OneSignal, LogLevel, NotificationWillDisplayEvent, NotificationClickEvent } from 'react-native-onesignal';
import { customFetch } from '../../API/api';

// The VoIP `register` event and the cached `didLoadWithEvents` replay both
// resolve to the same push token on launch, which caused this endpoint to be
// hit twice. Track the last token we (started to) register so an identical
// token is only POSTed once. Cleared on failure so a retry/new token still goes through.
let lastRegisteredPushToken: any;

export const registerToken= async (token: any,deviceType: any)=> {
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

    const data= {
      push_token:token,
      device_type:deviceType==="a"?"AndroidPush":"iOSPush",
      test_type:1,
    }

    console.log('====================================');
    console.log('data',data);
    console.log('====================================');
  try {
    const res= await customFetch('v2/users/me/push/register',{
      method:'POST',
      headers:{
        'content-type': 'application/json'
      },
      body:JSON.stringify(data)
    }) 
    if (!res.ok) {
      lastRegisteredPushToken = undefined;
      const resData=await res.json();
      console.log(resData);
    }
  } catch (error) {
    lastRegisteredPushToken = undefined;
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

        OneSignal.Debug.setLogLevel(LogLevel.Verbose);
        OneSignal.initialize("2c78d842-2725-4d3c-808b-b56f30e99f67");

        //Prompt for push on iOS
        OneSignal.Notifications.requestPermission(true);

        //Method for handling notifications received while app in foreground
        OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event: NotificationWillDisplayEvent) => {
        // console.log("OneSignal: notification will show in foreground:", event);
        let notification = event.getNotification();
        // console.log("notification: ", notification);
        const data = notification.additionalData;
        // console.log("additionalData: ", data);
        // preventDefault() means don't show the notification.
        event.preventDefault();

        });

        //Method for handling notifications opened
        OneSignal.Notifications.addEventListener('click', (event: NotificationClickEvent) => {
        // console.log("OneSignal: notification clicked:", event);
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