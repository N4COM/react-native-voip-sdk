
import callServiceInstance from "../services/callService";


export default async (remoteMessage: any) => {
    
    const {a:additionalData,i}=await JSON.parse(remoteMessage.data.custom);

    console.log('====================================');
    console.log({remoteMessage});
    console.log('====================================');

    callServiceInstance.onIncomingFcmCall(additionalData.uuid,additionalData.handle,additionalData.callerName);

    return Promise.resolve();

};