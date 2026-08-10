import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";
import IncomingCall from 'react-native-incoming-call';
import * as Localization from 'expo-localization';

export type IncomingCallPayload={
    uuid:string,
    callerName:string,
    callerHandle:string
}


class AndroidCallBridge{

    public onShowNativeCall!:(callUUID:string, handle:string, name:string)=>void;
    public endCallCallBack!:(payload:any)=>void;
    public answerCallCallBack!:(payload:any)=>void;

    public incomingCallScreenActive:boolean=false;
    public incomingCallScreenPayload:any=null;
    
    constructor(onShowNativeCall:(callUUID:string, handle:string, name:string)=>void,
        endCallCallBack:(payload:any)=>void,answerCallCallBack:(payload:any)=>void) { 
            this.onShowNativeCall=onShowNativeCall;
            this.endCallCallBack=endCallCallBack;
            this.answerCallCallBack=answerCallCallBack;
            this.init();
    }

    async init(){
        
      this.registerAndroidCallListeners();  

      const payload = await IncomingCall.getExtrasFromHeadlessMode();
        
      if (payload) {
        this.handlePayload(payload);
      }
  
    
    }

    registerAndroidCallListeners( ){
        
        DeviceEventEmitter.addListener("endCall", (payload)=>this.endCallCallBack(payload))
        DeviceEventEmitter.addListener("answerCall", (payload)=>this.answerCallCallBack(payload))
    }

    destroy(){
        DeviceEventEmitter.removeAllListeners("endCall")
        DeviceEventEmitter.removeAllListeners("answerCall")
    }

    handlePayload(payload:any){

        this.onShowNativeCall(payload.uuid, payload.callerName, payload.callerName);
        
    }


     async showIncomingCallScreen(payload:IncomingCallPayload){
        
        console.log('====================================');
        console.log('showIncomingCallScreen in AndroidNativeCallBridge',payload);
        console.log('====================================');

        this.incomingCallScreenActive=true;
        this.incomingCallScreenPayload=payload; 

        const appLanguage= await this.getAppLanguage();

        const isLanguageItalian= appLanguage?.substring(0,2)==='it';

        isLanguageItalian?
                 IncomingCall.display(
                    payload.uuid, // Call UUID v4
                    payload.callerName, // Username
                    'https://gravatar.com/avatar/10b2db7467c1d5e5ffcf2df2e7bde120?s=400&d=mp&r=x', // Avatar URL
                    'Chiamata in arrivo',  // Info text
                    180000, // Timeout for end call after 180s
                    'Accetta',
                    'Rifiuta'
                )
                :
                IncomingCall.display(
                    payload.uuid, // Call UUID v4
                    payload.callerName, // Username
                    'https://gravatar.com/avatar/10b2db7467c1d5e5ffcf2df2e7bde120?s=400&d=mp&r=x', // Avatar URL
                    'Incoming Call', // Info text
                    180000, // Timeout for end call after 180s
                    'Accept',
                    'Decline'
                )  

               
     }



    async getAppLanguage(){
        let appLanguage=await AsyncStorage.getItem('app_language');
        if(!appLanguage) appLanguage=Localization.getLocales()[0].languageCode;
        return appLanguage;
    }

    dismissCall(callUUID:string){
        if (!this.incomingCallScreenPayload || callUUID!==this.incomingCallScreenPayload.uuid) {
            return
        }
        IncomingCall.dismiss();
        this.incomingCallScreenActive=false;
        this.incomingCallScreenPayload=null;
    }

    backToForeground(){
        IncomingCall.backToForeground();
    }   

    launchApp(callUUID:string,callerName:string){
        IncomingCall.openAppFromHeadlessMode(callUUID,callerName);
    }


    async updateDisplay (callUUID:string,name:string,handle:string){ 
        IncomingCall.updateDisplay(callUUID,name,handle);
    }
    

}

export default AndroidCallBridge;
