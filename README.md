

# react-native-voip-sdk Installation Documentation

This document details the installation and configuration steps for integrating the **react-native-voip-sdk** into your React Native project.

---

## Table of Contents

- [react-native-voip-sdk Installation Documentation](#react-native-voip-sdk-installation-documentation)
  - [Table of Contents](#table-of-contents)
  - [Requirements](#requirements)
  - [Dependencies](#dependencies)
    - [Mandatory](#mandatory)
    - [Optional](#optional)
  - [Required Native Configuration](#required-native-configuration)
  - [Android Setup](#android-setup)
    - [Disabling New Architecture and Hermes](#disabling-new-architecture-and-hermes)
    - [Android Manifest Configuration](#android-manifest-configuration)
    - [iOS Setup](#ios-setup)
      - [Podfile Configuration](#podfile-configuration)
      - [Linking Required Libraries](#linking-required-libraries)
      - [Configuring VoIP Background Modes](#configuring-voip-background-modes)
      - [Updating AppDelegate.m](#updating-appdelegatem)
      - [Firebase Installation](#firebase-installation)
      - [Android Firebase Setup](#android-firebase-setup)
      - [iOS Firebase Setup](#ios-firebase-setup)
      - [VoIP Notifications Setup](#voip-notifications-setup)
      - [Enabling VoIP Push Notifications and Certificate](#enabling-voip-push-notifications-and-certificate)
      - [Modifications in AppDelegate.m for VoIP](#modifications-in-appdelegatem-for-voip)

---

## Requirements

- **React Native Version:** Must be greater than 0.65 and less than 0.77.

---

## Dependencies

### Mandatory

Add the following dependencies to your project:

- `"react-native": ">=0.60.0"`
- `"@react-native-firebase/app": ">=21.7.1"`
- `"@react-native-firebase/messaging": ">=21.7.1"`
- `"react-native-callkeep": ">=4.3.14"`
- `"react-native-voip-push-notification": ">=3.3.2"`
- `"react-native-background-timer": "^2.4.1"`

### Optional

If you plan to use OneSignal for push notifications:

- `"react-native-onesignal": ">=4.1.1"`

---

## Required Native Configuration

Before proceeding, ensure that you have installed **RNCCallKeep** in your project.

---

## Android Setup

### Disabling New Architecture and Hermes

In your project's `gradle.properties` file, disable the new architecture and Hermes JS engine by adding or updating the following lines:

```properties
newArchEnabled=false

# Use this property to enable or disable the Hermes JS engine.
# If set to false, JSC will be used instead.
hermesEnabled=false



```

### Android Manifest Configuration

Add the required permissions and features to your AndroidManifest.xml file:

```xml
<!-- Permissions -->
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.BIND_TELECOM_CONNECTION_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.READ_PHONE_STATE" />
<uses-permission android:name="android.permission.CALL_PHONE" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.SYSTEM_CAMERA" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_CAMERA" />

<!-- Hardware Features -->
<uses-feature android:name="android.hardware.audio.output" />
<uses-feature android:name="android.hardware.microphone" />
```

Within the <application> tag, configure the required services:


```xml
<application>
  <!-- Other configuration elements -->

  <!-- Service for handling call connections -->
  <service
      android:name="io.wazo.callkeep.VoiceConnectionService"
      android:label="Wazo"
      android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE"
      android:foregroundServiceType="camera|microphone"
      android:exported="true">
    <intent-filter>
      <action android:name="android.telecom.ConnectionService" />
    </intent-filter>
  </service>

  <!-- Service for background messaging -->
  <service android:name="io.wazo.callkeep.RNCallKeepBackgroundMessagingService" />
</application>
```

### iOS Setup

#### Podfile Configuration

Add the following to your Podfile:

```
pod 'RNCallKeep', :path => '../node_modules/react-native-callkeep'
```

```
cd ios
pod install
```

#### Linking Required Libraries

1. Link Binary With Libraries

Open the Build Phases tab in Xcode.
Expand Link Binary With Libraries.
Add CallKit.framework and Intents.framework (mark these frameworks as Optional).

2. Add Header Search Paths

Open the Build Settings tab.
Search for Header Search Paths.
Add the following path:

```
$(SRCROOT)/../node_modules/react-native-callkeep/ios/RNCallKeep
```

#### Configuring VoIP Background Modes

Open your project's Info.plist file and ensure that VoIP is enabled in UIBackgroundModes. Add the following:

```
<key>UIBackgroundModes</key>
<array>
    <string>voip</string>
</array>
```

#### Updating AppDelegate.m

1. Import RNCallKeep

At the top of AppDelegate.m, import the RNCallKeep header:

```
#import <RNCallKeep/RNCallKeep.h>
```

2. Handle User Activity
Before the @end tag in AppDelegate.m, add the following method to handle calls initiated from the native Phone app:

```
- (BOOL)application:(UIApplication *)application
  continueUserActivity:(NSUserActivity *)userActivity
    restorationHandler:(void(^)(NSArray<id<UIUserActivityRestoring>> * _Nullable restorableObjects))restorationHandler {
  return [RNCallKeep application:application continueUserActivity:userActivity restorationHandler:restorationHandler];
}
```
3. Extra Setup in didFinishLaunchingWithOptions

Within the - (BOOL)application:didFinishLaunchingWithOptions: method, add the following setup for RNCallKeep:

```
[RNCallKeep setup:@{
  @"appName": @"n4comapp",
  @"maximumCallGroups": @3,
  @"maximumCallsPerCallGroup": @1,
  @"supportsVideo": @NO,
}];
```


#### Firebase Installation

#### Android Firebase Setup

Install Firebase via Yarn

Add google-services.json

Place your google-services.json file in the android/app directory.

Configure Google Services Plugin

In your /android/build.gradle file, add the Google Services plugin as a dependency:

```
buildscript {
  dependencies {
    // ... other dependencies
    // NOTE: For React Native 0.71 or below, do not update past version 4.3.15 if using Gradle >= 7.3.0
    classpath 'com.google.gms:google-services:4.4.2'
  }
}
```

Then, in your /android/app/build.gradle file, apply the plugin:

```
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services'

```


#### iOS Firebase Setup

For this SDK, Firebase for iOS is not strictly required. However, if you need it:

Open your ./ios/Podfile and add the following line inside your target (before the use_react_native call):

```
use_frameworks! :linkage => :static
```
Then, run the following command to install the dependencies:

```
cd ios
pod install --repo-update
```


#### VoIP Notifications Setup

VoIP notifications enable push notifications and maintain background modes.


#### Enabling VoIP Push Notifications and Certificate

In Xcode, ensure that the following capabilities are enabled under Signing & Capabilities:

Background Modes: Enable Voice over IP
Push Notifications: Add the capability for Push Notifications


#### Modifications in AppDelegate.m for VoIP

1. Import Necessary Libraries
At the top of AppDelegate.m, add the following imports:

```
#import <PushKit/PushKit.h>                    // Add this line
#import "RNVoipPushNotificationManager.h"      // Add this line
```

2. Update didFinishLaunchingWithOptions
Modify your didFinishLaunchingWithOptions method as follows:

```
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
  RCTBridge *bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:launchOptions];

  // Optional but recommended: register VoIP push notification ASAP (to avoid delays from JS)
  [RNVoipPushNotificationManager voipRegistration];

  RCTRootView *rootView = [[RCTRootView alloc] initWithBridge:bridge moduleName:@"AppName" initialProperties:nil];

  // ... Additional setup code
}
```

3. Implement PushKit Delegate Methods
Add the following methods to handle push credentials and incoming VoIP pushes:
```
// Handle updated push credentials
- (void)pushRegistry:(PKPushRegistry *)registry didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type {
  [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:(NSString *)type];
}

// Handle invalid push tokens
- (void)pushRegistry:(PKPushRegistry *)registry didInvalidatePushTokenForType:(PKPushType)type {
  // Notify your server to stop sending push notifications using this token
}

// Handle incoming pushes
- (void)pushRegistry:(PKPushRegistry *)registry didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type withCompletionHandler:(void (^)(void))completion {
  // Retrieve details from the payload
  NSString *uuid = payload.dictionaryPayload[@"uuid"];
  NSString *callerName = [NSString stringWithFormat:@"%@ (Connecting...)", payload.dictionaryPayload[@"callerName"]];
  NSString *handle = payload.dictionaryPayload[@"handle"];

  // Optional: if you want to call `completion()` on the JS side
  [RNVoipPushNotificationManager addCompletionHandler:uuid completionHandler:completion];

  // Process the received push
  [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:(NSString *)type];

  // Report the new incoming call via CallKit before calling `completion()`
  [RNCallKeep reportNewIncomingCall:uuid handle:handle handleType:@"generic" hasVideo:false localizedCallerName:callerName fromPushKit:YES payload:nil];
}
```






