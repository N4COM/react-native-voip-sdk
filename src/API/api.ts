import AsyncStorage from "@react-native-async-storage/async-storage";

// let baseURL = 'https://alpitour-test.n4com.com/api';

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

    const url = await getBaseURL()
    return fetch(url + path, fetchOptions);
};
