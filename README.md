
# Installation

```bash
npm install https://github.com/N4COM/react-native-voip-sdk.git

# or

yarn add https://github.com/N4COM/react-native-voip-sdk.git

# or

pnpm add https://github.com/N4COM/react-native-voip-sdk.git

```

## Plugin Installation

- In your app.json file, add the following:

```js
{
  "plugins": ["react-native-voip-sdk"]
}
```

## Peer Dependencies

- "@react-native-async-storage/async-storage": ">=1.0.0"
- "@react-native-firebase/app": ">=21.7.1"
- "@react-native-firebase/messaging": ">=21.7.1"
- "react": ">=18.2.0"
- "react-native-background-timer": "^2.4.1"
- "react-native-callkeep": ">=4.3.14"
- "react-native-voip-push-notification": ">=3.3.2"
- "react-native-webrtc": "https://github.com/nimbleape/react-native-webrtc.git#84-plus-dtmf-plus-field-trial"

## Peer Dependencies Plugins

```bash
  npm install @config-plugins/react-native-webrtc
```

- In your app.json file, add the following:

```js
"plugins": [
      [
        "@config-plugins/react-native-webrtc",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone"
        }
      ],
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
    ]
```

## Example

```js
import { Button, Platform, Text, View } from "react-native";
import  {useCallService} from "react-native-voip-sdk";




const Component = () => {
  const callService = useCallService();
  
  const handleStartCall = (number) => {
    callService?.startCall(number)
  };

  const handleEndCall = () => {
    callService?.endCall();
  };

  const handleInitiateCallService = () => {
    callService?.initiateCallService(jwtToken);
  };

  return (
    <View style={{ flex: 1, justifyContent: "center", gap: 20, alignItems: "center" }}>
      <Button title="Initiate Call Service" onPress={handleInitiateCallService} />
      <Button title="Start Call" onPress={() => handleStartCall("0000000")} />
      <Button title="End Call" onPress={handleEndCall} />
    </View>
  );
}






const Index = () => {
  
 
  
  return (
   
      <Component />
 
  );
};

export default Index;
```

