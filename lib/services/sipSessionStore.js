"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSipSession = exports.saveSipSession = exports.loadSipSession = exports.isUsableSipCredentials = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const SIP_SESSION_STORAGE_KEY = '@voip-sdk/sipSession';
function isUsableSipCredentials(credentials) {
    return !!(credentials
        && credentials.id
        && credentials.userName
        && credentials.password
        && credentials.realm
        && credentials.webSocket);
}
exports.isUsableSipCredentials = isUsableSipCredentials;
async function loadSipSession() {
    var _a;
    try {
        const raw = await async_storage_1.default.getItem(SIP_SESSION_STORAGE_KEY);
        if (!raw) {
            return undefined;
        }
        const session = JSON.parse(raw);
        if (!isUsableSipCredentials(session === null || session === void 0 ? void 0 : session.credentials)) {
            return undefined;
        }
        return {
            credentials: session.credentials,
            contactParams: (_a = session.contactParams) !== null && _a !== void 0 ? _a : {},
        };
    }
    catch (error) {
        console.log('loadSipSession error', error);
        return undefined;
    }
}
exports.loadSipSession = loadSipSession;
async function saveSipSession(session) {
    try {
        await async_storage_1.default.setItem(SIP_SESSION_STORAGE_KEY, JSON.stringify(session));
    }
    catch (error) {
        console.log('saveSipSession error', error);
    }
}
exports.saveSipSession = saveSipSession;
async function clearSipSession() {
    try {
        await async_storage_1.default.removeItem(SIP_SESSION_STORAGE_KEY);
    }
    catch (error) {
        console.log('clearSipSession error', error);
    }
}
exports.clearSipSession = clearSipSession;
