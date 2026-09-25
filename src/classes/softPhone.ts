import JsSIP from 'jssip';
import { SipOptions } from '../types/config';

class SoftPhone{
    ownerID: any;
    password: any;
    realm: any;
    ua: any;
    userName: any;
    webSocket: any;
    sipOptions: SipOptions;

    constructor(userName: any,password: any,realm: any,ownerID: any,webSocket: any,sipOptions: SipOptions = {}){
        this.userName=userName;
        this.password=password;
        this.realm= realm;
        this.ua=null;
        this.webSocket=webSocket,
        this.ownerID= ownerID,
        this.sipOptions= sipOptions;
        this.configUA()
    }

    configUA(){
        let socket= new JsSIP.WebSocketInterface(`${this.webSocket}`);
        let configuration: any= {
        sockets:[socket],
        uri: `sip:${this.userName}@${this.realm}`,
        password:this.password,
        }
        // Left unset, JsSIP falls back to its own defaults.
        if (this.sipOptions.userAgent) {
            configuration.user_agent= this.sipOptions.userAgent;
        }
        if (this.sipOptions.noAnswerTimeout != null) {
            configuration.no_answer_timeout= this.sipOptions.noAnswerTimeout;
        }
        this.ua= new JsSIP.UA(configuration);
    }
}

export default SoftPhone;