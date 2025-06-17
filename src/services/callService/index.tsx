import NativePhone from "../NativePhoneCallKit";
import NotificationService from "../NotificationService";
import SipClient from "../SipService";
import CallStore from "./callStore";
import uuid from 'react-native-uuid';
import {AppState, AppStateStatus, Platform } from "react-native";
import BackgroundTimer from 'react-native-background-timer';
import {EventEmitter} from 'eventemitter3';
import AsyncStorage from '@react-native-async-storage/async-storage';



export const HELD= 'held';
export const CALL_PROGRESS='call_progress'; 
export const CONNECTING= 'connecting';
export const RINGING= 'ringing';
export const ESTABLISHED= 'established';
// @ts-expect-error TS(7016): Could not find a declaration file for module 'cryp... Remove this comment to see the full error message
import {MD5} from 'crypto-js';

export type AudioRoute='PHONE'|'SPEAKER'|'HEADSET'|'BLUETOOTH'





function standardizeRouteName(route: any):AudioRoute{
    if (route.toUpperCase()==='PHONE'|| 
    route.toUpperCase()==='EARPIECE'|| 
    route.toUpperCase()==='RECEIVER') {
      return 'PHONE'  
    }
    if (route.toUpperCase().includes('SPEAKER')) {
        return 'SPEAKER'
    }
    if (route.toUpperCase().includes('HEADSET')|| route.toUpperCase().includes('HEADPHONES')) {
        return 'HEADSET'
    }
    if (route.toUpperCase().includes('BLUETOOTH')) {
        return 'BLUETOOTH'
    }
    return 'PHONE'
}

export interface Call{
    sessionId:string
    callUUID:string
    name:string
    handle:string
    isMuted:boolean
    callStatus:CallStatus
    isHeld:boolean
    callDirection:'incoming'|'outgoing'
    callType:'audio'|'video',
    timeStarted:number|null,
    audioRoute:AudioRoute,
    endReason?:string
}

interface PendingOutgoingCall{
    callUUID:string
    handle:string
    name:string
}
export interface PendingCall{
    callUUID:string
    handle:string
    name:string,
    isAnswered:boolean
}


export type CallServiceType= typeof callServiceInstance

export type CallStatus='connecting'|'ringing'|'established'|'ended'|'peerConnection'

const getNewUuid = () => uuid.v4().toString().toLowerCase();
class CallService extends EventEmitter{

    public canCall:boolean

    private nativePhone!:NativePhone
    private sipClient!:SipClient
    private notificationService!:NotificationService
    public callStore!:CallStore

    public callConnectingUUID:string|undefined

    private pendingCall:PendingCall|undefined
    private pendingCallTimeout:number|undefined

    private pendingOutgoingCall:PendingOutgoingCall|undefined
    private pendingOutgoingCallTimeout:number|undefined

    private focusedCallUUID:string|undefined

    public appState:AppStateStatus=AppState.currentState

    public sipServiceInitFailed:boolean=false


    public callServiceDeviceId:string|undefined

    public extraCallData:{
        callUUID:string,
        callData:string
    }|null=null


    constructor(){
        super()
        this.canCall=false
        this.callStore= new CallStore();
        this.nativePhone= new NativePhone(this)
        this.sipClient= new SipClient(this)
        this.notificationService= new NotificationService(this)
        this.appStateListener()    

    }

    async  saveDev(isDev:boolean){
        await AsyncStorage.setItem('isDev',isDev.toString())
    }

    async init(token:string, isDev?:boolean){
        const saved=await this.saveToken(token)
        if (isDev) {
            await this.saveDev(isDev)
        }
        if (!saved) {
            return
        }
        this.initiateCallService()
    }

    async saveToken(token:string){
        try {
            await AsyncStorage.setItem('N4COM_TOKEN',token)
            return true
        } catch (error) {
            console.log('====================================');
            console.log('saveToken error',error);
            console.log('====================================');
            return false
        }
    }
    

    registerPushToken(pushToken:string, platform:"a"|"i"){
       this.sipClient.registerPushToken(pushToken,platform);
    }

    initiateCallService(){
        this.sipClient.registerClient()
        this.notificationService.registerAndroid()
    }

