"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const INCOMING_CALL_SCREEN_STORAGE_KEY = '@voip-sdk/incomingCallScreen';
const defaultIncomingCallScreen = {
    info: 'Chiamata in arrivo',
    accept: 'Accetta',
    decline: 'Rifiuta',
};
const prompts = {
    initialPermissions: {
        title: 'Permesso richiesto',
        body: `Per effettuare o ricevere chiamate tramite l'app, è necessario autorizzare i permessi richiesti in seguito.\nConcedendo l'autorizzazione potrai utilizzare tutte le funzioni di chiamata senza interruzioni.`,
        buttons: {
            cancel: 'Annulla',
            ok: 'OK'
        }
    },
    callFailed: {
        title: 'Chiamata fallita',
        body: 'La chiamata non è stata completata. Si prega di riprovare.',
        buttons: {
            ok: 'OK'
        }
    },
    phoneAccountsPermissions: {
        title: 'Permesso richiesto',
        body: 'Questa applicazione necessita di accedere ai tuoi account telefonici',
        buttons: {
            cancel: 'Annulla',
            ok: 'OK'
        }
    },
    incomingCallScreen: defaultIncomingCallScreen,
};
function isIncomingCallScreenPrompts(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    const candidate = value;
    return typeof candidate.info === 'string'
        && typeof candidate.accept === 'string'
        && typeof candidate.decline === 'string';
}
class Prompts {
    constructor() {
        this.incomingCallScreenOverridden = false;
        this.prompts = { ...prompts };
        this.hydratePromise = this.loadIncomingCallScreen();
    }
    getPrompts() {
        return this.prompts;
    }
    setPrompts(nextPrompts) {
        var _a, _b;
        const incomingCallScreen = (_b = (_a = nextPrompts.incomingCallScreen) !== null && _a !== void 0 ? _a : this.prompts.incomingCallScreen) !== null && _b !== void 0 ? _b : defaultIncomingCallScreen;
        this.prompts = {
            ...nextPrompts,
            incomingCallScreen,
        };
        if (nextPrompts.incomingCallScreen) {
            this.incomingCallScreenOverridden = true;
            this.persistIncomingCallScreen(nextPrompts.incomingCallScreen);
        }
    }
    async getIncomingCallScreen() {
        var _a;
        if (!this.incomingCallScreenOverridden) {
            await this.hydratePromise;
        }
        return (_a = this.prompts.incomingCallScreen) !== null && _a !== void 0 ? _a : defaultIncomingCallScreen;
    }
    async loadIncomingCallScreen() {
        try {
            const raw = await async_storage_1.default.getItem(INCOMING_CALL_SCREEN_STORAGE_KEY);
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
        }
        catch (error) {
            console.warn('Prompts: Failed to load incoming call screen', error);
        }
    }
    persistIncomingCallScreen(incomingCallScreen) {
        async_storage_1.default.setItem(INCOMING_CALL_SCREEN_STORAGE_KEY, JSON.stringify(incomingCallScreen)).catch((error) => {
            console.warn('Prompts: Failed to persist incoming call screen', error);
        });
    }
}
const promptsInstance = new Prompts();
exports.default = promptsInstance;
