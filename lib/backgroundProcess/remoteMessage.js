"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_1 = require("react-native");
const callService_1 = __importDefault(require("../services/callService"));
const messaging_1 = __importDefault(require("@react-native-firebase/messaging"));
const remoteMessageHandler = async (remoteMessage) => {
    // const additionalData = remoteMessage.data;
    const {a:additionalData,i}=await JSON.parse(remoteMessage.data.custom);

    // callServiceInstance.onIncomingFcmCall(additionalData.uuid,additionalData.handle,additionalData.callerName);
    callService_1.default.onIncomingFcmCall(additionalData.uuid, additionalData.handle, additionalData.callerName);
    return Promise.resolve();
};
const backgroundMessageHandler = async () => {
    console.log('====================================');
    console.log('backgroundMessageHandler');
    console.log('====================================');
    if (react_native_1.Platform.OS !== 'android') {
        return;
    }
    (0, messaging_1.default)().setBackgroundMessageHandler(remoteMessageHandler);
};
exports.default = backgroundMessageHandler;
