import AsyncStorage from '@react-native-async-storage/async-storage';

export type IncomingCallScreenPrompts = {
    info: string;
    accept: string;
    decline: string;
};

export type PromptsType = {
    initialPermissions:{
        title:string,
        body:string,
        buttons:{
            cancel:string,
            ok:string
        }
    }
    callFailed:{
        title:string,
        body:string,
        buttons:{
            ok:string
        }
    }
    phoneAccountsPermissions:{
        title:string,
        body:string,
        buttons:{
            cancel:string,
            ok:string
        }
    }
    incomingCallScreen?: IncomingCallScreenPrompts;
}

const INCOMING_CALL_SCREEN_STORAGE_KEY = '@voip-sdk/incomingCallScreen';

const defaultIncomingCallScreen: IncomingCallScreenPrompts = {
    info: 'Chiamata in arrivo',
    accept: 'Accetta',
    decline: 'Rifiuta',
};

const prompts: PromptsType = {
    initialPermissions:{
        title:'Permesso richiesto',
        body:`Per effettuare o ricevere chiamate tramite l'app, è necessario autorizzare i permessi richiesti in seguito.\nConcedendo l'autorizzazione potrai utilizzare tutte le funzioni di chiamata senza interruzioni.`,
        buttons:{
            cancel:'Annulla',
            ok:'OK'
        }
    },
    callFailed:{
        title:'Chiamata fallita',
        body:'La chiamata non è stata completata. Si prega di riprovare.',
        buttons:{
            ok:'OK'
        }
    },
    phoneAccountsPermissions:{
        title:'Permesso richiesto',
        body:'Questa applicazione necessita di accedere ai tuoi account telefonici',
        buttons:{
            cancel:'Annulla',
            ok:'OK'
        }
    },
    incomingCallScreen: defaultIncomingCallScreen,
};

function isIncomingCallScreenPrompts(value: unknown): value is IncomingCallScreenPrompts {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value as Record<string, unknown>;
    return typeof candidate.info === 'string'
        && typeof candidate.accept === 'string'
        && typeof candidate.decline === 'string';
}


class Prompts{

    private prompts: PromptsType;
    private incomingCallScreenOverridden = false;
    private hydratePromise: Promise<void>;

    constructor(){
        this.prompts = { ...prompts };
        this.hydratePromise = this.loadIncomingCallScreen();
    }

    getPrompts(){
        return this.prompts;
    }

    setPrompts(nextPrompts: PromptsType){
        const incomingCallScreen = nextPrompts.incomingCallScreen
            ?? this.prompts.incomingCallScreen
            ?? defaultIncomingCallScreen;

        this.prompts = {
            ...nextPrompts,
            incomingCallScreen,
        };

        if (nextPrompts.incomingCallScreen) {
            this.incomingCallScreenOverridden = true;
            this.persistIncomingCallScreen(nextPrompts.incomingCallScreen);
        }
    }

    async getIncomingCallScreen(): Promise<IncomingCallScreenPrompts> {
        if (!this.incomingCallScreenOverridden) {
            await this.hydratePromise;
        }
        return this.prompts.incomingCallScreen ?? defaultIncomingCallScreen;
    }

    private async loadIncomingCallScreen(){
        try {
            const raw = await AsyncStorage.getItem(INCOMING_CALL_SCREEN_STORAGE_KEY);
            if (this.incomingCallScreenOverridden) {
                return;
            }
            if (!raw) {
                return;
            }
            const parsed = JSON.parse(raw);
            if (isIncomingCallScreenPrompts(parsed)) {
                this.prompts.incomingCallScreen = parsed;
            }
        } catch (error) {
            console.warn('Prompts: Failed to load incoming call screen', error);
        }
    }

    private persistIncomingCallScreen(incomingCallScreen: IncomingCallScreenPrompts){
        AsyncStorage.setItem(
            INCOMING_CALL_SCREEN_STORAGE_KEY,
            JSON.stringify(incomingCallScreen),
        ).catch((error) => {
            console.warn('Prompts: Failed to persist incoming call screen', error);
        });
    }
}

const promptsInstance = new Prompts();

export default promptsInstance;
