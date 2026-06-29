import BackgroundTimer from 'react-native-background-timer';
import SoftPhone from "../../classes/softPhone";
import { Call, CallServiceType } from "../callService";
import { SipCredentials } from "../../types/config";

const callOptions:any={
    'mediaConstraints' : { 'audio': true, 'video': false},
    'pcConfig': {
        'iceServers': [
          { 'urls': [
            'stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302'
        ] },
        ]
    }
}


function sipCallId(session:any, request?:any):string|undefined {
    return request?.call_id ?? session?._request?.call_id;
}



class SipClient {
  
    private sipUA: any;
    private callService: CallServiceType;
    private sessionMap:Map<string,any>=new Map();    
    private iceTimeOutId:number|null=null;
    private configurationParams:SipCredentials|undefined;
    private regFlag:boolean=false;
    public  isRegistered:boolean=false;



    constructor(callService:CallServiceType) {   
        this.callService = callService;
    }

    async registerClient(){
        if (this.sipUA && this.sipUA.isConnected()) {
            return;
        }

        const credentials= await this.callService.fetchSipCredentials();
        console.log('====================================');
        console.log('credentials',credentials);
        console.log('====================================');
        if(!credentials){
            console.log('====================================');
            console.log('credentials not found');
            console.log('====================================');
            this.callService.analyticsService.trackEvent('registerClientFailed');
            this.callService.onSipClientFailed();
            return          
        }
        const {ua}= new SoftPhone(credentials.userName, credentials.password, credentials.realm, credentials.ownerId, credentials.webSocket);
        this.configurationParams=credentials;
        this.sipUA=ua;
        this.init();
        this.registerEventsListeners();
        this.callService.setCallServiceDeviceId(credentials.id);
        this.customRegister();
    }

    async customRegister(){

        const registerCallback=()=>{

            if (this.regFlag) {
                return;
            }
            this.regFlag = true;
            
           this.sipUA.registrator().register();
           this.sipUA.removeListener("registered",registerCallback);
        }

        if(!this.sipUA){
            return;
        }

        const contactParams = this.callService.getSipContactParams();
        console.log('====================================');
        console.log('contactParams',contactParams);
        console.log('====================================');
        if (Object.keys(contactParams).length > 0) {
            this.sipUA.registrator().setExtraContactParams(contactParams);
        }

        if(this.sipUA.isConnected()){
            this.sipUA.registrator().register();
        }


        this.sipUA.on("registered",registerCallback);


    }

    init(){
 
        if (!this.sipUA) {
            console.log('====================================');
            console.log('sipUA not found');
            console.log('====================================');
            return;
        }
        const statusMap = { 0: 'STATUS_INIT', 1: 'STATUS_READY', 2: 'STATUS_USER_CLOSED', 3: 'STATUS_NOT_READY' };
        const closeTimerPending = this.sipUA._closeTimer !== null && this.sipUA._closeTimer !== undefined;
        console.log('====================================');
        console.log('[SipService.init] isConnected:', this.sipUA.isConnected(), '| UA status:', statusMap[this.sipUA.status as keyof typeof statusMap] ?? this.sipUA.status, '| closeTimer:', closeTimerPending ? 'PENDING (deferred disconnect!)' : 'null');
        console.log('====================================');
        if (this.sipUA.isConnected() && this.sipUA.status !== 2 /* STATUS_USER_CLOSED */) {
            console.log('[SipService.init] ✓ truly connected and ready → skipping start()');
            return;
        }
        if (this.sipUA.isConnected() && this.sipUA.status === 2) {
            console.log('[SipService.init] ⚠️  isConnected=true BUT status=USER_CLOSED — closeTimer pending → calling start() to force proper restart');
        }
        this.sipUA.start();
    }

 

    registerEventsListeners(){
        
        this.sipUA.on('connected', (e:any)=>console.log('connected'));
        this.sipUA.on('disconnected', (e:any)=>console.log('disconnected'));
        this.sipUA.on('registered', (e:any)=>{this.handleRegistration(e)});
        this.sipUA.on('unregistered', (e:any)=>{this.handleUnRegistration(e)});
        this.sipUA.on('registrationFailed', (e:any)=>{this.handleRegistrationFailed(e)});
        this.sipUA.on('newRTCSession', (e:any)=>{this.handleNewRTCSession(e)});
    }

    destroy(){
        this.sipUA && this.sipUA.stop();
    }

    removeCredentials(){
        this.configurationParams=undefined;
        this.sipUA=undefined;

    }


    handleRegistration(e:any){
        this.callService.onSipClientReady();
        this.isRegistered=true;
        this.callService.analyticsService.trackEvent('sipClientRegistered');
    }

    handleRegistrationFailed(e:any){
        this.isRegistered=false;
        this.callService.analyticsService.trackEvent('sipClientRegistrationFailed');
        this.callService.onSipClientFailed();
    }

    handleUnRegistration(e:any){
        // some logic here
        this.isRegistered=false;
        this.callService.canCall=false;
        this.callService.analyticsService.trackEvent('sipClientUnregistered');

        
    }

    handleNewRTCSession(sessionEvent:any){
        
        const {session}=sessionEvent;
        this.registerRTCSessionListeners(session);
        
        const callId = sipCallId(session, sessionEvent.request);

        if (!callId) {
            console.warn('handleNewRTCSession: missing SIP Call-ID');
            return;
        }

        this.sessionMap.set(callId,session);

        if (sessionEvent.originator === 'remote' ) {
            this.callService.onIncomingSipCall(sessionEvent);
            this.callService.analyticsService.trackEvent('sipIncomingCall',{callUUID:callId});
            return;
        }

        if (sessionEvent.originator === 'local') {
            this.callService.onSipLocalSessionCreated();
            this.callService.analyticsService.trackEvent('sipLocalSessionCreated');
            return;
        }

    }


