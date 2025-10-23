

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
}


const prompts= {
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
    }
}


class Prompts{

    private prompts: PromptsType;

    constructor(){
        this.prompts = prompts;
    }

    getPrompts(){
        return this.prompts;
    }

    setPrompts(prompts: PromptsType){
        this.prompts = prompts;
    }
}

const promptsInstance = new Prompts();

export default promptsInstance;