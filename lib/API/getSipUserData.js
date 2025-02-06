"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = require("./api");
exports.default = async () => {
    try {
        const response = await (0, api_1.customFetch)('/users/me/info', {
            method: 'GET'
        });
        if (!response.ok) {
            const resData = await response.json();
            throw new Error(resData.error);
        }
        const resData = await response.json();
        const sipUser = {
            email: resData.data.email,
            displayName: resData.data.first_name + ' ' + resData.data.last_name,
            displayNumber: resData.data.number,
            ownerID: resData.data.id
        };
        return sipUser;
    }
    catch (error) {
        console.log('get sip user error', error);
        throw error;
    }
};
