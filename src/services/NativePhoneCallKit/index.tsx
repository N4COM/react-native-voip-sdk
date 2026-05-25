import { Platform } from "react-native";
import RNCallKeep, { CONSTANTS } from "react-native-callkeep";
import { CallServiceType } from "../callService";
import uuid from 'react-native-uuid';
import promptsInstance from "../../prompts";
import AndroidCallBridge from "../AndroidNativeCallBridge";
// import InCallManager from 'react-native-incall-manager';
// import { DeviceEventEmitter } from 'react-native';

const getNewUuid = () => uuid.v4().toString().toLowerCase();

const parseCauseCode=(cause:string)=>{
    switch (cause) {
        case "Canceled":
            return CONSTANTS.END_CALL_REASONS.MISSED;
        case "Failed":
            return CONSTANTS.END_CALL_REASONS.FAILED;
        case 'Ended':
            return CONSTANTS.END_CALL_REASONS.REMOTE_ENDED;
        default:
            return CONSTANTS.END_CALL_REASONS.REMOTE_ENDED
    }
}




class NativePhone{


    private callService!:CallServiceType;
    private static instance:NativePhone;
    private androidCallBridge!: AndroidCallBridge|null;

    private callStartingMap=new Map<string,string>();
    public isInitialized:boolean=false;

    constructor(callService:CallServiceType) {

 
        if (NativePhone.instance) {
            console.log('====================================');
            console.log('NativePhone instance already exists');
            console.log('====================================');
          return NativePhone.instance;
        }

        NativePhone.instance = this;
        this.callService = callService;
        this.androidCallBridge = Platform.OS==='android'
            ? new AndroidCallBridge(
                this.showIncomingCall.bind(this),
                this.androidEndCallHandler.bind(this),
                this.androidAnswerCallHandler.bind(this)
              )
            : null;

        if (Platform.OS==='ios') {
            this.init();
            return;
        }

        this.checkPermissions().then((hasPermissions)=> {
            console.log('hasPermissions',hasPermissions);
            if (hasPermissions) {
                this.init();
            }
        });

    }

    async checkPermissions(){
        const isEnabled=await RNCallKeep.checkPhoneAccountEnabled();

        if (!isEnabled) {
            return false;
        }
        return true;
    }

    async init(){

        const prompts=promptsInstance.getPrompts()

        try {
            await RNCallKeep.setup({
              ios: {
                appName: 'N4COM App',
              },
              android: {
                alertTitle: prompts.phoneAccountsPermissions.title,
                alertDescription: prompts.phoneAccountsPermissions.body,
                cancelButton: prompts.phoneAccountsPermissions.buttons.cancel,
                okButton: prompts.phoneAccountsPermissions.buttons.ok,
                foregroundService: {
                  channelId: 'com.buniq.n4com',
                  channelName: 'Foreground service for my app',
                  notificationTitle: 'My app is running on background',
                  notificationIcon: 'Path to the resource icon of the notification',
                },
                selfManaged:true,
                additionalPermissions: [],
              },
            });
            RNCallKeep.setAvailable(true);
            RNCallKeep.canMakeMultipleCalls(false);

            this.registerEventsListeners();
            this.isInitialized=true;
          } catch (error) {
            RNCallKeep.setAvailable(false);
            RNCallKeep.canMakeMultipleCalls(false);

            this.registerEventsListeners();
            console.log('====================================');
            console.log('error in init of NativePhone',error);
            console.log('====================================');
          }

    }


    registerEventsListeners(){


        RNCallKeep.addEventListener('didReceiveStartCallAction',(obj)=> this.onNativeCallStart(obj));
        RNCallKeep.addEventListener('answerCall',({callUUID})=>this.onNativeCallAnswer(callUUID));
        RNCallKeep.addEventListener('endCall',({callUUID})=> this.onNativeCallEnd(callUUID));
        RNCallKeep.addEventListener("didLoadWithEvents",(events)=> this.onNativeCallLoad(events));
        RNCallKeep.addEventListener('didDisplayIncomingCall',(event)=> this.onNativeCallDisplay(event));
        RNCallKeep.addEventListener('didPerformSetMutedCallAction',({ muted, callUUID })=> this.onNativeCallMute( muted, callUUID ));
        RNCallKeep.addEventListener('didToggleHoldCallAction',({hold, callUUID })=> this.onNativeCallHold(hold, callUUID ));
        if (Platform.OS==='android') {
            RNCallKeep.addEventListener('showIncomingCallUi',({handle, callUUID, name })=> this.onNativeAndroidCallShow(handle, callUUID, name));
        }
        RNCallKeep.addEventListener("didPerformDTMFAction",(obj)=> this.onNativeCallDTMF(obj));
        RNCallKeep.addEventListener("didChangeAudioRoute",(obj)=> this.onNativeCallAudioRoute(obj));
        // DeviceEventEmitter.addListener('Proximity', function (data) {
            
        // });
        if (Platform.OS==='ios') {
            //  NativeModules.InCallManager.addListener('Proximity')             
        }
        
        this.getInitialEvents()
    }


