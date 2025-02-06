export default class Contact {
    company: any;
    contactType: any;
    displayName: any;
    emailAddresses: any;
    familyName: any;
    givenName: any;
    hasThumbnail: any;
    imAddresses: any;
    jobTitle: any;
    middleName: any;
    note: any;
    phoneNumbers: any;
    postalAddresses: any;
    recordID: any;
    thumbnailPath: any;
    urlAddresses: any;
    constructor(company: any, emailAddresses: any, familyName: any, givenName: any, hasThumbnail: any, imAddresses: any, jobTitle: any, middleName: any, phoneNumbers: any, postalAddresses: any, recordID: any, thumbnailPath: any, urlAddresses: any, contactType: any, note: any, name?: any);
    get key(): any;
    get value(): any;
    get searchTerms(): string;
}
