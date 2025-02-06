"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TimeFormatter = /** @class */ (function () {
    function TimeFormatter(timeStamp, language) {
        this.callDate = new Date(timeStamp);
        this.dayDifference = this.getDayDifference(timeStamp);
        this.language = language;
    }
    TimeFormatter.prototype.getDayDifference = function (timeStamp) {
        var callDateFirstHour = new Date(timeStamp);
        var nowDateFirstHour = new Date();
        nowDateFirstHour.setHours(0, 0, 0);
        callDateFirstHour.setHours(0, 0, 0);
        return nowDateFirstHour.getTime() - callDateFirstHour.getTime();
    };
    TimeFormatter.prototype.getDateYYYYMMDD = function () {
        return "".concat(this.callDate.getDate(), "/").concat(this.callDate.getMonth() + 1, "/").concat(this.callDate.getFullYear());
    };
    TimeFormatter.prototype.getWeekDay = function () {
        var giornoDellaSettimana = {
            '0': 'Dominica',
            '1': 'Lunedi',
            '2': 'Martedi',
            '3': 'Mercoledi',
            '4': 'Giovedi',
            '5': 'Venerdi',
            '6': 'Sabato'
        };
        var dayOfWeek = {
            '0': 'Sunday',
            '1': 'Monday',
            '2': 'Tuesday',
            '3': 'Wednesday',
            '4': 'Thursday',
            '5': 'Friday',
            '6': 'Saturday'
        };
        var dayKey = new String(this.callDate.getDay());
        // @ts-expect-error TS(2538): Type 'String' cannot be used as an index type.
        return this.language.substring(0, 2) === 'it' ? giornoDellaSettimana[dayKey] : dayOfWeek[dayKey];
    };
    TimeFormatter.prototype.getDateHHMM = function () {
        return "".concat(this.callDate.getHours(), ":").concat(this.callDate.getMinutes() > 9 ? this.callDate.getMinutes() : '0' + this.callDate.getMinutes());
    };
    TimeFormatter.prototype.recentCallCardFormat = function () {
        if (this.dayDifference >= 6.048e+8) {
            return this.getDateYYYYMMDD();
        }
        if (this.dayDifference >= 1.728e+8) {
            return this.getWeekDay();
        }
        if (this.dayDifference >= 8.64e+7) {
            return this.language.substring(0, 2) === 'it' ? 'Ieri' : 'Yesterday';
        }
        return this.getDateHHMM();
    };
    TimeFormatter.prototype.recentDetailsFormat = function () {
        if (this.dayDifference >= 1.728e+8) {
            return this.getDateYYYYMMDD();
        }
        if (this.dayDifference >= 8.64e+7) {
            return this.language.substring(0, 2) === 'it' ? 'Ieri' : 'Yesterday';
        }
        return this.language.substring(0, 2) === 'it' ? 'Oggi' : 'Today';
    };
    return TimeFormatter;
}());
exports.default = TimeFormatter;
