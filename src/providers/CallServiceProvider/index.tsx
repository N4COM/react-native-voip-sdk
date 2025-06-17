import React, { createContext,useContext,useEffect, useReducer, useState } from "react";
import { Call, PendingCall } from "../../services/callService";
import callService from "../../services/callService";
import BackgroundTimer from 'react-native-background-timer';
import { Alert } from "react-native";


export type TransferType='blind'|'attended';

interface CallServiceContext{
    startCall:(handle:string,name?:string)=>void;
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

    const initiateCallService=(token:string , isDev?:boolean)=>{
        callService.init(token, isDev);
    }

    const stopCallService=()=>{
        callService.stopCallService();
        callService.removeSipCredentials();
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
             Alert.alert("Call Failed");
       });

       callService.addListener('outgoingCallFailed', () => {
             Alert.alert("Outgoing Call Failed");
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
            callState,callServiceSipInitFailed,initiateCallService,stopCallService}}>
            {children}
        </CallServiceContext.Provider>
    )


}



export const useCallService=()=>{
    return useContext(CallServiceContext);
}


export default CallServiceProvider;


