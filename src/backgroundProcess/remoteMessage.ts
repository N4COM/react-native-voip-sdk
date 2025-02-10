
import { Platform } from "react-native";
import callServiceInstance from "../services/callService";
let firebaseApp:any;
if (Platform.OS === 'android') {
    firebaseApp = require('@react-native-firebase/app');
}

const remoteMessageHandler=async (remoteMessage: any) => {
    
    const {a:additionalData,i}=await JSON.parse(remoteMessage.data.custom);

    console.log('====================================');
    console.log({remoteMessage});
    console.log('====================================');

    callServiceInstance.onIncomingFcmCall(additionalData.uuid,additionalData.handle,additionalData.callerName);

    return Promise.resolve();

};


const backgroundMessageHandler=async ()=>{
    if (Platform.OS !== 'android') {
        return;
    }
    firebaseApp.messaging().setBackgroundMessageHandler(remoteMessageHandler);
}


export default backgroundMessageHandler;