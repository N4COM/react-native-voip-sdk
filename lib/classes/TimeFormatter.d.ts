declare class TimeFormatter {
    callDate: any;
    dayDifference: any;
    language: any;
    constructor(timeStamp: any, language: any);
    getDayDifference(timeStamp: any): number;
    getDateYYYYMMDD(): string;
    getWeekDay(): any;
    getDateHHMM(): string;
    recentCallCardFormat(): any;
    recentDetailsFormat(): string;
}
export default TimeFormatter;
