import NativePhone from "../NativePhoneCallKit";
import NotificationService from "../NotificationService";
import SipClient from "../SipService";
import CallStore from "./callStore";
import uuid from 'react-native-uuid';
import {Alert, AppState, AppStateStatus, PermissionsAndroid, Platform } from "react-native";
import BackgroundTimer from 'react-native-background-timer';
import { permissions } from 'react-native-webrtc';
import {EventEmitter} from 'eventemitter3';
import { PromptsType } from '../../prompts';
import {VoipSdkConfig} from '../../types/config';
import {
    clearSipSession,
    isUsableSipCredentials,
    loadSipSession,
    saveSipSession,
    SipSession,
} from '../sipSessionStore';



export const HELD= 'held';
export const CALL_PROGRESS='call_progress'; 
export const CONNECTING= 'connecting';
export const RINGING= 'ringing';
export const ESTABLISHED= 'established';
// @ts-ignore TS(7016): the pinned crypto-js fork may or may not ship type declarations
import {MD5} from 'crypto-js';
import promptsInstance from "../../prompts";

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

export interface PendingCall{
    callUUID:string
    handle:string
    name:string,
    isAnswered:boolean
    callDirection:'incoming'|'outgoing'
}


export type CallServiceType= typeof callServiceInstance

export type CallStatus='connecting'|'ringing'|'established'|'ended'|'peerConnection'

export type SipState='idle'|'connecting'|'registered'|'disconnected'|'failed'

export type SipFailReason='NO_CREDENTIALS'|'AUTH_FAILED'|'SERVER_UNREACHABLE'|'UNKNOWN'

export type SipStatus={
    state:SipState
    reason?:SipFailReason   // only when state is 'failed'
    detail?:string          // server response, e.g. '403 Forbidden' - for logs/support
}

export type CallErrorCode='SIP_NOT_READY'|'INCOMING_TIMEOUT'|'INVALID_NUMBER'|'MIC_PERMISSION_DENIED'|'UNKNOWN'

export type CallError={
    code:CallErrorCode
    sipStatus?:SipStatus   // the SIP status at the time - the cause, for SIP_NOT_READY and INCOMING_TIMEOUT
}

