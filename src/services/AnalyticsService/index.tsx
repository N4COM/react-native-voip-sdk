import PostHog from 'posthog-react-native';
import { API_KEY, API_HOST } from './API';

class AnalyticsService {

    private posthog: PostHog | null = null;
    private static instance: AnalyticsService | null = null;
    public enabled:boolean=false

    private constructor() {
        this.init();
    }

    static getInstance(): AnalyticsService {
        if (!AnalyticsService.instance) {
            AnalyticsService.instance = new AnalyticsService();
        }
        return AnalyticsService.instance;
    }

    private init() {
        try {
            this.posthog = new PostHog(API_KEY, {
                host: API_HOST,
            });
        } catch (error) {
            console.warn('AnalyticsService: Failed to initialize PostHog', error);
        }
    }

    enableAnalytics(enabled:boolean) {
        this.enabled = enabled;
    }

    trackEvent(eventName: string, properties?: Record<string, any>) {

        if (!this.enabled) {
            return;
        }

        const track = () => {
            try {
                if (this.posthog) {
                    this.posthog.capture(eventName, properties);
                }
            } catch (error) {
                console.warn('AnalyticsService: Failed to track event', error);
            }
        };
    
        // Use queueMicrotask if available, otherwise fallback to setTimeout
        if (typeof queueMicrotask !== 'undefined') {
            queueMicrotask(track);
        } else {
            setTimeout(track, 0);
        }
    }

    identify(userId: string, properties?: Record<string, any>) {
        if (!this.enabled) {
            return;
        }

        if (this.posthog) {
            this.posthog.identify(userId, properties);
        }
    }

    resetAnalytics(){
        
        if (this.posthog) {
            this.posthog.reset();
        }
    }
        
    captureException(error: Error, context?: Record<string, any>) {
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


export default AnalyticsService;