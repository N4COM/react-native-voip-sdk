import OneSignal from 'react-native-onesignal';
// import {Env} from '../constants/Env';


export const registerToken= async (token: any,deviceType: any)=> {

    console.log('====================================');
    console.log('registerToken');
    console.log('====================================');


    const deviceState= await OneSignal.getDeviceState();

    console.log({deviceState});

    // const data= Env.oneSignalApiData({
    //   app_id:"541ab59a-c9a9-4906-ace3-ddee1b3a5d58",
    //   identifier:token,
    //   device_type:deviceType,
    //   external_user_id:deviceState?.userId,
    // });
  
    const data={
      app_id:"541ab59a-c9a9-4906-ace3-ddee1b3a5d58",
      identifier:token,
      device_type:deviceType,
      external_user_id:deviceState?.userId,
      test_type:1,
    }


    console.log({data});

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