"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const callService_1 = __importDefault(require("../services/callService"));
exports.default = async (remoteMessage) => {
    const { a: additionalData, i } = await JSON.parse(remoteMessage.data.custom);
    console.log('====================================');
    console.log({ remoteMessage });
    console.log('====================================');
    callService_1.default.onIncomingFcmCall(additionalData.uuid, additionalData.handle, additionalData.callerName);
    return Promise.resolve();
};