    removeEventsListeners(){
        
        RNCallKeep.removeEventListener('didReceiveStartCallAction');
        RNCallKeep.removeEventListener('answerCall');
        RNCallKeep.removeEventListener('endCall');
        RNCallKeep.removeEventListener('didLoadWithEvents');
        RNCallKeep.removeEventListener('didPerformSetMutedCallAction');
        RNCallKeep.removeEventListener('didToggleHoldCallAction');
        RNCallKeep.removeEventListener('showIncomingCallUi');
        RNCallKeep.removeEventListener('didPerformDTMFAction');
        RNCallKeep.removeEventListener('didChangeAudioRoute');
    
    }


    async getInitialEvents(){
    
        const events=await RNCallKeep.getInitialEvents();
    
    }

    onNativeCallStart(obj:any){


        if (!obj.handle) {    
            return;
        }

        // if callUUID is not provided, it means the call was initiated by phone app in ios

        if (!obj.callUUID) {

            if (this.callService.callStore.getAllCalls().length>0) {
                return;
            }


            const callUUID= getNewUuid();
            RNCallKeep.startCall(callUUID, obj.handle, obj.handle,'generic',false);
            return
        }
          
        let name= this.callStartingMap.get(obj.callUUID);  

        this.callService.startedCall(obj.handle,obj.callUUID,obj.name? obj.name:name);
        
        name ?? this.callStartingMap.delete(obj.callUUID);

        this.callService.analyticsService.trackEvent('onNativeCallStart',{callUUID:obj.callUUID, handle:obj.handle, name:obj.name});
    }

    onNativeCallAnswer(callUUID:string){

      
      console.log('====================================');
      console.log('onNativeCallAnswer',callUUID);
      console.log('====================================');
   
      try {
            this.callService.answeredCall(callUUID);
            if (Platform.OS==='android') {
                this.androidCallBridge?.dismissCall(callUUID);
            }

      } catch (error) {
            console.log('error in answering native call',error);
            this.reportCallEnded(callUUID,'Failed','local');
            this.callService.reportCallError(error);
      }

      this.callService.analyticsService.trackEvent('answeredCall',{callUUID:callUUID});

    }

    onNativeCallEnd(callUUID:string){
        this.callService.endCallByUUID(callUUID);
        this.callService.analyticsService.trackEvent('onNativeCallEnd',{callUUID:callUUID});
    }

    onNativeCallLoad(events:{name:string,data:any}[]){
        
        const eventSummary = {
            count: events.length,
            eventTypes: events.map(ev => ev.name),
            callUUIDs: events
                .map(ev => ev.data?.callUUID)
                .filter(Boolean)
        };
        
        this.callService.analyticsService.trackEvent('loadedEvents', eventSummary);
    

        let endedCallsUUID= events.map((ev: {name:string,data:any}) => {
          if (ev.name==='RNCallKeepPerformEndCallAction') {
             return ev.data.callUUID; 
          }
          return null
        });
      
      events.forEach((element: {name:string,data:any}) => {

          switch (element.name) {

            
             
              case 'RNCallKeepDidDisplayIncomingCall':
     
                  if (endedCallsUUID.indexOf(element.data.callUUID)=== -1 ) {
                      this.callService.callScreenDisplayed(element.data.callUUID,element.data.handle,element.data.localizedCallerName);
                    }
                  break;
              case 'RNCallKeepPerformAnswerCallAction':
                  this.callService.preLaunchAnswerCall(element.data.callUUID);
                  break;
            
              case 'RNCallKeepDidReceiveStartCallAction':
                  this.callService.preLaunchStartCall(element.data.handle,element.data.callUUID,element.data.name);
                  break;

              default:
                  break;
          }
      });



    }

    onNativeCallMute(muted:boolean, callUUID:string){
        
        this.callService.onCallMuted(muted,callUUID);
    }

    onNativeCallHold(hold:boolean, callUUID:string){
        
        this.callService.onCallHeld(callUUID,hold);
    }

    onNativeAndroidCallShow(handle:string, callUUID:string, name:string){

        console.log('====================================');
        console.log('onNativeAndroidCallShow in NativePhoneCallKit',handle, callUUID, name);
        console.log('====================================');

        if (this.androidCallBridge?.incomingCallScreenActive && this.androidCallBridge?.incomingCallScreenPayload?.uuid!==callUUID) {  
            console.log('====================================');
            console.log('reportCallEnded in NativePhoneCallKit',callUUID,'Failed','local');
            console.log('====================================');
            this.reportCallEnded(callUUID,'Failed','local');
            return;
        }
        this.androidCallBridge?.showIncomingCallScreen({uuid:callUUID, callerName:name, callerHandle:handle});
        this.onNativeCallDisplay({ error:null, callUUID, handle, localizedCallerName:name, hasVideo:false, fromPushKit:null, payload:null });

    }

