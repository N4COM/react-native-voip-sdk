"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var config_plugins_1 = require("@expo/config-plugins");
var ios_1 = require("./ios");
var Manifest_1 = require("@expo/config-plugins/build/android/Manifest");
var withCallkeep_js_1 = __importDefault(require("@config-plugins/react-native-callkeep/build/withCallkeep.js"));
var pak = require("react-native-voip-push-notification/package.json");
// Add push notification entitlement
var withPushNotification = function (config) {
    return (0, config_plugins_1.withEntitlementsPlist)(config, function (config) {
        if (!config.modResults["aps-environment"]) {
            config.modResults["aps-environment"] = "development";
        }
        return config;
    });
};
var withCallKeepFix = function (config) {
    return (0, config_plugins_1.withAndroidManifest)(config, function (config) { return __awaiter(void 0, void 0, void 0, function () {
        var app;
        return __generator(this, function (_a) {
            app = (0, Manifest_1.getMainApplicationOrThrow)(config.modResults);
            if (!Array.isArray(app.service)) {
                app.service = [];
            }
            if (!app.service.find(function (item) { return item.$["android:name"] === "io.wazo.callkeep.VoiceConnectionService"; })) {
                app.service.push({
                    $: {
                        "android:name": "io.wazo.callkeep.VoiceConnectionService",
                        "android:exported": "true",
                        // @ts-ignore
                        "android:label": "Wazo",
                        "android:permission": "android.permission.BIND_TELECOM_CONNECTION_SERVICE",
                        // Use this to target android >= 11
                        "android:foregroundServiceType": "camera|microphone",
                    },
                    "intent-filter": [
                        {
                            action: [
                                {
                                    $: {
                                        "android:name": "android.telecom.ConnectionService",
                                    },
                                },
                            ],
                        },
                    ],
                });
            }
            return [2 /*return*/, config];
        });
    }); });
};
// Compose multiple modifiers
var withVoipPush = function (config) {
    config = (0, ios_1.withIosAppDelegate)(config);
    config = withPushNotification(config);
    config = (0, withCallkeep_js_1.default)(config);
    config = withCallKeepFix(config);
    return config;
};
exports.default = (0, config_plugins_1.createRunOncePlugin)(withVoipPush, pak.name, pak.version);
