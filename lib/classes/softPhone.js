"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jssip_1 = __importDefault(require("jssip"));
class SoftPhone {
    constructor(userName, password, realm, ownerID, webSocket, sipOptions = {}) {
        this.userName = userName;
        this.password = password;
        this.realm = realm;
        this.ua = null;
        this.webSocket = webSocket,
            this.ownerID = ownerID,
            this.sipOptions = sipOptions;
        this.configUA();
    }
    configUA() {
        let socket = new jssip_1.default.WebSocketInterface(`${this.webSocket}`);
        let configuration = {
            sockets: [socket],
            uri: `sip:${this.userName}@${this.realm}`,
            password: this.password,
        };
        // Left unset, JsSIP falls back to its own defaults.
        if (this.sipOptions.userAgent) {
            configuration.user_agent = this.sipOptions.userAgent;
        }
        if (this.sipOptions.noAnswerTimeout != null) {
            configuration.no_answer_timeout = this.sipOptions.noAnswerTimeout;
        }
        this.ua = new jssip_1.default.UA(configuration);
    }
}
exports.default = SoftPhone;
