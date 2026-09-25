import { SipOptions } from '../types/config';
declare class SoftPhone {
    ownerID: any;
    password: any;
    realm: any;
    ua: any;
    userName: any;
    webSocket: any;
    sipOptions: SipOptions;
    constructor(userName: any, password: any, realm: any, ownerID: any, webSocket: any, sipOptions?: SipOptions);
    configUA(): void;
}
export default SoftPhone;