    appStateListener(){
        AppState.addEventListener('change', (nextAppState) => {
            if (this.appState.match(/inactive|background/) && nextAppState === 'active') {  
                this.sipClient.init()
            }
            if (this.appState.match(/active/) && nextAppState === 'background') {
                this.callStore.callUUIDMap.size===0 && this.stopCallService()
            }
            this.appState = nextAppState;
        });
    }

    stopCallService(){
        this.sipClient.destroy()
    }

    removeSipCredentials(){
        this.sipClient.destroy()
        this.sipClient.removeCredentials()
    }

    setCallServiceDeviceId(deviceId:string){

        this.callServiceDeviceId = deviceId;
    }

    callScreenDisplayed(callUUID:string,handle:string,name:string){
       
       
        const call=this.callStore.getCallByCallUUID(callUUID);


        if (call) {
            console.log('callScreenDisplayed call',call);
            return
        }

        if (this.pendingCall&& this.pendingCall.callUUID !== callUUID &&this.pendingCallTimeout) {
            console.log('callScreenDisplayed pendingCall',this.pendingCall);
            this.nativePhone?.reportCallEnded(this.pendingCall.callUUID,'Failed','local')
            BackgroundTimer.clearTimeout(this.pendingCallTimeout)
            this.pendingCall=undefined
            this.pendingCallTimeout=undefined
            this.emit('callPending',this.pendingCall)
        }


        this.pendingCall={callUUID,handle,name,isAnswered:false}
        console.log('callScreenDisplayed pendingCall',this.pendingCall);
        // auto destroy the call after 5 seconds
        this.pendingCallTimeout= BackgroundTimer.setTimeout(()=>{
            console.log('callScreenDisplayed pendingCallTimeout');
            this.emit('callFailed')
            this.pendingCall=undefined
            this.nativePhone?.reportCallEnded(callUUID,'Failed','local')
            this.pendingCallTimeout=undefined
            this.emit('callPending',this.pendingCall)
            this.callCleanUp()
        },5000);

        this.sipClient.init()

    }

    onSipClientReady(){

        this.canCall=true;
        this.sipServiceInitFailed=false;
        if (this.pendingOutgoingCall&& this.pendingOutgoingCallTimeout) {
           
            this.startedCall(this.pendingOutgoingCall.handle,this.pendingOutgoingCall.callUUID,this.pendingOutgoingCall.name)
            BackgroundTimer.clearTimeout(this.pendingOutgoingCallTimeout)
            this.pendingOutgoingCall=undefined
            this.pendingOutgoingCallTimeout=undefined
        }
    }

    onSipClientFailed(){
        this.canCall=false
        this.sipServiceInitFailed=true
        this.emit('sipServiceFailed')
    }




    makeSureUUIDisUUID4(uuid: string) {
       
        if (uuid.length === 32 || Platform.OS==='android') {
            return uuid;
        }
        // Create a deterministic UUID using a hash of the input string
        const hashHex = MD5(uuid).toString();

        const uuid4 = `${hashHex.slice(0, 8)}-${hashHex.slice(8, 12)}-4${hashHex.slice(12, 15)}-a${hashHex.slice(15, 18)}-${hashHex.slice(18, 30)}`;
     
        return uuid4.toLowerCase();
    }



    onIncomingSipCall(sessionEvent:any){



        if (sessionEvent.originator === 'remote' && (!this.canCall || this.callConnectingUUID || this.callStore.callUUIDMap.size>1)) {
        
            this.sipClient.endCall(sessionEvent.request.call_id)
            return
        }

        let callUUID=this.makeSureUUIDisUUID4(sessionEvent.request.call_id);
        let showIncomingCallScreen=true;
        let isAnswered=false;
        
        let name=sessionEvent.request.from._display_name  as string;
        let handle=sessionEvent.request.from._uri._user  as string;

      
       
        if(this.pendingCall&&this.pendingCallTimeout&& this.pendingCall.callUUID===this.makeSureUUIDisUUID4(sessionEvent.request.call_id)){
            callUUID=this.pendingCall.callUUID
            name=this.pendingCall.name      
            isAnswered=this.pendingCall.isAnswered
            BackgroundTimer.clearTimeout(this.pendingCallTimeout)
            this.pendingCall=undefined
            showIncomingCallScreen=false
            this.pendingCallTimeout=undefined
        }
        if (this.pendingCall&& this.pendingCallTimeout&& this.pendingCall.callUUID!==this.makeSureUUIDisUUID4(sessionEvent.request.call_id)) {
            this.nativePhone?.reportCallEnded(this.pendingCall.callUUID,'Failed','local')
            this.pendingCall=undefined
            BackgroundTimer.clearTimeout(this.pendingCallTimeout)
            this.pendingCallTimeout=undefined   
            this.emit('callPending',this.pendingCall)
        }
        
        const newCall:Call= {
            sessionId:sessionEvent.request.call_id,
            callUUID,
            name,
            handle,
            isMuted:false,
            callStatus:'connecting',
            isHeld:false,
            callDirection:'incoming',
            callType:'audio',
            timeStarted:null,
            audioRoute:'PHONE'
        }


      
        
       
        this.callConnectingUUID=callUUID
        this.callStore.addCall(newCall);
        this.focusedCallUUID=callUUID
        this.emit('newCall',newCall)
        
        isAnswered && this.sipClient.answerCall(sessionEvent.request.call_id)
        showIncomingCallScreen && this.nativePhone?.showIncomingCall(callUUID,handle,name)

    }

