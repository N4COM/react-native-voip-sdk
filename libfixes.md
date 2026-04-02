## Android build failed at :app:processDebugMainManifest because OneSignal components (brought in via react-native-onesignal) had intent-filters but no android:exported, which is required when targeting Android 12+ (your project targets targetSdk 36).
Android build failed at :app:processDebugMainManifest because OneSignal components (brought in via react-native-onesignal) had intent-filters but no android:exported, which is required when targeting Android 12+ (your project targets targetSdk 36).
What we changed
Updated android/app/src/main/AndroidManifest.xml to:
Add the tools namespace on <manifest>.
Add merge stubs inside <application> that explicitly set android:exported="true" for:
com.onesignal.NotificationOpenedActivityHMS (activity)
com.onesignal.FCMBroadcastReceiver (receiver)
com.onesignal.BootUpReceiver (receiver)
com.onesignal.UpgradeReceiver (receiver)
Used tools:node="merge" so these entries merge into the library manifest rather than replacing it.
Result
Manifest merging succeeds, allowing assembleDebug / expo run:android to complete.
Why it’s temporary
This is an override for an older OneSignal Android SDK manifest (via react-native-onesignal). The long-term fix is to upgrade react-native-onesignal / OneSignal Android SDK to a version that correctly declares android:exported, then remove these manifest stubs.



## Android build failed because the Google Services Gradle plugin detected a dependency mismatch: OneSignal 4.4.0 requires com.google.android.gms:play-services-base in 17.x, but the project resolved 18.5.0, so the plugin blocked the build.
Problem: Android build failed because the Google Services Gradle plugin detected a dependency mismatch: OneSignal 4.4.0 requires com.google.android.gms:play-services-base in 17.x, but the project resolved 18.5.0, so the plugin blocked the build.

Change made: In android/app/build.gradle, right after applying com.google.gms.google-services, I added:

googleServices { disableVersionCheck = true }
Effect: Disables the Google Services plugin’s strict Play services version check, allowing the build to proceed despite the OneSignal vs Play Services version conflict.

Notes: This is a temporary workaround (it doesn’t resolve the underlying version mismatch). If you regenerate android/ (e.g., Expo prebuild), you may need to reapply this change or automate it via config/plugin.


## Summary of the temporary OneSignal + TurboModule fix
Summary of the temporary OneSignal + TurboModule fix
What was broken
Your app is running with React Native New Architecture enabled (android/gradle.properties had newArchEnabled=true).

react-native-onesignal@4.1.1 exposes an Android native method:

addTrigger(String key, Object object)
Under TurboModules, React Native must generate a JNI signature for each @ReactMethod. java.lang.Object is not a supported param type, so RN crashes at runtime with:

TurboModuleInteropUtils$ParsingException ... OneSignal.addTrigger() ... unsupported parameter class: java.lang.Object

Why “just disable new architecture” didn’t work
Turning newArchEnabled=false avoids the TurboModule parsing, but react-native-reanimated v4 runs a Gradle check and fails the build if New Architecture is off:

:react-native-reanimated:assertNewArchitectureEnabledTask → “Reanimated requires new architecture…”

The temporary fix applied
Keep New Architecture ON: newArchEnabled=true

Patch OneSignal’s Android native module to use a TurboModule-safe type:

File patched: node_modules/react-native-onesignal/android/src/main/java/com/geektime/rnonesignalandroid/RNOneSignal.java

Change:

addTrigger(String key, Object object)
→ addTrigger(String key, String value)
and call OneSignal.addTrigger(key, value)
Notes / limitations
This is a local node_modules patch (it will be overwritten on reinstall unless you formalize it with something like patch-package).
Your rebuild attempts also hit an unrelated blocker: Gradle can’t reach services.gradle.org (UnknownHostException). Once networking is resolved, the build can proceed and you can verify runtime behavior.