const PENDING_INVITE_TIMEOUT_MS = 5000;
const PENDING_SIP_WAKE_TIMEOUT_MS = 20000;

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

    private pendingOutgoingCall:PendingCall|undefined
    private pendingOutgoingCallTimeout:number|undefined

    private focusedCallUUID:string|undefined

    public appState:AppStateStatus=AppState.currentState

    // On Android the permission dialog sends the app to 'background'; that is
    // our own dialog, not the user leaving, so SIP must stay up through it.
    private requestingMicPermission:boolean=false

    public sipServiceInitFailed:boolean=false

    public sipStatus:SipStatus={state:'idle'}

    private sdkConfig?: VoipSdkConfig;
    private sipSession?: SipSession;

    public callServiceDeviceId:string|undefined

    public extraCallData:{
        callUUID:string,
        callData:string
    }|null=null

    public specialHandleCall:{
        handle:string,
        callUUID:string,
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

    setSdkStrings(prompts:PromptsType){
        promptsInstance.setPrompts(prompts)
    }

    async getAudioRecordPermission(){

        return new Promise((resolve,reject)=>{

            if (Platform.OS==='ios') {
                resolve(true)
                return
            }

            PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO).then((hasPermission)=>{

                if (hasPermission) {
                    resolve(true)
                    return
                }

                const prompts=promptsInstance.getPrompts()
                
                Alert.alert(prompts.initialPermissions.title, prompts.initialPermissions.body, [
                    {text: prompts.initialPermissions.buttons.cancel, style: 'cancel', onPress: () => resolve(false)},
                    {text: prompts.initialPermissions.buttons.ok, onPress: async () => {
                        const result=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)
                        if (result!==PermissionsAndroid.RESULTS.GRANTED) {
                            resolve(false);
                            return;
                        }
                        resolve(true);
                        return;
                    }},
                ]);
            })
        })
    }

    // Answering can happen from the lock screen, where no dialog can be shown,
    // so this only checks. iOS 'prompt' is fine: iOS asks by itself when audio starts.
    async hasMicPermission():Promise<boolean>{
        if (Platform.OS==='ios') {
            return (await permissions.query({name:'microphone'}))!=='denied'
        }
        return PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)
    }

    // Checked before every call: Android's ConnectionService silently drops a
    // call started without RECORD_AUDIO. Asks when Android still allows it.
    async requestMicPermission():Promise<boolean>{
        if (Platform.OS==='ios') {
            return (await permissions.request({name:'microphone'}))===true
        }
        if (await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)) {
            return true
        }
        this.requestingMicPermission=true
        try {
            const result=await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO)
            return result===PermissionsAndroid.RESULTS.GRANTED
        } finally {
            this.requestingMicPermission=false
        }
    }

    async start(config: VoipSdkConfig){

        await this.getAudioRecordPermission()
        this.sdkConfig = config;
        // A push token may have arrived before the config was set; flush it now.
        this.notificationService.deliverPushToken();
        this.sipSession = await this.readSipSessionFromHost();
        await this.initiateCallService()
    }

    getSdkConfig(): VoipSdkConfig | undefined {
        return this.sdkConfig;
    }

    // The host is the source of truth, but it only reaches us through start().
    // A push-woken process has no host config, so it falls back to the session
    // saved by the last start().
    async getSipSession(): Promise<SipSession | undefined> {
        if (!this.sipSession && this.sdkConfig) {
            this.sipSession = await this.readSipSessionFromHost();
        }
        if (!this.sipSession) {
            this.sipSession = await loadSipSession();
        }
        return this.sipSession;
    }

    private async readSipSessionFromHost(): Promise<SipSession | undefined> {
        if (!this.sdkConfig) {
            return undefined;
        }
        try {
            const credentials = await this.sdkConfig.getSipCredentials();
            if (!isUsableSipCredentials(credentials)) {
                return undefined;
            }
            const session = {
                credentials,
                contactParams: this.sdkConfig.sipContactParams?.() ?? {},
                sipOptions: this.sdkConfig.sipOptions ?? {},
            };
            await saveSipSession(session);
            return session;
        } catch (error) {
            console.log('getSipCredentials error', error);
            return undefined;
        }
    }

    emitSdkEvent(name: string, properties?: Record<string, any>) {
        this.sdkConfig?.onSdkEvent?.({ name, properties });
    }

    async initiateCallService(){
        void this.sipClient.registerClient()
        if (Platform.OS==='android') {
            this.notificationService.registerAndroid()
        }

        await this.nativePhone.init()
    }

    appStateListener(){
        AppState.addEventListener('change', (nextAppState) => {
            if (this.appState.match(/inactive|background/) && nextAppState === 'active') {  
                this.sipClient.init()
            }
            if (this.appState.match(/active/) && nextAppState === 'background') {
                this.callStore.callUUIDMap.size===0 && !this.requestingMicPermission && this.stopCallService()
            }
            this.appState = nextAppState;
        });
    }

    stopCallService(){
        this.sipClient.destroy()
        this.sdkConfig = undefined;
    }

    removeSipCredentials(){
        this.sipClient.destroy()
        this.sipClient.removeCredentials()
        this.sdkConfig = undefined;
        this.sipSession = undefined;
        this.callServiceDeviceId = undefined;
        void clearSipSession();
    }

    setCallServiceDeviceId(deviceId:string){

        this.callServiceDeviceId = deviceId;
    }

    setSipStatus(status:SipStatus){
        const current=this.sipStatus
        if (current.state===status.state && current.reason===status.reason && current.detail===status.detail) return
        this.sipStatus=status
        this.emit('sipStatusChanged',status)
        this.emitSdkEvent('sipStatus',status)
        if (this.pendingOutgoingCall && (status.state==='failed'||status.state==='disconnected'||status.state==='idle')) {
            this.failPendingOutgoingCall(this.pendingOutgoingCall.callUUID)
        }
    }

    private clearPendingOutgoingCall(){
        if (this.pendingOutgoingCallTimeout !== undefined) {
            BackgroundTimer.clearTimeout(this.pendingOutgoingCallTimeout)
        }
        this.pendingOutgoingCall=undefined
        this.pendingOutgoingCallTimeout=undefined
    }

    // SIP won't come up for the call waiting on it: give up and say why.
    private failPendingOutgoingCall(callUUID:string){
        this.clearPendingOutgoingCall()
        this.nativePhone?.reportCallEnded(callUUID,'Failed','local')
        this.emit('callPending',this.pendingCall)
        this.emitCallError({code:'SIP_NOT_READY', sipStatus:this.sipStatus})
    }

    emitCallError(error:CallError){
        this.emit('callError',error)
        this.emitSdkEvent('callError',error)
    }

    callScreenDisplayed(callUUID:string,handle:string,name:string){
       
        const call=this.callStore.getCallByCallUUID(callUUID);


        if (call) {
            return
        }

        if (this.pendingCall && this.pendingCall.callUUID === callUUID && this.pendingCallTimeout !== undefined) {
            return
        }

        if (this.pendingCall && this.pendingCall.callUUID !== callUUID) {
            this.nativePhone?.reportCallEnded(this.pendingCall.callUUID,'Failed','local')
            this.pendingCall=undefined
            this.emit('callPending',this.pendingCall)
        }

        this.clearPendingCallTimeout()

        this.pendingCall={callUUID,handle,name,isAnswered:false,callDirection:'incoming'}
        this.armPendingCallTimeout(
            callUUID,
            this.sipClient.isRegistered ? PENDING_INVITE_TIMEOUT_MS : PENDING_SIP_WAKE_TIMEOUT_MS,
        );

        void this.sipClient.registerClient()

    }

    private clearPendingCallTimeout(){
        if (this.pendingCallTimeout !== undefined) {
            BackgroundTimer.clearTimeout(this.pendingCallTimeout)
            this.pendingCallTimeout=undefined
        }
    }

    private armPendingCallTimeout(callUUID:string, timeoutMs:number){
        this.clearPendingCallTimeout()
        this.pendingCallTimeout= BackgroundTimer.setTimeout(()=>{
            this.pendingCallTimeout=undefined
            if (!this.pendingCall || this.pendingCall.callUUID !== callUUID) {
                return
            }
            this.emitCallError({code:'INCOMING_TIMEOUT', sipStatus:this.sipStatus})
            this.pendingCall=undefined
            this.nativePhone?.reportCallEnded(callUUID,'Failed','local')
            this.emit('callPending',this.pendingCall)
            this.callCleanUp()
        },timeoutMs);
    }

    onSipClientReady(){

        this.canCall=true;
        this.sipServiceInitFailed=false;
        this.setSipStatus({state:'registered'})
        if (this.pendingCall) {
            this.armPendingCallTimeout(this.pendingCall.callUUID, PENDING_INVITE_TIMEOUT_MS)
        }
        if (this.pendingOutgoingCall) {
            const {handle,callUUID,name}=this.pendingOutgoingCall
            this.clearPendingOutgoingCall()
            this.startedCall(handle,callUUID,name)
            this.emit('callPending',this.pendingCall)
        }
    }

    onSipClientFailed(reason:SipFailReason, detail?:string){
        this.canCall=false
        this.sipServiceInitFailed=true
        this.setSipStatus({state:'failed', reason, detail})
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
        // Only incoming calls reach here: 'confirmed' fires with
        // originator==='remote' when the remote ACKs a call we answered, and
        // with 'local' when we ACK an outgoing 200 - which the guard above
        // returns on.
        this.nativePhone?.setEstablishedCall(call?.callUUID||'','incoming')
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
        // Only outgoing calls reach here: 'accepted' fires with
        // originator==='remote' on the remote's 200, and with 'local' when we
        // answer an incoming call - which the guard above returns on.
        this.nativePhone?.setEstablishedCall(call?.callUUID || '','outgoing')
        this.holdOtherCalls(sessionEvent.response.call_id)
        this.emit('callUpdated',call)
    }


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
    }

    onSipLocalSessionCreated(){

       this.nativePhone?.startInCallManager();

    }

    startedCall(handle:string,callUUID:string,name?:string){
   
        name = name || handle
        if (!this.canCall) {
 
            // Waits for SIP: placed on 'registered', ended on failed/disconnected/idle.
            this.pendingOutgoingCall={callUUID,handle,name,isAnswered:false,callDirection:'outgoing'}
            // Backstop for when SIP reports nothing at all (e.g. the credentials request hangs).
            this.pendingOutgoingCallTimeout=BackgroundTimer.setTimeout(()=>{
                this.pendingOutgoingCall?.callUUID===callUUID && this.failPendingOutgoingCall(callUUID)
            },PENDING_SIP_WAKE_TIMEOUT_MS)
            this.emit('callPending',this.pendingOutgoingCall)

            void this.sipClient.registerClient()


            return
            
        }

        let extraCallData=this.extraCallData?.callUUID === callUUID ? this.extraCallData.callData : undefined
        let sipHandle = this.specialHandleCall?.callUUID=== callUUID ? this.specialHandleCall.handle : handle

        let session
        try {
            session= this.sipClient.startCall(sipHandle,extraCallData);
        } catch (error) {
            console.log('startCall error', error)
            this.specialHandleCall=null;
            this.nativePhone?.reportCallEnded(callUUID,'Failed','local')
            this.emitCallError({code: error instanceof TypeError ? 'INVALID_NUMBER' : 'UNKNOWN'})
            return
        }
        
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
        this.specialHandleCall=null;
    

    }

    checkIfStringHandle(handle:string){

        if( Platform.OS==='ios') {
            return false
        }

        // check if the handle contains only numbers and * and #
        if (/^[0-9*#]+$/.test(handle)) {
            console.log("makeCall not string handle",handle);
            return false
        }
        console.log("makeCall string handle",handle);
        return true
    }


    // A new call only when there is no call at all: none in the store, and no
    // incoming call announced by push still waiting for its INVITE.
    canStartCall(){
        return this.callStore.callUUIDMap.size===0 && !this.pendingCall && !this.pendingOutgoingCall
    }

    // A second call only next to one call that is established.
    canAddCall(){
        const calls=this.callStore.getAllCalls()
        return calls.length===1 && calls[0].callStatus==='established'
    }

    async startCall(handle:string, name?:string, calldata?:string){
        if (!this.canStartCall()) return
        if (!(await this.requestMicPermission())) {
            this.emitCallError({code:'MIC_PERMISSION_DENIED'})
            return
        }
        if (!this.canStartCall()) return   // a call arrived while we waited
        this.makeCall(handle,name,calldata)
    }

    addCall(handle:string, name?:string, calldata?:string){
        if (!this.canAddCall()) return
        this.makeCall(handle,name,calldata)
    }

    makeCall(handle:string, name?:string, calldata?:string){

        // connecting/idle: start anyway, startedCall waits for SIP.
        if (this.sipStatus.state==='failed' || this.sipStatus.state==='disconnected') {
            this.emitCallError({code:'SIP_NOT_READY', sipStatus:this.sipStatus})
            return
        }
        const callUUID= getNewUuid();

        const isStringHandle=this.checkIfStringHandle(handle)
        if (isStringHandle) {
            this.specialHandleCall={
                handle,
                callUUID:callUUID
            }
        }

        if (calldata) {
            this.extraCallData={
                callUUID:callUUID,
                callData:calldata
            };
        }else{
            this.extraCallData=null;
        }

        // Hold the calls we already have *before* dialing the new one, so at
        // most one call is ever unheld.
        //
        // Android has been getting this implicitly: starting a second
        // connection makes Telecom call VoiceConnection.onHold() on the first.
        // CallKit has no equivalent, so on iOS both calls stayed unheld all the
        // way through ringing, and the moment the second one was reported
        // connected callservicesd saw two simultaneously connected, unheld
        // calls and committed its own CXEndCallAction to kill one of them.
        //
        // Doing it explicitly on both platforms rather than leaning on
        // Telecom: same code path everywhere, and the intent is stated instead
        // of inherited. Safe to repeat - RTCSession.hold() returns early when
        // the session is already held, and Telecom only asks for a state change
        // it hasn't got.
        //
        // The new call is not in the store yet (its session is created from
        // the native startCall action), so holdOtherCalls() with no session id
        // holds everything currently present. holdOtherCalls() runs again when
        // the new call establishes, so this only moves the hold earlier.
        this.holdOtherCalls()

        this.nativePhone?.startCall(callUUID,handle,name? name:handle)

    }


    async answeredCall(callUUID:string){

        if (!(await this.hasMicPermission())) {
            this.nativePhone?.endCall(callUUID)
            this.emitCallError({code:'MIC_PERMISSION_DENIED'})
            return
        }

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

        if (this.pendingOutgoingCall) {
            this.nativePhone?.endCall(this.pendingOutgoingCall.callUUID)
            return
        }

        if(!this.focusedCallUUID){
            this.nativePhone?.clear()
            return
        }
        this.nativePhone?.endCall(this.focusedCallUUID)
    }



    endCallByUUID(callUUID:string){

        // Cancelled while waiting for SIP: nothing was dialled yet.
        if (this.pendingOutgoingCall?.callUUID===callUUID) {
            this.clearPendingOutgoingCall()
            this.emit('callPending',this.pendingCall)
            return
        }

        if (this.pendingCallTimeout&& this.pendingCall&& this.pendingCall.callUUID===callUUID) {
            this.pendingCall=undefined
            BackgroundTimer.clearTimeout(this.pendingCallTimeout)
            this.pendingCallTimeout=undefined
            this.emit('callPending',this.pendingCall)
            return
        }

        const call=this.callStore.getCallByCallUUID(callUUID);
        if (call) {

            // check if the call is established
            if (call?.callStatus==='established') {
                this.sipClient.endCall(call.sessionId)
            }else{
                this.sipClient.endCall(call.sessionId,"Busy Here",486)
            }
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

    preLaunchStartCall(_handle:string,_callUUID:string,_name:string){
        // no-op stub for self-managed test; APP wires contact resolution here
    }

    reportCallError(error:unknown){
        console.warn('callService.reportCallError', error);
    }

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
            this.stopCallService()
           
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

    // sessionId omitted = hold every call in the store (used at dial time,
    // before the new call's session exists).
    holdOtherCalls(sessionId?:string){
        const calls= this.callStore.getAllCalls();
        if (!calls.length) return

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