    onSipCallFailed(sessionEvent:any){

       if (sessionEvent.originator === 'local') {
            const calls= this.callStore.getAllCalls()
            calls.forEach((call)=>{
                this.nativePhone?.reportCallEnded(call.callUUID,sessionEvent.cause,'local')
                this.callStore.removeCallByCallUUID(call.callUUID)
                this.emit('callEnded',call)
            })
            this.callCleanUp()
            return; 
       }
        const call=this.callStore.getCallBySessionId(sessionEvent.message.call_id);
        const originator=sessionEvent.originator;
        const cause=sessionEvent.cause;
        if (call) {
            call.endReason=cause
            this.nativePhone?.reportCallEnded(call.callUUID,cause,originator)
            this.callStore.removeCallBySessionId(sessionEvent.message.call_id)
            this.emit('callEnded',call)
            this.sipClient.removeSession(sessionEvent.message.call_id)
            this.callCleanUp()
                  
        }
    }

    onSipCallEnded(sessionEvent:any){


        if (sessionEvent.originator === 'local') {


            const calls= this.callStore.getAllCalls()
            calls.forEach((call)=>{

                this.nativePhone?.reportCallEnded(call.callUUID,sessionEvent.cause,'local')
                this.callStore.removeCallByCallUUID(call.callUUID)
                this.emit('callEnded',call)
            })


            this.callCleanUp()

            return; 
        }
        
        const call=this.callStore.getCallBySessionId(sessionEvent.message.call_id);
        const originator=sessionEvent.originator;
        const cause=sessionEvent.cause;

      
        if (call) {
            call.endReason=cause
            this.nativePhone?.reportCallEnded(call.callUUID,cause,originator)
            this.callStore.removeCallBySessionId(sessionEvent.message.call_id)
            this.emit('callEnded',call)
            this.sipClient.removeSession(sessionEvent.message.call_id)
            this.callCleanUp()
           
        }

    }

    onSipCallConfirmed(session:any){

        if (session.originator === 'local') {
            return;
        }
        const call=this.callStore.getCallBySessionId(session.ack.call_id);
        this.callStore.startCallTimer(session.ack.call_id)
        this.callStore.updateCallStatusBySessionId(session.ack.call_id,'established')   
        this.nativePhone?.setEstablishedCall(call?.callUUID||'')
        this.callConnectingUUID=undefined
        this.holdOtherCalls(session.ack.call_id)
        this.emit('callUpdated',call)
        // this line seems to be not needed, to be tested
        this.emit('callPending',this.pendingCall)
        this.nativePhone?.startInCallManager()

    }


    onSipCallAccepted(sessionEvent:any){
       
        if (sessionEvent.originator === 'local') {
            return;
        }

        const call=this.callStore.getCallBySessionId(sessionEvent.response.call_id);
        this.callStore.startCallTimer(sessionEvent.response.call_id)
        this.callStore.updateCallStatusBySessionId(sessionEvent.response.call_id,'established')
        this.callConnectingUUID=undefined
        this.nativePhone?.setEstablishedCall(call?.callUUID || '')
        this.holdOtherCalls(sessionEvent.response.call_id)
        this.emit('callUpdated',call)
    }

    // onSipCallPeerConnection(session:any){
        
    // }

