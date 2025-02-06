
import callServiceInstance from "../services/callService";
import messaging from '@react-native-firebase/messaging';

const remoteMessageHandler=async (remoteMessage: any) => {
    
    const {a:additionalData,i}=await JSON.parse(remoteMessage.data.custom);

    console.log('====================================');
    console.log({remoteMessage});
    console.log('====================================');

    callServiceInstance.onIncomingFcmCall(additionalData.uuid,additionalData.handle,additionalData.callerName);

    return Promise.resolve();

};


const backgroundMessageHandler=async ()=>{
    messaging().setBackgroundMessageHandler(remoteMessageHandler);
}


export default backgroundMessageHandler;