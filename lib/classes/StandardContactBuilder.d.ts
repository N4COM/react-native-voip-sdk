import Contact from "./Contact";
declare class StandardContactBuilder {
    constructor();
    static buildContactsFromSharedContacts(contactsList: any): Contact[];
    static buildContactsFromLocalContacts(contactsList: any): any;
}
export default StandardContactBuilder;
