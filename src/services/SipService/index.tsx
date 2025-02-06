import { customFetch } from "../../API/api";
import SoftPhone from "../../classes/softPhone";
import { Call, CallServiceType } from "../callService";

const callOptions={
    'mediaConstraints' : { 'audio': true, 'video': false},
    'pcConfig': {
        'iceServers': [
          { 'urls': [
            'stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302'
        ] },
        ]
    }
}

const getSoftPhoneCredentials = async (): Promise< SoftPhoneCredentials |undefined> => {
    
    try {
        const response= await customFetch('/users/me/webphone',{
            method:'GET'
        })
        if (!response.ok) {
            const resData = await response.json()
            throw new Error(resData.error)
        }
        const resData= await response.json();
        const sipData={
            id:resData.data.id,
            password:resData.data.password,
            realm:resData.data.realm,
            userName:resData.data.username,
            displayName:resData.data.display_name,
            displayNumber:resData.data.display_number,
            ownerID:resData.data.owner_id,
            webSocket:resData.data.websocket
        }
        
        return{
            ...sipData
        }

    } catch (error) {
        console.log('====================================');
        console.log('getSoftPhoneCredentials error',error);
        console.log('====================================');
        return undefined
    }
   
}





type SoftPhoneCredentials = {
    id:string,
    displayName:string,
    displayNumber:string,
    userName: string,
    password: string,
    realm: string,
    ownerID: string,
    webSocket: string
}


class SipClient {
  
    private sipUA: any;
    private callService: CallServiceType;
    private sessionMap:Map<string,any>=new Map();    
    private iceTimeOutId:number|null=null;
    private configurationParams:SoftPhoneCredentials|undefined;

    public  isRegistered:boolean=false;
    
    constructor(callService:CallServiceType) {   
        this.callService = callService;
        this.registerClient();
        
    }

    async registerClient(){

        const credentials= await getSoftPhoneCredentials();
        if(!credentials){
            console.log('====================================');
            console.log('credentials not found');
            console.log('====================================');
            this.callService.onSipClientFailed();
            return          
        }
        const {ua,ownerID}= new SoftPhone(credentials.userName, credentials.password, credentials.realm, credentials.ownerID, credentials.webSocket);
        this.configurationParams=credentials;
        this.sipUA=ua;
        this.sipUA.registrator().setExtraContactParams({
            'app-id': "svoolaz",
            'pn-tok': ownerID,
            'pn-type': "n4com"  
        });
        this.init();
        this.registerEventsListeners();
        this.callService.setCallServiceDeviceId(credentials.id);
    }

    init(){

        console.log('====================================');
        console.log('init sip');
        console.log('====================================');
 
        if (!this.sipUA) {
            console.log('====================================');
            console.log('sipUA not found');
            console.log('====================================');
            return
            
        }

        this.sipUA.start();
    }

 

    registerEventsListeners(){
        
        this.sipUA.on('connected', (e:any)=>console.log('connected'));
        this.sipUA.on('disconnected', (e:any)=>console.log('disconnected'));
        this.sipUA.on('registered', (e:any)=>{this.handleRegistration(e)});
        this.sipUA.on('unregistered', (e:any)=>{this.handleUnRegistration(e)});
        this.sipUA.on('registrationFailed', (e:any)=>{this.handleRegistration(e)});
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
    }

    handleUnRegistration(e:any){
        
        // some logic here
        this.isRegistered=false;
        this.callService.canCall=false;
    }

    handleNewRTCSession(sessionEvent:any){
        
        const {session}=sessionEvent;
        this.registerRTCSessionListeners(session);
        

        this.sessionMap.set(sessionEvent.request.call_id,session);

        if (sessionEvent.originator === 'remote' ) {
            this.callService.onIncomingSipCall(sessionEvent);
            return;
        }

        if (sessionEvent.originator === 'local') {
            this.callService.onSipLocalSessionCreated();
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
        console.log('====================================');
        console.log('handleFailedRTCSession');
        console.log('====================================');
        this.callService.onSipCallFailed(e);
    
    }

    handleEndedRTCSession(e:any){
        console.log('====================================');
        console.log('handleEndedRTCSession');
        console.log('====================================');
        this.callService.onSipCallEnded(e);
    }

    handleConfirmedRTCSession(e:any){
        console.log('====================================');
        console.log('handleConfirmedRTCSession');
        console.log('====================================');
        this.callService.onSipCallConfirmed(e);

    }

    handleIceCandidateRTCSession(e:any){

        console.log('====================================');
        console.log('handleIceCandidateRTCSession');
        console.log('====================================');

        if (this.iceTimeOutId) {
            clearTimeout(this.iceTimeOutId);
        }
        //@ts-ignore
        this.iceTimeOutId= setTimeout(e.ready,500);
    }

    handlePeerConnectionRTCSession(e:any){
        console.log('====================================');
        console.log('handlePeerConnectionRTCSession');
        console.log('====================================');
        // this.callService.onSipCallPeerConnection(e);
    }

    handleProgressRTCSession(e:any){
        console.log('====================================');
        console.log('handleProgressRTCSession');
        console.log('====================================');
        this.callService.onSipCallProgress(e);
    }

    handleAcceptedRTCSession(e:any){
        console.log('====================================');
        console.log('handleAcceptedRTCSession');
        console.log('====================================');
        if (this.iceTimeOutId) {
            clearTimeout(this.iceTimeOutId);
            this.iceTimeOutId=null; 
        }
        this.callService.onSipCallAccepted(e);
    }

    handleSendingRTCSession(e:any){
        console.log('====================================');
        console.log('handleSendingRTCSession');
        console.log('====================================');
    }

    handleSdpRTCSession(e:any){
        console.log('====================================');
        console.log('handleSdpRTCSession');
        console.log('====================================');
    }


    answerCall(sessionId:string){ 
        console.log('====================================');
        console.log('answerCall',sessionId);
        console.log('====================================');
        const session=this.sessionMap.get(sessionId);
        if (session) {
            session.answer(callOptions);
        }
    }

    removeSession(sessionId:string){
        console.log('====================================');
        console.log('removeSession',sessionId);
        console.log('====================================');
        this.sessionMap.delete(sessionId);
    }

    endCall(sessionId:string){

        console.log('====================================');
        console.log('endCall',sessionId);
        console.log('====================================');

        const session=this.sessionMap.get(sessionId);
        if (session) {
            try{
                session.terminate({status_code:603,reason_phrase:'Decline'});
            }catch(e){
                console.log('====================================');
                console.log('error in endCall',e);
                console.log('====================================');
                // this.callService.reportCallError(e);
            }

        }
    }
    
    startCall(handle:string){
        console.log('====================================');
        console.log('startCall',handle);
        console.log('====================================');
        const session = this.sipUA.call(handle,callOptions);
        this.sessionMap.set(session._request.call_id,session);
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