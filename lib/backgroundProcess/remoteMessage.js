"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_1 = require("react-native");
const callService_1 = __importDefault(require("../services/callService"));
let firebaseApp;
if (react_native_1.Platform.OS === 'android') {
    firebaseApp = require('@react-native-firebase/app');
}
const remoteMessageHandler = async (remoteMessage) => {
    const { a: additionalData, i } = await JSON.parse(remoteMessage.data.custom);
    console.log('====================================');
    console.log({ remoteMessage });
    console.log('====================================');
    callService_1.default.onIncomingFcmCall(additionalData.uuid, additionalData.handle, additionalData.callerName);
    return Promise.resolve();
};
const backgroundMessageHandler = async () => {
    if (react_native_1.Platform.OS !== 'android') {
        return;
    }
    firebaseApp.messaging().setBackgroundMessageHandler(remoteMessageHandler);
};
exports.default = backgroundMessageHandler;
