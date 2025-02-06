"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCallService = void 0;
const CallServiceProvider_1 = __importDefault(require("./providers/CallServiceProvider"));
const CallServiceProvider_2 = require("./providers/CallServiceProvider");
Object.defineProperty(exports, "useCallService", { enumerable: true, get: function () { return CallServiceProvider_2.useCallService; } });
exports.default = CallServiceProvider_1.default;
