"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
    }
};
class Prompts {
    constructor() {
        this.prompts = prompts;
    }
    getPrompts() {
        return this.prompts;
    }
    setPrompts(prompts) {
        this.prompts = prompts;
    }
}
const promptsInstance = new Prompts();
exports.default = promptsInstance;
