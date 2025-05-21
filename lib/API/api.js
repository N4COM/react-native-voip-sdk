"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.customFetch = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
// let baseURL = 'https://alpitour-test.n4com.com/api';
const getBaseURL = async () => {
    const isDev = await async_storage_1.default.getItem('isDev');
    const url = isDev ? 'https://alpitour-test.n4com.com/api' : 'https://alpitour.n4com.com/api';
    return url;
};
const updateHeaders = async (options, isTokenRequired = true) => {
    const myHeaders = new Headers({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    });
    return { ...options, headers: { ...options.headers, ...myHeaders } };
};
const customFetch = async (path, options, isTokenRequired = true) => {
    const fetchOptions = await updateHeaders(options, isTokenRequired);
    const url = await getBaseURL();
    return fetch(url + path, fetchOptions);
};
exports.customFetch = customFetch;