    registerRTCSessionListeners(session:any){
        session.on('failed', (e:any)=>{this.handleFailedRTCSession(e)});
        session.on('ended', (e:any)=>{this.handleEndedRTCSession(e)});
        session.on('confirmed', (e:any)=>{this.handleConfirmedRTCSession(e)});
        session.on('icecandidate', (e:any)=>{this.handleIceCandidateRTCSession(e)});
        session.on('peerconnection', (e:any)=>{this.handlePeerConnectionRTCSession(e)});
        session.on('progress', (e:any)=>{this.handleProgressRTCSession(e)});
        session.on('accepted', (e:any)=>{this.handleAcceptedRTCSession(e)});
        session.on('sending', (e:any)=>{this.handleSendingRTCSession(e)});
        session.on('sdp', (e:any)=>{this.handleSdpRTCSession(e)});
    }


    handleFailedRTCSession(e:any){
        this.callService.onSipCallFailed(e);
        this.callService.analyticsService.trackEvent('sipCallFailed',{callUUID:e?.message?.call_id});
    }

    handleEndedRTCSession(e:any){
        this.callService.onSipCallEnded(e);
        this.callService.analyticsService.trackEvent('sipCallEnded',{callUUID:e?.message?.call_id});
    }

    handleConfirmedRTCSession(e:any){

        this.callService.onSipCallConfirmed(e);

    }

    handleIceCandidateRTCSession(e:any){

        if (this.iceTimeOutId) {
            BackgroundTimer.clearTimeout(this.iceTimeOutId);
        }
        //@ts-ignore
        this.iceTimeOutId = BackgroundTimer.setTimeout(e.ready, 500);
    }

    handlePeerConnectionRTCSession(e:any){
 
        // this.callService.onSipCallPeerConnection(e);
    }

    handleProgressRTCSession(e:any){

        this.callService.onSipCallProgress(e);
    }

    handleAcceptedRTCSession(e:any){

        if (this.iceTimeOutId) {
            BackgroundTimer.clearTimeout(this.iceTimeOutId);
            this.iceTimeOutId=null; 
        }
        this.callService.onSipCallAccepted(e);
    }

    handleSendingRTCSession(e:any){

    }

    handleSdpRTCSession(e:any){
 
    }


    answerCall(sessionId:string){ 

        console.log('====================================');
        console.log('answerCall in SipService',sessionId);
        console.log('====================================');

        const session=this.sessionMap.get(sessionId);
        console.log('====================================');
        console.log('session',session);
        console.log('====================================');
        if (session) {
            session.answer(callOptions);
        }
    }

    removeSession(sessionId:string){
   
        this.sessionMap.delete(sessionId);
    }

    endCall(sessionId:string,reason_phrase?:string, status_code?:number){

        this.callService.analyticsService.trackEvent('endCall',{callUUID:sessionId, reason_phrase, status_code});

        const session=this.sessionMap.get(sessionId);
        if (session) {
            try{
                if (!status_code || !reason_phrase) {
                    session.terminate()
                    return
                }                
                session.terminate({status_code:status_code||486,reason_phrase:reason_phrase||'Busy'});
            }catch(e){
                console.log('====================================');
                console.log('error in endCall',e);
                console.log('====================================');
                this.callService.analyticsService.trackEvent('sipEndCallError',{callUUID:sessionId});
                // this.callService.reportCallError(e);
            }

        }
    }
    
    startCall(handle:string, extraCallData?:string){
        
        const options = {...callOptions}

        if (extraCallData) {
            options.extraHeaders=[`X-2X-CallData: ${extraCallData}`];
        }


        const session = this.sipUA.call(handle,options);

        const callId = sipCallId(session);

        if (callId) {
            this.sessionMap.set(callId, session);
            this.callService.analyticsService.trackEvent('sipStartCall', { callUUID: callId, handle });
        }

        return session;
    }

    holdCall(sessionId:string,isHeld:boolean){
        const session=this.sessionMap.get(sessionId);
        if (session) {
            isHeld? session.hold():session.unhold();
        }
    }

    muteCall(sessionId:string,isMuted:boolean){
        const session=this.sessionMap.get(sessionId);
        if (session) {
            isMuted? session.mute():session.unmute();
        }
    }


    attendedTransferCall(originCall:Call, targetCall:Call){

        try {
            const originSession=this.sessionMap.get(originCall.sessionId);
            const targetSession=this.sessionMap.get(targetCall.sessionId);
            if (originSession && targetSession) {
                originSession.refer(targetCall.handle,
                    {
                        'replaces':targetSession,
                        'mediaConstraints': {'audio': true, 'video': false},
                    });
            }            
        } catch (error) {
            console.log('====================================');
            console.log('error in attendedTransferCall',error);
            console.log('====================================');
            // this.callService.reportCallError(error);
        }

    }

    blindTransferCall(sessionId:string,handle:string){
        try {

            const session=this.sessionMap.get(sessionId);
            if (session&& this.configurationParams) {
                session.refer(handle,{
                    'extraHeaders': [`Referred-by: <sip:${this.configurationParams.userName}@${this.configurationParams.realm}>`]
                });
            }
            
        } catch (error) {
            
            console.log('====================================');
            console.log('error in blindTransferCall',error);
            console.log('====================================');
            // this.callService.reportCallError(error);
        }

    }

    sendDTMF(sessionId:string,dtmf:string){
        const session=this.sessionMap.get(sessionId);
        if (session) {
            session.sendDTMF(dtmf);
        }
    }

}


export default SipClient;