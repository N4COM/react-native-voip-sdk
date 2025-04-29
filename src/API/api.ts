
const baseURL = 'https://alpitour-test.n4com.com/api';




const updateHeaders = async (options: any, isTokenRequired =true) => {

    const myHeaders = new Headers({
        'Accept':'application/json',
        'Content-Type':'application/json',
    });

    return {...options, headers : { ...options.headers, ...myHeaders}};
};


export const customFetch = async (path: any,options: any, isTokenRequired = true) => {

    const fetchOptions = await updateHeaders(options, isTokenRequired);
    return fetch(baseURL + path, fetchOptions);
};
