declare class SoftPhone {
    ownerID: any;
    password: any;
    realm: any;
    ua: any;
    userName: any;
    webSocket: any;
    constructor(userName: any, password: any, realm: any, ownerID: any, webSocket: any);
    configUA(): void;
}
export default SoftPhone;
