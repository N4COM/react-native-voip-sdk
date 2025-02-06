"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerToken = void 0;
const react_native_onesignal_1 = __importDefault(require("react-native-onesignal"));
// import {Env} from '../constants/Env';
const registerToken = async (token, deviceType) => {
    console.log('====================================');
    console.log('registerToken');
    console.log('====================================');
    const deviceState = await react_native_onesignal_1.default.getDeviceState();
    console.log({ deviceState });
    // const data= Env.oneSignalApiData({
    //   app_id:"541ab59a-c9a9-4906-ace3-ddee1b3a5d58",
    //   identifier:token,
    //   device_type:deviceType,
    //   external_user_id:deviceState?.userId,
    // });
    const data = {
        app_id: "541ab59a-c9a9-4906-ace3-ddee1b3a5d58",
        identifier: token,
        device_type: deviceType,
        external_user_id: deviceState === null || deviceState === void 0 ? void 0 : deviceState.userId,
    };
    console.log({ data });
    try {
        const res = await fetch('https://onesignal.com/api/v1/players', {
            method: 'POST',
            headers: {
                'content-type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!res.ok) {
            const resData = await res.json();
            console.log(resData);
        }
    }
    catch (error) {
        console.log(error);
    }
};
exports.registerToken = registerToken;
