
// const baseURL = 'https://alpitour-test.n4com.com/api';

import AsyncStorage from "@react-native-async-storage/async-storage";

const getBaseURL=async ()=>{
    const isDev=await AsyncStorage.getItem('isDev')
    const url = isDev ? 'https://alpitour-test.n4com.com/api' : 'https://alpitour.n4com.com/api'
    return url
}


const updateHeaders = async (options: any, isTokenRequired =true) => {

    const myHeaders = new Headers({
        'Accept':'application/json',
        'Content-Type':'application/json',
    });

    return {...options, headers : { ...options.headers, ...myHeaders}};
};


export const customFetch = async (path: any,options: any, isTokenRequired = true) => {

    const fetchOptions = await updateHeaders(options, isTokenRequired);
    return fetch(getBaseURL() + path, fetchOptions);
};