    onNativeCallDTMF(obj:{digits:string, callUUID:string}){
        this.callService.sendDTMF(obj.digits,obj.callUUID);
    }

    onNativeCallAudioRoute(obj:{output:string, callUUID?:string,handle?:string,reason?:number}){
        this.callService.changeAudioRoute(obj.output,obj?.callUUID);
      }

    onNativeCallDisplay(event:any){

        console.log('====================================');
        console.log('onNativeCallDisplay in NativePhoneCallKit',event);
        console.log('====================================');

        this.callService.callScreenDisplayed(event.callUUID,event.handle,event.localizedCallerName);
        this.callService.analyticsService.trackEvent('callScreenDisplayed',{callUUID:event.callUUID, handle:event.handle, name:event.localizedCallerName});
    }  

    setEstablishedCall(callUUID:string){
        if (!callUUID) {
            return;
        }
        RNCallKeep.setCurrentCallActive(callUUID);
        RNCallKeep.reportConnectedOutgoingCallWithUUID(callUUID);
    }

    showIncomingCall(callUUID:string, handle:string, name:string){
        console.log('showIncomingCall in NativePhoneCallKit',callUUID, handle, name);
        RNCallKeep.displayIncomingCall(callUUID, handle, handle);

        // if (Platform.OS==='android') {
  
        //     this.onNativeCallDisplay({callUUID, handle, localizedCallerName:name, hasVideo:false, fromPushKit:null, payload:null });
        // }

        this.callService.analyticsService.trackEvent('showIncomingCall',{callUUID, handle, name});
      
    }  


    reportCallEnded(callUUID:string,cause:string,originator:string){

        const causeCode= parseCauseCode(cause);
        RNCallKeep.reportEndCallWithUUID(callUUID,causeCode);
        if (this.androidCallBridge?.incomingCallScreenActive) {
            this.androidCallBridge?.dismissCall(callUUID);
        }

        this.callService.analyticsService.trackEvent('reportCallEnded',{callUUID, cause, originator});
    }

    androidEndCallHandler(payload:any){
        RNCallKeep.endCall(payload.uuid);
        this.androidCallBridge?.dismissCall(payload.uuid);
        this.callService.analyticsService.trackEvent('androidEndCallHandler',{callUUID:payload.uuid});
    }

    androidAnswerCallHandler(payload:any){

        RNCallKeep.answerIncomingCall(payload.uuid);
        if (payload.isHeadless) {
            this.androidCallBridge?.launchApp(payload.uuid,payload.callerName);
        }else{
            this.androidCallBridge?.backToForeground();
        }

    }

    startInCallManager(){
        // console.log('====================================');
        // console.log('starting incall manager');
        // console.log('====================================');
        // InCallManager.start({media: 'audio'}); 
    }

    stopInCallManager(){
        // console.log('====================================');
        // console.log('stopping incall manager');
        // console.log('====================================');
        // InCallManager.stop();
    }
    
    async setAudioRoute(route:string,uuid:string){
        await RNCallKeep.setAudioRoute(uuid,route);
    }

    async getAudioRoutes(){
        const routes=await RNCallKeep.getAudioRoutes();
        return routes;
    }


    startCall( callUUID:string,handle:string, name:string){

    

        RNCallKeep.startCall(callUUID, handle, name,'generic',false);
        RNCallKeep.updateDisplay(callUUID, name, handle);
        RNCallKeep.reportConnectingOutgoingCallWithUUID(callUUID);
        this.callStartingMap.set(callUUID,name);
        this.callService.analyticsService.trackEvent('startCall',{callUUID, handle, name});
    }

    endCall(callUUID:string){
   
        RNCallKeep.endCall(callUUID);
        this.callService.analyticsService.trackEvent('endCall',{callUUID});
    }

    holdCall(callUUID:string,hold:boolean){
     
        RNCallKeep.setOnHold(callUUID,hold);
    
    }


    muteCall(callUUID:string,muted:boolean){
        
        RNCallKeep.setMutedCall(callUUID,muted);
    }

    clear(){

        RNCallKeep.endAllCalls();
    }

    updateDisplay(callUUID:string, name:string, handle:string){
     
        RNCallKeep.updateDisplay(callUUID, name, handle);
        this.androidCallBridge?.updateDisplay(callUUID,name,handle);
    }
}



export default NativePhone;