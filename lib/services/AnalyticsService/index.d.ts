declare class AnalyticsService {
    private posthog;
    private static instance;
    enabled: boolean;
    private constructor();
    static getInstance(): AnalyticsService;
    private init;
    enableAnalytics(enabled: boolean): void;
    trackEvent(eventName: string, properties?: Record<string, any>): void;
    identify(userId: string, properties?: Record<string, any>): void;
    resetAnalytics(): void;
    captureException(error: Error, context?: Record<string, any>): void;
}
export default AnalyticsService;
