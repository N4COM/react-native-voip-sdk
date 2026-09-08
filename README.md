# react-native-voip-sdk SDK

## Panoramica

Questa sezione descrive le funzionalità disponibili nell'SDK mobile `react-native-voip-sdk`, utilizzato per integrare la gestione delle chiamate VoIP nei dispositivi mobili (Android e iOS). L'SDK consente di inizializzare il servizio VoIP, effettuare e terminare chiamate, gestire il routing audio, silenziare l'audio e supporta le chiamate in arrivo anche quando l'app è in background o chiusa.

## Setup Iniziale

### Wrapping dell'app con il Provider

Per accedere alle funzionalità dello SDK, è necessario avvolgere l'intera applicazione con il `VoipSdkProvider`.

```typescript
import { Stack } from "expo-router";
import VoipSdkProvider from "react-native-voip-sdk";

export default function RootLayout() {
  return (
    <VoipSdkProvider>
      <Stack>
        <Stack.Screen name="index" />
      </Stack>
    </VoipSdkProvider>
  );
}
```

**Nota:** Posizionare `VoipSdkProvider` al livello più alto possibile (root) per garantire il corretto funzionamento del servizio VoIP.

### Gestione Notifiche in Background (Android)

Per ricevere notifiche VoIP quando l'app è chiusa o terminata su Android, è fondamentale registrare il gestore dei messaggi in background. Aggiungere questo codice nell'entry point principale dell'app (di solito `index.js` o `AppEntry.js`):

```javascript
import { backgroundMessageHandler } from 'react-native-voip-sdk';

backgroundMessageHandler();
```

**Importante:** Questa chiamata è obbligatoria su Android per garantire la ricezione corretta delle chiamate VoIP quando l'app è terminata.

## Inizializzazione

L'SDK non effettua chiamate al backend dell'app host. Il client fornisce le credenziali SIP e, opzionalmente, la registrazione del push token tramite una configurazione iniettata.

```typescript
import { useCallService, VoipSdkConfig } from 'react-native-voip-sdk';

const config: VoipSdkConfig = {
  getSipCredentials: async () => {
    const response = await fetch('https://your-api.example/webphone', {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    const { data } = await response.json();
    return {
      id: data.id,
      userName: data.username,
      password: data.password,
      realm: data.realm,
      webSocket: data.websocket,
      displayName: data.displayName,
      displayNumber: data.displayNumber,
      ownerId: data.owner_id,
    };
  },
  onPushToken: async ({ token }) => {
    await fetch('https://your-api.example/push/register', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        push_token: token,
        device_type: Platform.OS === 'android' ? 'AndroidPush' : 'iOSPush',
      }),
    });
  },
  sipContactParams: () => ({
    'app-id': 'my-app',
    'pn-tok': myCredentials.ownerId ?? '',
    'pn-type': 'my-backend',
  }),
  onSdkEvent: ({ name, properties }) => {
    // Inoltra a analytics, log, o ignora.
    console.log(name, properties);
  },
};

await callService.startCallService(config);
```

`onSdkEvent` è opzionale. L'SDK lo chiama per eventi di ciclo di vita (registrazione SIP, schermata chiamata, answer/end, …). Eventi emessi prima di `startCallService()` (avvio a freddo Android, UI nativa iOS) non vengono consegnati.

Se le credenziali SIP sono già disponibili nel client, `getSipCredentials` può restituirle direttamente:

```typescript
await callService.startCallService({
  ...config,
  getSipCredentials: async () => credentials,
});
```

## Funzioni Esportate

L'hook `useCallService()` fornisce accesso ai seguenti metodi:

| Metodo | Descrizione |
|--------|-------------|
| `startCallService(config: VoipSdkConfig)` | Inizializza e registra il servizio VoIP con i provider forniti dal client. |
| `startCall(handle: string, name?: string)` | Avvia una chiamata VoIP verso il numero specificato. Il parametro `name` è opzionale. |
| `endCall()` | Termina la chiamata attiva. |
| `toggleMuteCall()` | Attiva/disattiva il microfono durante una chiamata. |
| `getAudioRoutes()` | Restituisce la lista dei percorsi audio disponibili (es. vivavoce, auricolare, bluetooth). |
| `setAudioRoute(route: string)` | Imposta il percorso audio da utilizzare per la chiamata. |
| `setSdkStrings(prompts: PromptsType)` | Personalizza i messaggi di avviso e i testi della schermata di chiamata in arrivo (Android). |
| `stopCallService()` | Termina il servizio VoIP e rimuove lo stato interno. |

## Stati Esposti

| Variabile | Tipo | Descrizione |
|-----------|------|-------------|
| `callState` | `Call[]` | Lista delle chiamate attive gestite dallo SDK. Ogni oggetto `Call` contiene tutte le informazioni necessarie sullo stato della chiamata. |
| `pendingCall` | `Call` o `PendingCall` | Rappresenta una chiamata in attesa di connessione SIP, ma che ha già un uuid. Utile per mostrare all'utente che una chiamata è in corso di attivazione, oppure per gestire casi in cui la connessione al server SIP è lenta o non ancora stabilita. |
| `callServiceSipInitFailed` | `boolean` | Indica se la fase di inizializzazione SIP ha fallito. Utile per mostrare feedback di errore all'utente. |

## Personalizzazione dei Prompts

L'SDK permette di personalizzare i messaggi di avviso mostrati all'utente tramite la funzione `setSdkStrings()`. Questo consente di adattare i testi e i pulsanti degli alert in base alla lingua o alle esigenze dell'applicazione. I testi di `incomingCallScreen` vengono persistiti dallo SDK, così la schermata di chiamata in arrivo su Android resta localizzata anche a app chiusa.

