import { ConfigPlugin, withAppDelegate } from "@expo/config-plugins";
import { mergeContents } from "@expo/config-plugins/build/utils/generateCode";

export const withIosAppDelegate: ConfigPlugin = (config) => {
  return withAppDelegate(config, (cfg) => {
    const { modResults } = cfg;

    // method to invoke voip registration
    // I decided to use this as soon as the app starts to avoid js delay issues
    const methodInvocationBlock = `[RNVoipPushNotificationManager voipRegistration];`;

    // https://regex101.com/r/mPgaq6/1
    const methodInvocationLineMatcher =
      /(?:self\.moduleName\s*=\s*@\"([^"]*)\";)|(?:(self\.|_)(\w+)\s?=\s?\[\[UMModuleRegistryAdapter alloc\])|(?:RCTBridge\s?\*\s?(\w+)\s?=\s?\[(\[RCTBridge alloc\]|self\.reactDelegate))/g;

    // https://regex101.com/r/nHrTa9/1/
    // if the above regex fails, we can use this one as a fallback:
    const fallbackInvocationLineMatcher =
      /-\s*\(BOOL\)\s*application:\s*\(UIApplication\s*\*\s*\)\s*\w+\s+didFinishLaunchingWithOptions:/g;

    if (!modResults.contents.includes("#import <PushKit/PushKit.h>")) {
      modResults.contents = modResults.contents.replace(
        /#import "AppDelegate.h"/g,
        `#import "AppDelegate.h"
#import <PushKit/PushKit.h>
#import "RNVoipPushNotificationManager.h"
#import "RNCallKeep.h"`
      );
    }

    // Merging the method invocation block into the AppDelegate.m file
    // having problem with auth,  https://github.com/react-native-webrtc/react-native-callkeep/issues/735
    try {
     modResults.contents = mergeContents({
       tag: "RNVoipPushNotificationAppDelegate",
       src: modResults.contents,
       anchor: methodInvocationLineMatcher,
       offset: 0,
       comment: "// ",
       newSrc: methodInvocationBlock,
     }).contents;
    } catch (e) {
     // Fallback to the other regex
     modResults.contents = mergeContents({
       tag: "RNVoipPushNotificationAppDelegate",
       src: modResults.contents,
       anchor: fallbackInvocationLineMatcher,
       offset: 0,
       comment: "// ",
       newSrc: methodInvocationBlock,
     }).contents;
    }

    // Add PushKit delegate method to the bottom of the file
    // if other appDelegates are being implemented I will need to add this to the bottom of the file
    if (!modResults.contents.includes("/* Add PushKit delegate method */")) {
      modResults.contents = modResults.contents.replace(
        /@end/g,
        `/* Add PushKit delegate method */
- (void)pushRegistry:(PKPushRegistry *)registry didUpdatePushCredentials:(PKPushCredentials *)credentials forType:(PKPushType)type
{
    [RNVoipPushNotificationManager didUpdatePushCredentials:credentials forType:(NSString *)type];
}

- (void)pushRegistry:(PKPushRegistry *)registry didInvalidatePushTokenForType:(PKPushType)type
{

}

- (void)pushRegistry:(PKPushRegistry *)registry didReceiveIncomingPushWithPayload:(PKPushPayload *)payload forType:(PKPushType)type withCompletionHandler:(void (^)(void))completion
{
    NSString *uuid = [self makeSureUUIDisUUID4:payload.dictionaryPayload[@"uuid"]];
    NSString *callerName = [NSString stringWithFormat:@"%@ is Calling", payload.dictionaryPayload[@"callerName"]];
    NSString *handle = payload.dictionaryPayload[@"handle"];
    BOOL isVideo = [payload.dictionaryPayload[@"isVideo"] boolValue];
    BOOL videoVal = NO;

    if(isVideo) {
      videoVal = YES;
    }

    [RNVoipPushNotificationManager addCompletionHandler:uuid completionHandler:completion];

    [RNVoipPushNotificationManager didReceiveIncomingPushWithPayload:payload forType:(NSString *)type];

    [RNCallKeep reportNewIncomingCall: uuid
                               handle: handle
                           handleType: @"generic"
                             hasVideo: videoVal
                  localizedCallerName: callerName
                      supportsHolding: YES
                         supportsDTMF: YES
                     supportsGrouping: YES
                   supportsUngrouping: YES
                          fromPushKit: YES
                              payload: nil
                withCompletionHandler: completion];
}
// Helper function to convert string to MD5
- (NSString *)md5:(NSString *)string {
    const char *cStr = [string UTF8String];
    unsigned char digest[16];
    CC_MD5(cStr, strlen(cStr), digest);
    
    NSMutableString *output = [NSMutableString stringWithCapacity:CC_MD5_DIGEST_LENGTH * 2];
    for(int i = 0; i < CC_MD5_DIGEST_LENGTH; i++) {
        [output appendFormat:@"%02x", digest[i]];
    }
    return output;
}

- (NSString *)makeSureUUIDisUUID4:(NSString *)uuid {
    if (uuid.length == 32) {
        return uuid;
    }
    
    NSString *hashHex = [self md5:uuid];
    
    NSString *uuid4 = [NSString stringWithFormat:@"%@-%@-4%@-a%@-%@",
                       [hashHex substringWithRange:NSMakeRange(0, 8)],
                       [hashHex substringWithRange:NSMakeRange(8, 4)],
                       [hashHex substringWithRange:NSMakeRange(12, 3)],
                       [hashHex substringWithRange:NSMakeRange(15, 3)],
                       [hashHex substringWithRange:NSMakeRange(18, 12)]];
    
    return [uuid4 lowercaseString];
}

@end`
      );
    }

    return cfg;
  });
};