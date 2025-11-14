"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_native_1 = require("react-native");
const callService_1 = __importDefault(require("../services/callService"));
const remoteMessageHandler = async (remoteMessage) => {
    const additionalData = remoteMessage.data;
    callService_1.default.onIncomingFcmCall(additionalData.uuid, additionalData.handle, additionalData.callerName);
    return Promise.resolve();
};
const backgroundMessageHandler = async () => {
    if (react_native_1.Platform.OS !== 'android') {
        return;
    }
};
exports.default = backgroundMessageHandler;