### Tipi di Prompt Disponibili

L'oggetto `PromptsType` consente di personalizzare quattro tipi di messaggi:

1. **initialPermissions** - Mostrato quando vengono richiesti i permessi iniziali per le chiamate
2. **callFailed** - Mostrato quando una chiamata fallisce
3. **phoneAccountsPermissions** - Mostrato quando sono necessari i permessi per accedere agli account telefonici
4. **incomingCallScreen** - Testi della schermata di chiamata in arrivo su Android (`info`, `accept`, `decline`). Opzionale: se omesso restano i valori precedenti o i predefiniti in italiano.

### Struttura PromptsType

```typescript
type PromptsType = {
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
  incomingCallScreen?: {
    info: string;
    accept: string;
    decline: string;
  };
};
```

### Valori Predefiniti

Se non viene chiamato `setSdkStrings()`, l'SDK utilizza i seguenti valori predefiniti in italiano:

```typescript
const defaultPrompts = {
  initialPermissions: {
    title: 'Permesso richiesto',
    body: `Per effettuare o ricevere chiamate tramite l'app, è necessario autorizzare i permessi richiesti in seguito.
Concedendo l'autorizzazione potrai utilizzare tutte le funzioni di chiamata senza interruzioni.`,
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
  incomingCallScreen: {
    info: 'Chiamata in arrivo',
    accept: 'Accetta',
    decline: 'Rifiuta'
  }
};
```

### Esempio di Personalizzazione

```typescript
import { useCallService } from "react-native-voip-sdk";

const Component = () => {
  const callService = useCallService();

  // Personalizza i prompts con testi in inglese
  const customPrompts = {
    initialPermissions: {
      title: 'Permission Required',
      body: 'To make or receive calls through the app, you need to authorize the following permissions.\nBy granting authorization, you will be able to use all calling features without interruptions.',
      buttons: {
        cancel: 'Cancel',
        ok: 'OK'
      }
    },
    callFailed: {
      title: 'Call Failed',
      body: 'The call was not completed. Please try again.',
      buttons: {
        ok: 'OK'
      }
    },
    phoneAccountsPermissions: {
      title: 'Permission Required',
      body: 'This application needs to access your phone accounts',
      buttons: {
        cancel: 'Cancel',
        ok: 'OK'
      }
    },
    incomingCallScreen: {
      info: 'Incoming Call',
      accept: 'Accept',
      decline: 'Decline'
    }
  };

  // Imposta i prompts personalizzati
  callService.setSdkStrings(customPrompts);

  return (
    // ... il resto del componente
  );
};
```

**Nota:** È consigliabile chiamare `setSdkStrings()` all'avvio dell'app, prima di inizializzare il servizio VoIP, per garantire che i messaggi personalizzati siano disponibili fin dall'inizio. I testi di `incomingCallScreen` restano persistiti anche dopo `stopCallService()`, così una chiamata in arrivo a processo freddo usa l'ultima lingua impostata. La prima chiamata in arrivo prima che l'app abbia mai chiamato `setSdkStrings()` usa i predefiniti in italiano.

## Example

### Codice di esempio

```typescript
import { Button, Platform, Text, View } from "react-native";
import { useCallService, VoipSdkConfig } from "react-native-voip-sdk";

const jwtToken = Platform.OS === 'android'
  ? "TOKEN_ANDROID"
  : "TOKEN_IOS";

const voipConfig: VoipSdkConfig = {
  getSipCredentials: async () => {
    const response = await fetch('https://your-api.example/webphone', {
      headers: { Authorization: `Bearer ${jwtToken}` },
    });
    const { data } = await response.json();
    return {
      id: data.id,
      userName: data.username,
      password: data.password,
      realm: data.realm,
      webSocket: data.websocket,
      ownerId: data.owner_id,
    };
  },
  onPushToken: async ({ token }) => {
    await fetch('https://your-api.example/push/register', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwtToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        push_token: token,
        device_type: Platform.OS === 'android' ? 'AndroidPush' : 'iOSPush',
      }),
    });
  },
};

const Component = () => {
  const callService = useCallService();

  return (
    <View>
      <Text>VoIP SDK Demo</Text>
      <Button
        title="Inizializza Servizio"
        onPress={() => callService.startCallService(voipConfig)}
      />
      <Button
        title="Avvia Chiamata"
        onPress={() => callService.startCall("123456789")}
      />
      <Button
        title="Termina Chiamata"
        onPress={() => callService.endCall()}
      />
      <Button
        title="Mute / Unmute"
        onPress={() => callService.toggleMuteCall()}
      />
    </View>
  );
};
```

## Note di implementazione (iOS)

Il config plugin iOS applica una patch a `AppDelegate.swift` per abilitare due
*field trial* di WebRTC prima dell'avvio di React Native. Senza questa patch
**l'audio si interrompe in entrambe le direzioni la prima volta che una chiamata
viene ripresa dopo essere stata messa in attesa** (hold/unhold tramite CallKit).

Due avvertenze per chi lavora sul layer nativo:

- Non modificare direttamente `ios/`: la cartella è generata e viene
  sovrascritta da `expo prebuild`. Le modifiche vanno nel plugin.
- Il dizionario `fieldTrials` **sostituisce** il valore predefinito di
  `react-native-webrtc`, non lo integra. Se si aggiunge un nuovo trial è
  necessario mantenere anche le chiavi già presenti.

Dettagli tecnici, motivazione della scelta implementativa e note di
manutenzione: [`docs/ios-webrtc-field-trials.md`](docs/ios-webrtc-field-trials.md)
(in inglese).
