"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCallService = void 0;
const react_1 = __importStar(require("react"));
const callService_1 = __importDefault(require("../../services/callService"));
const react_native_background_timer_1 = __importDefault(require("react-native-background-timer"));
const react_native_1 = require("react-native");
const prompts_1 = __importDefault(require("../../prompts"));
const CallServiceContext = (0, react_1.createContext)(null);
const callStore = (state, action) => {
    switch (action.type) {
        case 'ADD_CALL':
            return [...state, action.payload];
        case 'REMOVE_CALL':
            return state.filter((item) => item.sessionId !== action.payload.sessionId);
        case 'MODIFY_CALL':
            return state.map((item) => item.sessionId === action.payload.sessionId ? action.payload : item);
        default:
            return state;
    }
};
const CallServiceProvider = ({ children }) => {
    const [callState, callDispatch] = (0, react_1.useReducer)(callStore, callService_1.default.callStore.getAllCalls());
    const [pendingCall, setPendingCall] = (0, react_1.useState)();
    const [callServiceSipInitFailed, setCallServiceSipInitFailed] = (0, react_1.useState)(callService_1.default.sipServiceInitFailed);
    const startCall = (handle, name, calldata) => {
        callService_1.default.makeCall(handle, name, calldata);
    };
    const endCall = () => {
        callService_1.default.terminateCall();
    };
    const holdCall = () => {
        callService_1.default.toggleHoldCall();
    };
    const swapCall = () => {
        callService_1.default.swapCall();
    };
    const toggleMuteCall = () => {
        callService_1.default.muteCall();
    };
    const attendedTransferCall = (originCall, targetCall) => {
        callService_1.default.attendedTransferCall(originCall, targetCall);
    };
    const blindTransferCall = (targetNumber) => {
        callService_1.default.blindTransferCall(targetNumber);
    };
    const sendDTMF = (tones) => {
        callService_1.default.sendDTMF(tones);
    };
    const getAudioRoutes = async () => {
        return await callService_1.default.getAudioRoutes();
    };
    const setAudioRoute = async (audioRoute) => {
        await callService_1.default.setAudioRoute(audioRoute);
    };
    const startCallService = async (config) => {
        return await callService_1.default.start(config);
    };
    const stopCallService = () => {
        callService_1.default.stopCallService();
        callService_1.default.removeSipCredentials();
    };
    const setSdkStrings = (prompts) => {
        callService_1.default.setSdkStrings(prompts);
    };
    (0, react_1.useEffect)(() => {
        callService_1.default.addListener('newCall', async (call) => {
            callDispatch({ type: 'ADD_CALL', payload: call });
        });
        callService_1.default.addListener('callEnded', (call) => {
            let timeout = 0;
            if (call.endReason) {
                callDispatch({ type: 'MODIFY_CALL', payload: call });
                timeout = 2000;
            }
            react_native_background_timer_1.default.setTimeout(() => {
                callDispatch({ type: 'REMOVE_CALL', payload: call });
            }, timeout);
        });
        callService_1.default.addListener('callUpdated', (call) => {
            callDispatch({ type: 'MODIFY_CALL', payload: call });
        });
        callService_1.default.addListener('callPending', (call) => {
            setPendingCall(call);
        });
        callService_1.default.addListener('sipServiceFailed', () => {
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
        let deferredFailure;
        const presentCallFailedAlert = (which) => {
            const prompts = prompts_1.default.getPrompts();
            react_native_1.Alert.alert(prompts.callFailed.title, prompts.callFailed.body, [
                { text: prompts.callFailed.buttons.ok, onPress: () => {
                        console.log(`${which} button pressed`);
                    } },
            ]);
        };
        const reportCallFailed = (which) => {
            // 'inactive' counts as away: the alert window is stranded just the
            // same when the app is mid-transition or behind the CallKit UI.
            if (react_native_1.AppState.currentState === 'active') {
                presentCallFailedAlert(which);
                return;
            }
            // Both events raise the same alert, so several failures while we
            // are away coalesce into the one notice shown on return.
            deferredFailure = which;
        };
        const appStateSubscription = react_native_1.AppState.addEventListener('change', (next) => {
            if (next !== 'active' || deferredFailure === undefined)
                return;
            const which = deferredFailure;
            deferredFailure = undefined;
            presentCallFailedAlert(which);
        });
        callService_1.default.addListener('callFailed', () => {
            reportCallFailed('Call Failed');
        });
        callService_1.default.addListener('outgoingCallFailed', () => {
            reportCallFailed('Outgoing Call Failed');
        });
        return () => {
            callService_1.default.removeAllListeners('newCall');
            callService_1.default.removeAllListeners('callEnded');
            callService_1.default.removeAllListeners('callUpdated');
            callService_1.default.removeAllListeners('callPending');
            callService_1.default.removeAllListeners('sipServiceFailed');
            callService_1.default.removeAllListeners('callFailed');
            callService_1.default.removeAllListeners('outgoingCallFailed');
            appStateSubscription.remove();
        };
    }, []);
    return (<CallServiceContext.Provider value={{
            startCall, endCall, holdCall, swapCall, toggleMuteCall,
            attendedTransferCall, blindTransferCall, sendDTMF,
            setAudioRoute, getAudioRoutes, pendingCall,
            callState, callServiceSipInitFailed, startCallService, stopCallService, setSdkStrings
        }}>
            {children}
        </CallServiceContext.Provider>);
};
const useCallService = () => {
    return (0, react_1.useContext)(CallServiceContext);
};
exports.useCallService = useCallService;
exports.default = CallServiceProvider;
