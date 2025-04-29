"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customFetch = void 0;
const baseURL = 'https://alpitour-test.n4com.com/api';
const updateHeaders = async (options, isTokenRequired = true) => {
    const myHeaders = new Headers({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    });
    return { ...options, headers: { ...options.headers, ...myHeaders } };
};
const customFetch = async (path, options, isTokenRequired = true) => {
    const fetchOptions = await updateHeaders(options, isTokenRequired);
    return fetch(baseURL + path, fetchOptions);
};
exports.customFetch = customFetch;
