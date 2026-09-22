import React, { createContext,useContext,useEffect, useReducer, useState } from "react";
import { Call, PendingCall } from "../../services/callService";
import callService from "../../services/callService";
import BackgroundTimer from 'react-native-background-timer';
import { Alert, AppState } from "react-native";
import promptsInstance, { PromptsType } from "../../prompts";
import { VoipSdkConfig } from "../../types/config";


export type TransferType='blind'|'attended';
interface CallServiceContext{
    startCall:(handle:string,name?:string, calldata?:string)=>void;
    endCall:()=>void;
    holdCall:()=>void;
    swapCall:()=>void;
    stopCallService:()=>void;
    callState:Call[];
    pendingCall:PendingCall|Call|undefined;
    toggleMuteCall:()=>void;
    attendedTransferCall:(originCall:Call, targetCall:Call)=>void;
    blindTransferCall:(targetNumber:string)=>void;
    sendDTMF:(tones:string)=>void;
    setAudioRoute:(audioRoute:string)=>Promise<void>;
    getAudioRoutes:()=>Promise<void>;
    callServiceSipInitFailed:boolean;
    startCallService:(config:VoipSdkConfig)=>Promise<boolean|void>;
    setSdkStrings:(prompts:PromptsType)=>void;
}




const CallServiceContext= createContext<CallServiceContext|null>(null);

type CallAction={
    type:'ADD_CALL'|'REMOVE_CALL'|'MODIFY_CALL'
    payload:Call;
}

const callStore= (state:Call[],action:CallAction)=>{


    switch (action.type) {

        case 'ADD_CALL':
            return [...state,action.payload];
        case 'REMOVE_CALL':
            return state.filter((item) => item.sessionId !== action.payload.sessionId);
        case 'MODIFY_CALL':
            return state.map((item) => item.sessionId === action.payload.sessionId ? action.payload : item);
        default:
            return state;
    }

}



const CallServiceProvider= ({children}:{children:React.ReactNode}) => {



    const [callState,callDispatch] = useReducer(callStore, callService.callStore.getAllCalls());
    const [pendingCall, setPendingCall] = useState<PendingCall| Call | undefined>();
    const [callServiceSipInitFailed, setCallServiceSipInitFailed] = useState<boolean>(callService.sipServiceInitFailed);

  
    
    const startCall=(handle:string,name?:string, calldata?:string)=>{        
        callService.makeCall(handle,name,calldata);
    }

    const endCall=()=>{
        callService.terminateCall();
    }

    const holdCall=()=>{
        callService.toggleHoldCall();
    }

    const swapCall=()=>{
        callService.swapCall();
    }

    const toggleMuteCall=()=>{
        callService.muteCall();
    }

    const attendedTransferCall=(originCall:Call, targetCall:Call)=>{
       callService.attendedTransferCall(originCall, targetCall);
    
    }

    const blindTransferCall=(targetNumber:string)=>{
        callService.blindTransferCall(targetNumber);
    
    }

    const sendDTMF=(tones:string)=>{
        callService.sendDTMF(tones);
    }

    const getAudioRoutes=async ()=>{
        return await callService.getAudioRoutes();
    }

    const setAudioRoute=async (audioRoute:string)=>{
        await callService.setAudioRoute(audioRoute);
    }

    const startCallService= async (config:VoipSdkConfig)=>{
        return await callService.start(config);
    }

    const stopCallService=()=>{
        callService.stopCallService();
        callService.removeSipCredentials();
    }

    const setSdkStrings=(prompts:PromptsType)=>{
        callService.setSdkStrings(prompts);
    }


    useEffect(() => {

        callService.addListener('newCall',async (call:Call) => {
            callDispatch({type:'ADD_CALL',payload:call});
        })
    
        callService.addListener('callEnded', (call:Call) => {
        
            let timeout=0;
            if (call.endReason) {
                callDispatch({type:'MODIFY_CALL',payload:call})
                timeout=2000;
            }
            BackgroundTimer.setTimeout(()=>{
                callDispatch({type:'REMOVE_CALL',payload:call});
            },timeout)

        })
    
       callService.addListener('callUpdated', (call:Call) => {
            callDispatch({type:'MODIFY_CALL',payload:call});
       })

       callService.addListener('callPending', (call:PendingCall|Call|undefined) => {
            setPendingCall(call);        
       });
    
       callService.addListener('sipServiceFailed', () => {
            setCallServiceSipInitFailed(true);
       });

       // A call can fail while the app is not in the foreground: the
       // pending-call timeout is armed with BackgroundTimer precisely so it
       // still fires there. Presenting an Alert in that state strands it. On
       // iOS RCTAlertController puts the alert in a UIWindow of its own at
       // UIWindowLevelAlert+1 and makes it key, and that window is released
       // only from a button's action handler. An alert nobody is there to
       // dismiss is therefore a window that is never released: it sits above
       // the app at alert level with a bare root view controller, and the
       // status bar - which iOS lays out from the topmost window - is left
       // with chrome that does not belong to the app.
       //
       // So hold the notice while we are away and raise it on the next
       // foreground, where the user can actually dismiss it.
       let deferredFailure: string | undefined;

       const presentCallFailedAlert = (which: string) => {
            const prompts=promptsInstance.getPrompts()
            Alert.alert(prompts.callFailed.title, prompts.callFailed.body, [
                {text: prompts.callFailed.buttons.ok, onPress: () => {
                    console.log(`${which} button pressed`);
                }},
             ]);
       };

       const reportCallFailed = (which: string) => {
            // 'inactive' counts as away: the alert window is stranded just the
            // same when the app is mid-transition or behind the CallKit UI.
            if (AppState.currentState === 'active') {
                presentCallFailedAlert(which)
                return
            }
            // Both events raise the same alert, so several failures while we
            // are away coalesce into the one notice shown on return.
            deferredFailure = which
       };

       const appStateSubscription = AppState.addEventListener('change', (next) => {
            if (next !== 'active' || deferredFailure === undefined) return
            const which = deferredFailure
            deferredFailure = undefined
            presentCallFailedAlert(which)
       });

       callService.addListener('callFailed', () => {
            reportCallFailed('Call Failed')
       });

       callService.addListener('outgoingCallFailed', () => {
            reportCallFailed('Outgoing Call Failed')
       });

        return () => {
          callService.removeAllListeners('newCall');
          callService.removeAllListeners('callEnded');
          callService.removeAllListeners('callUpdated');
          callService.removeAllListeners('callPending'); 
          callService.removeAllListeners('sipServiceFailed'); 
          callService.removeAllListeners('callFailed');  
          callService.removeAllListeners('outgoingCallFailed');
          appStateSubscription.remove();
        }
    
      }, [])




    return (
        <CallServiceContext.Provider value={{
            startCall,endCall,holdCall,swapCall,toggleMuteCall
            ,attendedTransferCall,blindTransferCall,sendDTMF,
            setAudioRoute,getAudioRoutes,pendingCall,
            callState,callServiceSipInitFailed,startCallService,stopCallService,setSdkStrings}}>
            {children}
        </CallServiceContext.Provider>
    )


}



export const useCallService=()=>{
    return useContext(CallServiceContext);
}


export default CallServiceProvider;


