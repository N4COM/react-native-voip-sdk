// const baseURL = 'https://alpitour-test.n4com.com/api';

import AsyncStorage from "@react-native-async-storage/async-storage";

const getBaseURL=async ()=>{
    const isDev=await AsyncStorage.getItem('isDev')
    const url = isDev ? 'https://alpitour-test.n4com.com/api' : 'https://alpitour.n4com.com/api'
    return url
}

const waitForToken=async (maxRetries = 3, retryDelay = 500): Promise<string | null>=>{
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        const token = await AsyncStorage.getItem('token');
        if (token) {
            return token;
        }
        // Don't wait after the last attempt
        if (attempt < maxRetries) {
            // Optional: log retry attempt
            console.log(`Token not found (attempt ${attempt}/${maxRetries}). Retrying in ${retryDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
    }
    // Optional: log failure after all retries
    console.log(`Failed to get token after ${maxRetries} attempts.`);
    return null;
}

const updateHeaders = async (options: any, isTokenRequired =true) => {

    const myHeaders = new Headers({
        'Accept':'application/json',
        'Content-Type':'application/json',
    });

    const token=await waitForToken()
    if (token) {
        myHeaders.set('Authorization',`Bearer ${token}`)
    }

    return {...options, headers : { ...options.headers, ...myHeaders}};
};


export const customFetch = async (path: any,options: any, isTokenRequired = true) => {

    const baseUrl = await getBaseURL();
    const fetchOptions = await updateHeaders(options, isTokenRequired);
    return fetch(baseUrl + path, fetchOptions);
};
