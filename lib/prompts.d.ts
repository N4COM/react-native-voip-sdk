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
};
declare class Prompts {
    private prompts;
    constructor();
    getPrompts(): PromptsType;
    setPrompts(prompts: PromptsType): void;
}
declare const promptsInstance: Prompts;
export default promptsInstance;
