"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var helperFunctions_1 = require("../providers/ContactsProvider/helperFunctions");
var Contact_1 = __importDefault(require("./Contact"));
var StandardContactBuilder = /** @class */ (function () {
    function StandardContactBuilder() {
    }
    StandardContactBuilder.buildContactsFromSharedContacts = function (contactsList) {
        var standardContactsList = [];
        for (var key in contactsList) {
            var emails = (0, helperFunctions_1.convertEmails)(contactsList[key]);
            var numbers = (0, helperFunctions_1.convertNumbers)(contactsList[key]);
            standardContactsList.push(new Contact_1.default(contactsList[key].organization, emails, contactsList[key].surname, contactsList[key].name, false, [], contactsList[key].role, '', numbers, contactsList[key].address ? [{ label: "address", street: contactsList[key].address }] : [], contactsList[key].id, '', contactsList[key].webSite ? [{ url: contactsList[key].webSite }] : [], 'shared', contactsList[key].note));
        }
        return standardContactsList;
    };
    StandardContactBuilder.buildContactsFromLocalContacts = function (contactsList) {
        var standardContactsList = contactsList.map(function (item) {
            var _a;
            return new Contact_1.default(item.company ? item.company : '', item.emails ? item.emails : [], item.lastName ? item.lastName : '', item.firstName ? item.firstName : '', item.imageAvailable ? item.imageAvailable : '', item.instantMessageAddresses ? item.instantMessageAddresses : [], item.jobTitle ? item.jobTitle : '', item.middleName ? item.middleName : "", item.phoneNumbers ? item.phoneNumbers : [], item.addresses ? item.addresses : [], item.id, (_a = item.image) === null || _a === void 0 ? void 0 : _a.uri, item.urlAddresses ? item.urlAddresses : [], 'local', item.note ? item.note : '', item.name ? item.name : "");
        });
        return standardContactsList ? standardContactsList : [];
    };
    return StandardContactBuilder;
}());
exports.default = StandardContactBuilder;
