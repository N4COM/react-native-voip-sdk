import OneSignal from 'react-native-onesignal';
// import {Env} from '../constants/Env';
// import * as SecureStore from 'expo-secure-store';

const baseURL = 'https://middleware.n4com.com/api/pbx/v1';



const updateHeaders = async (options: any, isTokenRequired =true) => {

    const myHeaders = new Headers({
        'Accept':'application/json',
        'Content-Type':'application/json',
    });
    try {
        const deviceState = await OneSignal.getDeviceState();
        if (deviceState?.userId) {
            myHeaders.append('X-Device-Id',deviceState.userId);
        }
    }  catch (error) {
        console.log(error);
    }
    try{
        if (isTokenRequired) {
            // const value = await SecureStore.getItemAsync('N4COM_TOKEN');
            const value = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjBlMjk2OTU0ZDc4NDI3MzYxY2Q5ZGFmZDNlNTZhNmQ4ZWY3ZGRiNzI1MzA4ZDM2ZTk0Mzg0Zjc1NGJmMWQ4YWUxZGQ2Y2ZlMWVjZTJhY2NlIn0.eyJhdWQiOiIxMiIsImp0aSI6IjBlMjk2OTU0ZDc4NDI3MzYxY2Q5ZGFmZDNlNTZhNmQ4ZWY3ZGRiNzI1MzA4ZDM2ZTk0Mzg0Zjc1NGJmMWQ4YWUxZGQ2Y2ZlMWVjZTJhY2NlIiwiaWF0IjoxNzM4NjAwNjM3LCJuYmYiOjE3Mzg2MDA2MzcsImV4cCI6MTgyNTAwMDYzNiwic3ViIjoiMTgzIiwic2NvcGVzIjpbInBieCJdfQ.Qx_T8fuWxIT-yZdpEd05Vykl7_DU8SwxMs7HzjpQTdOUf4O53pN8IE_q8-zWed-sSIpYoDuZaSv_4JJfxBz7j1qJ_zP9Bmqi80oFxvojv2StPqo3UEga01DF7MzxEn60EzrA5nmY59pRaAqGmV7v1bCe7G18vo9RYCB5XGRbP5vXQLRgLELlimdbfkpp8sNL36S2bXFjNyJlee1GvMUEVhgVkFkdvRCrJiNvohxOWYhYaMx_DzzSHO8qcJNTMMVT6p_fXD0Cp1M8gr8zOqPZ0MGJkNyjPaeH8RsRpI8VG2Pn23_E88VnI08VL94Jtuux0vkiPN-5pg9xyP0UInJaTSaKo1gxxqamMLUwsLa0JDA8lI-Vn0ZadoOXLZH8UdIUpoZArGQKQsh-NvGP-3hS_xnH58GUKm4tyTvc15YeTQJ8KMVsLpPW4L_iQ3z-9j-IujEsRS3fCq-HqqHxTityipDVEZ1ckPWFwHbKmgXm2kvkG7uPwVfIvBhr01OW-K08lJdxYJFNOU4Z6l-E7NJvAxfupzVXkjQDPQsWOSZ7DQpznwJYFPPGu0MA8N_N8IQ0AMTWcvJNzWNK8g5hRiSquaFfMcrzMLz4esAZI_AtGsFlpedFZJRBupMSPajpyUhxZmminSrhlNoyy5YbFih5ZoZmkApfQz7OHNQ1SLWYjdY';
            if (value !== null) {
                myHeaders.append('Authorization',`Bearer ${value}`);
            }
        }
    } catch (error) {
        console.log(error);
    }
    return {...options, headers : myHeaders};
};


export const customFetch = async (path: any,options: any, isTokenRequired = true) => {

    const fetchOptions = await updateHeaders(options, isTokenRequired);
    return fetch(baseURL + path, fetchOptions);
};
