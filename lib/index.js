"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backgroundMessageHandler = exports.useCallService = void 0;
const CallServiceProvider_1 = __importDefault(require("./providers/CallServiceProvider"));
const CallServiceProvider_2 = require("./providers/CallServiceProvider");
Object.defineProperty(exports, "useCallService", { enumerable: true, get: function () { return CallServiceProvider_2.useCallService; } });
const remoteMessage_1 = __importDefault(require("./backgroundProcess/remoteMessage"));
exports.backgroundMessageHandler = remoteMessage_1.default;
exports.default = CallServiceProvider_1.default;
