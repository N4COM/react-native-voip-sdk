declare class AnalyticsService {
    private posthog;
    private static instance;
    private constructor();
    static getInstance(): AnalyticsService;
    private init;
    trackEvent(eventName: string, properties?: Record<string, any>): void;
    identify(userId: string, properties?: Record<string, any>): void;
    captureException(error: Error, context?: Record<string, any>): void;
}
export default AnalyticsService;
