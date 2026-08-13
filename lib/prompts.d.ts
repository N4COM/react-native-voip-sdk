export type IncomingCallScreenPrompts = {
    info: string;
    accept: string;
    decline: string;
};
export type PromptsType = {
    initialPermissions: {
        title: string;
        body: string;
        buttons: {
            cancel: string;
            ok: string;
        };
    };
    callFailed: {
        title: string;
        body: string;
        buttons: {
            ok: string;
        };
    };
    phoneAccountsPermissions: {
        title: string;
        body: string;
        buttons: {
            cancel: string;
            ok: string;
        };
    };
    incomingCallScreen?: IncomingCallScreenPrompts;
};
declare class Prompts {
    private prompts;
    private incomingCallScreenOverridden;
    private hydratePromise;
    constructor();
    getPrompts(): PromptsType;
    setPrompts(nextPrompts: PromptsType): void;
    getIncomingCallScreen(): Promise<IncomingCallScreenPrompts>;
    private loadIncomingCallScreen;
    private persistIncomingCallScreen;
}
declare const promptsInstance: Prompts;
export default promptsInstance;
