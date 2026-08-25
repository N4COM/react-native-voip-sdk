"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const posthog_react_native_1 = __importDefault(require("posthog-react-native"));
const API_1 = require("./API");
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
class AnalyticsService {
    constructor() {
        this.posthog = null;
        this.enabled = false;
        this.init();
    }
    static getInstance() {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }
    init() {
        try {
            this.posthog = new posthog_react_native_1.default(API_1.API_KEY, {
                host: API_1.API_HOST,
            });
        }
        catch (error) {
            console.warn('AnalyticsService: Failed to initialize PostHog', error);
        }
        async_storage_1.default.getItem('analyticsEnabled').then((analyticsEnabled) => {
            if (analyticsEnabled === 'true') {
                this.enabled = true;
                return;
            }
        });
    }
    enableAnalytics(enabled) {
        this.enabled = enabled;
        async_storage_1.default.setItem('analyticsEnabled', this.enabled.toString());
    }
    trackEvent(eventName, properties) {
        if (!this.enabled) {
            return;
        }
        const track = () => {
            try {
                if (this.posthog) {
                    this.posthog.capture(eventName, properties);
                }
            }
            catch (error) {
                console.warn('AnalyticsService: Failed to track event', error);
            }
        };
        // Use queueMicrotask if available, otherwise fallback to setTimeout
        if (typeof queueMicrotask !== 'undefined') {
            queueMicrotask(track);
        }
        else {
            setTimeout(track, 0);
        }
    }
    identify(userId, properties) {
        if (!this.enabled) {
            return;
        }
        if (this.posthog) {
            this.posthog.identify(userId, properties);
        }
    }
    resetAnalytics() {
        if (this.posthog) {
            this.posthog.reset();
        }
        async_storage_1.default.removeItem('analyticsEnabled');
    }
    captureException(error, context) {
        if (!this.enabled) {
            return;
        }
        if (this.posthog) {
            this.posthog.capture('error', {
                ...context,
                error_message: error.message,
                error_stack: error.stack || '',
            });
        }
    }
}
AnalyticsService.instance = null;
exports.default = AnalyticsService;
