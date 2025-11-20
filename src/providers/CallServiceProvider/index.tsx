import React, { createContext,useContext,useEffect, useReducer, useState } from "react";
import { Call, PendingCall } from "../../services/callService";
import callService from "../../services/callService";
import BackgroundTimer from 'react-native-background-timer';
import { Alert, Platform } from "react-native";
import promptsInstance, { PromptsType } from "../../prompts";


export type TransferType='blind'|'attended';
export type AnalyticsOptions={
    isEnabled:true,
    userId:string,
    properties:Record<string, any>
} | {
    isEnabled:false,
} 
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
    initiateCallService:(token:string , isDev?:boolean)=>void;
    setPermissionsPrompts:(prompts:PromptsType)=>void;
    enableAnalytics:(options : AnalyticsOptions)=>void;
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
        console.log("startCall from provider",handle,name);
        //  make the handle follow the format 'sip:handle@alpitour-test.n4com.com'

        if (!handle.startsWith('sip:') && Platform.OS === 'android') {
            handle = `sip:${handle}@alpitour-test.n4com.com`;
        }
        
        console.log("handle after formatting",handle);
        
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

    const initiateCallService= async (token:string , isDev?:boolean)=>{
        await callService.start(token, isDev);        
    }


    const enableAnalytics=(options:AnalyticsOptions)=>{
        if (options.isEnabled) {
            callService.analyticsService.enableAnalytics(true);
            callService.analyticsService.identify(options.userId, options.properties);
        }
        else {
            callService.analyticsService.enableAnalytics(false);
            callService.analyticsService.resetAnalytics();
        }
    }

    const stopCallService=()=>{
        callService.stopCallService();
        callService.removeSipCredentials();
    }

    const setPermissionsPrompts=(prompts:PromptsType)=>{
        callService.setPermissionsPrompts(prompts);
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

       callService.addListener('callFailed', () => {
            const prompts=promptsInstance.getPrompts()
            Alert.alert(prompts.callFailed.title, prompts.callFailed.body, [
                {text: prompts.callFailed.buttons.ok, onPress: () => {
                    console.log("Call Failed button pressed");
                }},
             ]);
       });

       callService.addListener('outgoingCallFailed', () => {
            const prompts=promptsInstance.getPrompts()
             Alert.alert(prompts.callFailed.title, prompts.callFailed.body, [
                {text: prompts.callFailed.buttons.ok, onPress: () => {
                    console.log("Outgoing Call Failed button pressed");
                }},
             ]);
       });

        return () => {
          callService.removeAllListeners('newCall');
          callService.removeAllListeners('callEnded');
          callService.removeAllListeners('callUpdated');
          callService.removeAllListeners('callPending'); 
          callService.removeAllListeners('sipServiceFailed'); 
          callService.removeAllListeners('callFailed');  
        }
    
      }, [])




    return (
        <CallServiceContext.Provider value={{
            startCall,endCall,holdCall,swapCall,toggleMuteCall
            ,attendedTransferCall,blindTransferCall,sendDTMF,
            setAudioRoute,getAudioRoutes,pendingCall,
            callState,callServiceSipInitFailed,initiateCallService,stopCallService,setPermissionsPrompts,enableAnalytics}}>
            {children}
        </CallServiceContext.Provider>
    )


}



export const useCallService=()=>{
    return useContext(CallServiceContext);
}


export default CallServiceProvider;


