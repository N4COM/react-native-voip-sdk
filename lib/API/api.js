"use strict";
// const baseURL = 'https://alpitour-test.n4com.com/api';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.customFetch = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const getBaseURL = async () => {
    const isDev = await async_storage_1.default.getItem('isDev');
    const url = 'https://middleware.n4com.com/api/pbx/v1/users/me';
    return url;
};
const waitForToken = async (maxRetries = 3, retryDelay = 500) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        // const token = await async_storage_1.default.getItem('N4COM_TOKEN');
        const token = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjVlNzU2OTk2MDAxMDYwZDViNGE0ZDNkYTQ3NGI3YzkxZTY2YjA0NmY4NmE5NGZhYmVlZTNjMThkNGZlZTY3MTI0MWFhZmRhODkyMWI5ZTk2In0.eyJhdWQiOiIxMiIsImp0aSI6IjVlNzU2OTk2MDAxMDYwZDViNGE0ZDNkYTQ3NGI3YzkxZTY2YjA0NmY4NmE5NGZhYmVlZTNjMThkNGZlZTY3MTI0MWFhZmRhODkyMWI5ZTk2IiwiaWF0IjoxNzczMDcxNTQ2LCJuYmYiOjE3NzMwNzE1NDYsImV4cCI6MTg1OTQ3MTU0Niwic3ViIjoiMTgzIiwic2NvcGVzIjpbInBieCJdfQ.K3AF6f7Zz-fWuuWzu6IA5bRpdt461nqlsJViaBr627ZeVBNzTUHMpTZNDDDXwJr7W6gBh5kvMTJ9lmVmMtQ8p3tBDmU0xcHkOB7ffirzQr0nCIe0Ax26b10a6ttv2wbMJjUDA6sYAAqG_nuApTaAmzI83TamyF06kztfQQN8ovpWRHzblifiregD4Iap8Uol3hNvQ-ygZdScmbWqXMrRE7ClgePbYsv20kuTuixDiuEs3laT5FE3HZkRSyt5R21FruiMFLB3vg7yYCRVZZTSz6gX9mpEDU_7iGQR1WDwXA-XBGYBK4X7rB-jxaoOueFy_Rk9Gx-ySm5YgN1qY6kI0dVwVmmXicWb_d6xaevP8GLASWEOFN7fSEpCIN0huf0TcTfdRJQ54OZiWVBdJrU6YSWgS9aVVCo3C6UsfbXUn1C4zWXgSeOiwWjvh0_QgSBqfbg0A_xF5HLPv26fHLwrWdT8hEcHu0RspNSH9f5PFPTQPYz9t7AX64eHyWkFTsoYjFJrKjd_S90OaiZ8KfW2sZ3WyGd_xr0J3Z6CcWbuTZ-43a2FeH3hkI335K6rHXKcgEiUJIJYPO5veRC8XI93QT5y3e6eGqEzGSj0fgkCeMhbfT5m21UQ4mXooLdIUvRzoI9ZlaKPYd4hIDY9kD1RWYlcvNrVqdmahkGMhW0-7ms"

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
};
const updateHeaders = async (options, isTokenRequired = true) => {
    const myHeaders = new Headers({
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    });
    const token = await waitForToken();
    if (token) {
        myHeaders.set('Authorization', `Bearer ${token}`);
    }
    return { ...options, headers: myHeaders };
};
const customFetch = async (path, options, isTokenRequired = true) => {
    const baseUrl = await getBaseURL();
    const fetchOptions = await updateHeaders(options, isTokenRequired);
    return fetch(baseUrl + path, fetchOptions);
};
exports.customFetch = customFetch;
