"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-expect-error TS(7016): Could not find a declaration file for module 'jssi... Remove this comment to see the full error message
const jssip_1 = __importDefault(require("jssip"));
class SoftPhone {
    constructor(userName, password, realm, ownerID, webSocket) {
        this.userName = userName;
        this.password = password;
        this.realm = realm;
        this.ua = null;
        this.webSocket = webSocket,
            this.ownerID = ownerID,
            this.configUA();
    }
    configUA() {
        let socket = new jssip_1.default.WebSocketInterface(`${this.webSocket}`);
        let configuration = {
            sockets: [socket],
            uri: `sip:${this.userName}@${this.realm}`,
            password: this.password,
            'user_agent': 'Svoolaz 1.0.0',
            'no_answer_timeout': 180
        };
        this.ua = new jssip_1.default.UA(configuration);
    }
}
exports.default = SoftPhone;
