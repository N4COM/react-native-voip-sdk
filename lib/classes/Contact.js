"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var Contact = /** @class */ (function () {
    function Contact(company, emailAddresses, familyName, givenName, hasThumbnail, imAddresses, jobTitle, middleName, phoneNumbers, postalAddresses, recordID, thumbnailPath, urlAddresses, contactType, note, name) {
        this.company = company;
        this.emailAddresses = __spreadArray([], emailAddresses, true);
        this.familyName = familyName;
        this.givenName = givenName;
        this.hasThumbnail = hasThumbnail;
        this.imAddresses = __spreadArray([], imAddresses, true);
        this.jobTitle = jobTitle;
        this.middleName = middleName;
        this.phoneNumbers = __spreadArray([], phoneNumbers, true);
        this.postalAddresses = __spreadArray([], postalAddresses, true);
        this.recordID = recordID;
        this.thumbnailPath = thumbnailPath;
        this.urlAddresses = __spreadArray([], urlAddresses, true);
        this.note = note;
        this.contactType = contactType,
            this.displayName = name;
    }
    Object.defineProperty(Contact.prototype, "key", {
        get: function () {
            return this.recordID;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Contact.prototype, "value", {
        get: function () {
            var value = (this.givenName || this.middleName || this.familyName) && (!this.displayName)
                ? "".concat(this.givenName ? this.givenName + " " : "").concat(this.middleName ? this.middleName + " " : "").concat(this.familyName)
                : this.displayName
                    ? this.displayName
                    : this.company ? "".concat(this.company) :
                        this.phoneNumbers && this.phoneNumbers[0] && this.phoneNumbers[0].number ?
                            "".concat(this.phoneNumbers[0].number) : "";
            return value.trim();
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Contact.prototype, "searchTerms", {
        get: function () {
            var phoneNumbersStrings = this.phoneNumbers.map(function (item) { return item.number; }).join("");
            var emailAddressesStrings = this.emailAddresses.map(function (item) { return item.email; }).join("");
            return "".concat(this.displayName).concat(this.givenName).concat(this.middleName).concat(this.familyName).concat(this.company).concat(this.jobTitle).concat(phoneNumbersStrings).concat(emailAddressesStrings).replace(/\s/g, "");
        },
        enumerable: false,
        configurable: true
    });
    return Contact;
}());
exports.default = Contact;
