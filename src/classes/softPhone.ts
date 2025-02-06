// @ts-expect-error TS(7016): Could not find a declaration file for module 'jssi... Remove this comment to see the full error message
import JsSIP from 'jssip';

class SoftPhone{
    ownerID: any;
    password: any;
    realm: any;
    ua: any;
    userName: any;
    webSocket: any;

    constructor(userName: any,password: any,realm: any,ownerID: any,webSocket: any){
        this.userName=userName;
        this.password=password;
        this.realm= realm;
        this.ua=null;
        this.webSocket=webSocket,
        this.ownerID= ownerID,
        this.configUA()
    }

    configUA(){
        let socket= new JsSIP.WebSocketInterface(`${this.webSocket}`);
        let configuration= {
        sockets:[socket],
        uri: `sip:${this.userName}@${this.realm}`,
        password:this.password,
        'user_agent':'Svoolaz 1.0.0',
        'no_answer_timeout': 180
        }
        this.ua= new JsSIP.UA(configuration);
    }
}

export default SoftPhone;