    onSipCallProgress(session:any){
       
        if (session.originator === 'local') {
            return;
        }
        const call=this.callStore.getCallBySessionId(session.response.call_id);
        this.callStore.updateCallStatusBySessionId(session.response.call_id,'ringing')
        this.emit('callUpdated',call)

    }

    onIncomingFcmCall(callUUID:string,handle:string,name:string){

        
        
        this.nativePhone?.showIncomingCall(callUUID,handle,name)

        // this.callScreenDisplayed(callUUID,handle,name)

        
    }

    onSipLocalSessionCreated(){

       this.nativePhone?.startInCallManager();

    }

    startedCall(handle:string,callUUID:string,name?:string){
   
        name = name || handle
        handle= handle.replace(/[^\d+*#]/g, '')
        if (!this.canCall) {
 
            this.pendingOutgoingCall={callUUID,handle,name}
            this.pendingOutgoingCallTimeout= BackgroundTimer.setTimeout(()=>{
     
                this.pendingOutgoingCall=undefined
                this.pendingOutgoingCallTimeout=undefined
                this.nativePhone?.reportCallEnded(callUUID,'Failed','local')
            },5000);

            this.sipClient.init()


            return
            
        }

        let extraCallData=this.extraCallData?.callUUID === callUUID ? this.extraCallData.callData : undefined

        const session= this.sipClient.startCall(handle,extraCallData);
        
        const newCall:Call= {
            sessionId:session._request.call_id,
            callUUID,
            name,
            handle,
            isMuted:false,
            callStatus:'connecting',
            isHeld:false,
            callDirection:'outgoing',
            callType:'audio',
            timeStarted:null,
            audioRoute:'PHONE'
        }
        this.callConnectingUUID=callUUID
        this.callStore.addCall(newCall);
        this.emit('newCall',newCall)
        this.focusedCallUUID=callUUID
    

    }


    makeCall(handle:string, name?:string, calldata?:string){

        console.log("makeCall",handle, name, calldata);
    
        

        if (!this.canCall) {        
            console.log("makeCall failed");
            this.emit('outgoingCallFailed')
            return
        }
        const callUUID= getNewUuid();

        if (calldata) {
            this.extraCallData={
                callUUID:callUUID,
                callData:calldata
            };
        }else{
            this.extraCallData=null;
        }


        this.nativePhone?.startCall(callUUID,handle,name? name:handle)
    
    }


    answeredCall(callUUID:string){

   
    
        if (this.pendingCall&& this.pendingCall.callUUID===callUUID) {
            this.pendingCall.isAnswered=true
            this.emit('callPending',this.pendingCall)
            return
        }

        const call=this.callStore.getCallByCallUUID(callUUID);
        if (call) {
            this.sipClient.answerCall(call.sessionId)
            this.emit('callPending',call)
        }


    }


    terminateCall(){


        if(!this.focusedCallUUID){
            this.nativePhone?.clear()
            return
        }
        this.nativePhone?.endCall(this.focusedCallUUID)
    }



    endCallByUUID(callUUID:string){


        if (this.pendingCallTimeout&& this.pendingCall&& this.pendingCall.callUUID===callUUID) {
            this.pendingCall=undefined
            BackgroundTimer.clearTimeout(this.pendingCallTimeout)
            this.pendingCallTimeout=undefined
            this.emit('callPending',this.pendingCall)
            return
        }

        const call=this.callStore.getCallByCallUUID(callUUID);
        if (call) {
            this.sipClient.endCall(call.sessionId)
            this.sipClient.removeSession(call.sessionId)
            this.callStore.removeCallByCallUUID(callUUID)
            this.emit('callEnded',call)
            this.callCleanUp()
          
        }

    }

    preLaunchAnswerCall(callUUID:string){
        if (this.pendingCall && this.pendingCall.callUUID===callUUID) {
            this.pendingCall.isAnswered=true
            this.emit('callPending',this.pendingCall)
            return
        }
    }

    // preLaunchStartCall(handle:string,callUUID:string,name:string){
    
    // }

    muteCall(){

        if (!this.focusedCallUUID) {
            return
        }

        const call=this.callStore.getCallByCallUUID(this.focusedCallUUID);

        if (call) {
            const isMuted=call.isMuted
            this.nativePhone?.muteCall(call.callUUID,!isMuted)
        }


    }

    onCallMuted(isMuted:boolean,callUUID:string){
        const call=this.callStore.getCallByCallUUID(callUUID);
        if (call) {
            this.sipClient.muteCall(call.sessionId,isMuted)
            this.callStore.updateCallMuteStatus(call.sessionId,isMuted)
            this.emit('callUpdated',call)
        }
    }

    toggleHoldCall(){
        if (!this.focusedCallUUID) {
            return
        }
        const call=this.callStore.getCallByCallUUID(this.focusedCallUUID);
        if (call) {
            const isHeld=call.isHeld
            this.nativePhone?.holdCall(call.callUUID,!isHeld)
        }
    }


    onCallHeld(callUUID:string,isHeld:boolean){
       
        const call=this.callStore.getCallByCallUUID(callUUID);
        if (call) {
           
            this.sipClient.holdCall(call.sessionId,isHeld)
            this.callStore.updateCallHoldStatus(call.sessionId,isHeld)
            this.emit('callUpdated',call)
        }
    }



    swapCall(){

        if (!this.focusedCallUUID) {
            return
        }

        const calls= this.callStore.getAllCalls();

        if (calls.length===1) {
            return
        }

        const heldCall= calls.find((call)=>call.callUUID!==this.focusedCallUUID && call.isHeld);
        if (heldCall) {
            this.nativePhone?.holdCall(this.focusedCallUUID,true)
            this.nativePhone?.holdCall(heldCall.callUUID,false)   
            this.focusedCallUUID=heldCall.callUUID
        }



    }

   
    attendedTransferCall(originCall:Call, targetCall:Call){
        this.sipClient.attendedTransferCall(originCall,targetCall)   
    }

    blindTransferCall(targetNumber:string){
        if(!this.focusedCallUUID){
            return
        }
        const sessionId=this.callStore.getCallByCallUUID(this.focusedCallUUID)?.sessionId
        if (sessionId) {
            this.sipClient.blindTransferCall(sessionId,targetNumber)
        }
    }


    sendDTMF(digits:string,callUUID?:string){
        if (!this.focusedCallUUID) {
            return
        }
        const call=this.callStore.getCallByCallUUID(callUUID || this.focusedCallUUID);
        if (call) {
            this.sipClient.sendDTMF(call.sessionId,digits)
        }

    }

    changeAudioRoute(output:string,callUUID?:string){
        if (!this.focusedCallUUID) {
            return
        }
        const call=this.callStore.getCallByCallUUID(callUUID || this.focusedCallUUID);
        if (call) {
            const audioRoute= standardizeRouteName(output)
            this.callStore.updateCallAudioRoute(call.sessionId,audioRoute)
            this.emit('callUpdated',call)
        }
    }


    resetIncomingCallProps(){
        
    }

    callCleanUp(){

       
        if(this.callStore.callUUIDMap.size===0 && this.appState==='background'){
            this.sipClient.destroy()
           
        }
        if (this.callConnectingUUID) {
            this.callConnectingUUID=undefined
        }

        if (this.callStore.callUUIDMap.size===0) {
            this.focusedCallUUID=undefined
            this.nativePhone?.stopInCallManager()
            this.emit('callPending',this.pendingCall)
        }else{
            const calls= this.callStore.getAllCalls();
            const call=calls.find((call)=>call.callStatus==='established')
            if (call) {
                this.focusedCallUUID=call.callUUID
            }
        }
    }

    holdOtherCalls(sessionId:string){
        const calls= this.callStore.getAllCalls();
        calls.forEach((call)=>{
            if (call.sessionId!==sessionId&& !call.isHeld ) {
                this.nativePhone?.holdCall(call.callUUID,true)
                this.callStore.updateCallHoldStatus(call.sessionId,true)
                this.emit('callUpdated',call)
            }
        })
    }   

    async getAudioRoutes(){
        return await this.nativePhone?.getAudioRoutes()
    }

    async setAudioRoute(route:string){
        if (!this.focusedCallUUID) {
            return
        }
        await this.nativePhone?.setAudioRoute(route,this.focusedCallUUID)
    }

    updateCallInfo(callUUID:string,info:string){
        
        this.callStore.updateCallInfo(callUUID,info)
        const call=this.callStore.getCallByCallUUID(callUUID)
        if (call) {
            this.nativePhone?.updateDisplay(callUUID,info,call.handle)
            this.emit('callUpdated',this.callStore.getCallByCallUUID(callUUID))
        }
      
    }

   
}


const callServiceInstance= new CallService();


export default callServiceInstance;



