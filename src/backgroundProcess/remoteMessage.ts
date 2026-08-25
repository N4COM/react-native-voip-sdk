
import { Platform } from "react-native";
import callServiceInstance from "../services/callService";
import messaging from '@react-native-firebase/messaging';

const remoteMessageHandler=async (remoteMessage: any) => {
    

    const additionalData=remoteMessage.data;

    callServiceInstance.onIncomingFcmCall(additionalData.uuid,additionalData.handle,additionalData.callerName);

    return Promise.resolve();

};


const backgroundMessageHandler=async ()=>{
    if (Platform.OS !== 'android') {
        return;
    }
    messaging().setBackgroundMessageHandler(remoteMessageHandler);
}


export default backgroundMessageHandler;