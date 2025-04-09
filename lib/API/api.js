"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customFetch = void 0;
const react_native_1 = require("react-native");
// import {Env} from '../constants/Env';
// import * as SecureStore from 'expo-secure-store';
// const baseURL = 'https://middleware.n4com.com/api/pbx/v1';
const baseURL = 'https://alpitour-test.n4com.com/api';
const jwtToken = react_native_1.Platform.OS === 'android' ? "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtpZHRlc3QifQ.eyJwcm9nQ29kIjoiNjU0MzIxIiwiYW5ub0NvZCI6IjIwMjEifQ.aiJKREEWh96gr_yEJdsJNjBzF7OvQ8Xqp6Wtoqf6A3tfDBXp45_LnoI2qHUI3NxKNqDeVWPScOUFIzffq7L2RoosujeGsUL1w2SZHe1Cl49x3SZNFfYdyzmPv4I8qbkV_y7l49EZus52zB6rku_q22FDF_8b_fH3qV1AOrhyRlCeDGKx4m_zYJwvhDN5QnPWO1HUCPtea0JoL7F8fidcvRWx8xkcrbftAn1tJedRj0_0vdr_oFdqWQHcqHlXrQn69LqBQC9PFHbztbhuIcc2sdTL9-7ztfbxJOYDx-lc8d_xS66YdmDnR-Z44aIeuL8l_z7EeVRs3ORnOMBNxERKaQ"
    : "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtpZHRlc3QifQ.eyJwcm9nQ29kIjoiMTIzNDU2IiwiYW5ub0NvZCI6IjIwMjEifQ.NibmyF2kqXwPcEqDemIDjr1G138uiBfUQXdX4PRkeYwoXjpZs1rrjVuS-7PWLNxynzZ_PjktY5K8nDr65-jVcuFzCNfCfyEa_rWzP0C-4nB_-R6YGpkFPB2_a_jHEFk5PDfWd9D0u4Xr0H0QjU-CbwrTVp1BDQl7givjS3XaLjaNnXJO6q45ptk2TA6wx47CueYf7T_U9RV1R2u09CeGcJ-roCPvXbv8JXJTBRF8kHvkDM1z1ZToBHPlLsuwSesMZX434j2NQkcT6nZmivE6eHHCPIku85O3CoQZlcas1olvQ7wKgLWYMLc0ZLurYUADG583FfMx96LVR2hSKSac7A";
const updateHeaders = async (options, isTokenRequired = true) => {
    const myHeaders = new Headers({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    });
    // try {
    //     const deviceState = await OneSignal.getDeviceState();
    //     if (deviceState?.userId) {
    //         myHeaders.append('X-Device-Id',deviceState.userId);
    //     }
    // }  catch (error) {
    //     console.log(error);
    // }
    try {
        if (isTokenRequired) {
            // const value = await SecureStore.getItemAsync('N4COM_TOKEN');
            // const value = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjBlMjk2OTU0ZDc4NDI3MzYxY2Q5ZGFmZDNlNTZhNmQ4ZWY3ZGRiNzI1MzA4ZDM2ZTk0Mzg0Zjc1NGJmMWQ4YWUxZGQ2Y2ZlMWVjZTJhY2NlIn0.eyJhdWQiOiIxMiIsImp0aSI6IjBlMjk2OTU0ZDc4NDI3MzYxY2Q5ZGFmZDNlNTZhNmQ4ZWY3ZGRiNzI1MzA4ZDM2ZTk0Mzg0Zjc1NGJmMWQ4YWUxZGQ2Y2ZlMWVjZTJhY2NlIiwiaWF0IjoxNzM4NjAwNjM3LCJuYmYiOjE3Mzg2MDA2MzcsImV4cCI6MTgyNTAwMDYzNiwic3ViIjoiMTgzIiwic2NvcGVzIjpbInBieCJdfQ.Qx_T8fuWxIT-yZdpEd05Vykl7_DU8SwxMs7HzjpQTdOUf4O53pN8IE_q8-zWed-sSIpYoDuZaSv_4JJfxBz7j1qJ_zP9Bmqi80oFxvojv2StPqo3UEga01DF7MzxEn60EzrA5nmY59pRaAqGmV7v1bCe7G18vo9RYCB5XGRbP5vXQLRgLELlimdbfkpp8sNL36S2bXFjNyJlee1GvMUEVhgVkFkdvRCrJiNvohxOWYhYaMx_DzzSHO8qcJNTMMVT6p_fXD0Cp1M8gr8zOqPZ0MGJkNyjPaeH8RsRpI8VG2Pn23_E88VnI08VL94Jtuux0vkiPN-5pg9xyP0UInJaTSaKo1gxxqamMLUwsLa0JDA8lI-Vn0ZadoOXLZH8UdIUpoZArGQKQsh-NvGP-3hS_xnH58GUKm4tyTvc15YeTQJ8KMVsLpPW4L_iQ3z-9j-IujEsRS3fCq-HqqHxTityipDVEZ1ckPWFwHbKmgXm2kvkG7uPwVfIvBhr01OW-K08lJdxYJFNOU4Z6l-E7NJvAxfupzVXkjQDPQsWOSZ7DQpznwJYFPPGu0MA8N_N8IQ0AMTWcvJNzWNK8g5hRiSquaFfMcrzMLz4esAZI_AtGsFlpedFZJRBupMSPajpyUhxZmminSrhlNoyy5YbFih5ZoZmkApfQz7OHNQ1SLWYjdY';
            if (jwtToken !== null) {
                myHeaders.append('Authorization', `Bearer ${jwtToken}`);
            }
        }
    }
    catch (error) {
        console.log(error);
    }
    return { ...options, headers: myHeaders };
};
const customFetch = async (path, options, isTokenRequired = true) => {
    const fetchOptions = await updateHeaders(options, isTokenRequired);
    return fetch(baseURL + path, fetchOptions);
};
exports.customFetch = customFetch;
