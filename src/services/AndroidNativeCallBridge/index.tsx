import { DeviceEventEmitter } from "react-native";
import IncomingCall from 'react-native-incoming-call';
import promptsInstance from "../../prompts";

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

        const incomingCallScreen = await promptsInstance.getIncomingCallScreen();

        IncomingCall.display(
            payload.uuid, // Call UUID v4
            payload.callerName, // Username
            'https://gravatar.com/avatar/10b2db7467c1d5e5ffcf2df2e7bde120?s=400&d=mp&r=x', // Avatar URL
            incomingCallScreen.info,
            180000, // Timeout for end call after 180s
            incomingCallScreen.accept,
            incomingCallScreen.decline
        );
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
