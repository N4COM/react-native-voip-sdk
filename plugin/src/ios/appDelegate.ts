import { ConfigPlugin, withAppDelegate } from "@expo/config-plugins";
import { mergeContents } from "@expo/config-plugins/build/utils/generateCode";

const OBJC_TAG = "RNVoipPushNotificationAppDelegate";
const SWIFT_TAG = "RNVoipPushNotificationAppDelegateSwift";

const applyObjcPatch = (contents: string) => {
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

  if (!contents.includes("#import <PushKit/PushKit.h>")) {
    contents = contents.replace(
      /#import "AppDelegate.h"/g,
      `#import "AppDelegate.h"
        #import <CommonCrypto/CommonDigest.h>
#import <PushKit/PushKit.h>
#import "RNVoipPushNotificationManager.h"
#import "RNCallKeep.h"`
    );
  }

  // Merging the method invocation block into the AppDelegate.m file
  // having problem with auth,  https://github.com/react-native-webrtc/react-native-callkeep/issues/735
  try {
    contents = mergeContents({
      tag: OBJC_TAG,
      src: contents,
      anchor: methodInvocationLineMatcher,
      offset: 0,
      comment: "// ",
      newSrc: methodInvocationBlock,
    }).contents;
  } catch (e) {
    // Fallback to the other regex
    contents = mergeContents({
      tag: OBJC_TAG,
      src: contents,
      anchor: fallbackInvocationLineMatcher,
      offset: 0,
      comment: "// ",
      newSrc: methodInvocationBlock,
    }).contents;
  }

  // Add PushKit delegate method to the bottom of the file
  // if other appDelegates are being implemented I will need to add this to the bottom of the file
  if (!contents.includes("/* Add PushKit delegate method */")) {
    contents = contents.replace(
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
    NSDictionary *custom = payload.dictionaryPayload[@"custom"];
    NSDictionary *extra = [custom isKindOfClass:[NSDictionary class]] ? custom[@"a"] : nil;
    if (![extra isKindOfClass:[NSDictionary class]]) {
        extra = nil;
    }
    NSString *originalUuid = payload.dictionaryPayload[@"uuid"] ?: extra[@"uuid"] ?: [[[NSUUID UUID] UUIDString] lowercaseString];
    NSString *uuid = [self makeSureUUIDisUUID4:originalUuid];
    NSString *callerNameRaw = payload.dictionaryPayload[@"callerName"] ?: extra[@"callerName"] ?: @"Unknown";
    NSString *callerName = [NSString stringWithFormat:@"%@ is Calling", callerNameRaw];
    NSString *handle = payload.dictionaryPayload[@"handle"] ?: extra[@"handle"] ?: callerNameRaw;
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

  return contents;
};

const ensureSwiftImports = (contents: string) => {
  const missingImports = [
    "import PushKit",
    "import CryptoKit",
    "import ObjectiveC.runtime",
  ].filter((swiftImport) => !contents.includes(swiftImport));

  if (!missingImports.length) {
    return contents;
  }

  const importBlockMatcher = /((?:import\s+[A-Za-z0-9_\.]+\s*\n)+)/m;
  if (!importBlockMatcher.test(contents)) {
    return `${missingImports.join("\n")}\n\n${contents}`;
  }

  return contents.replace(
    importBlockMatcher,
    `$1${missingImports.join("\n")}\n`
  );
};

const addSwiftDidFinishLaunchInvocation = (contents: string) => {
  const methodInvocationBlock = `self.n4comRegisterVoipPush()`;
  const methodInvocationLineMatcher =
    /return\s+super\.application\(\s*application,\s*didFinishLaunchingWithOptions:\s*[A-Za-z_][A-Za-z0-9_]*\s*\)/g;
  const fallbackInvocationLineMatcher = /self\.initialProps\s*=\s*\[:\]/g;

  try {
    return mergeContents({
      tag: SWIFT_TAG,
      src: contents,
      anchor: methodInvocationLineMatcher,
      offset: 0,
      comment: "// ",
      newSrc: methodInvocationBlock,
    }).contents;
  } catch (e) {
    return mergeContents({
      tag: SWIFT_TAG,
      src: contents,
      anchor: fallbackInvocationLineMatcher,
      offset: 1,
      comment: "// ",
      newSrc: methodInvocationBlock,
    }).contents;
  }
};

const addSwiftPushKitExtension = (contents: string) => {
  if (contents.includes("// MARK: - RNVoipPushNotificationAppDelegateSwift")) {
    return contents;
  }

  const classNameMatch = contents.match(
    /(?:public|open|internal|private|fileprivate)?\s*class\s+([A-Za-z_][A-Za-z0-9_]*)\s*:/m
  );
  const appDelegateClassName = classNameMatch?.[1] || "AppDelegate";

  const swiftExtensionBlock = `

// MARK: - RNVoipPushNotificationAppDelegateSwift
private var n4comVoipRegistry: PKPushRegistry?

extension ${appDelegateClassName}: PKPushRegistryDelegate {
  func n4comRegisterVoipPush() {
    let voipRegistry = PKPushRegistry(queue: DispatchQueue.main)
    voipRegistry.delegate = self
    voipRegistry.desiredPushTypes = [.voIP]
    n4comVoipRegistry = voipRegistry

    self.n4comPerformClassSelector(
      className: "RNVoipPushNotificationManager",
      selectorName: "voipRegistration"
    )
  }

  public func pushRegistry(_ registry: PKPushRegistry, didUpdate pushCredentials: PKPushCredentials, for type: PKPushType) {
    self.n4comPerformClassSelector(
      className: "RNVoipPushNotificationManager",
      selectorName: "didUpdatePushCredentials:forType:",
      with: pushCredentials,
      and: type.rawValue as NSString
    )
  }

  public func pushRegistry(_ registry: PKPushRegistry, didInvalidatePushTokenFor type: PKPushType) {
  }

  public func pushRegistry(
    _ registry: PKPushRegistry,
    didReceiveIncomingPushWith payload: PKPushPayload,
    for type: PKPushType,
    completion: @escaping () -> Void
  ) {
    // OneSignal puts additional data under custom.a, not at the payload root.
    let extra = (payload.dictionaryPayload["custom"] as? [AnyHashable: Any])?["a"] as? [AnyHashable: Any]
    let originalUuid = (payload.dictionaryPayload["uuid"] as? String)
      ?? (extra?["uuid"] as? String)
      ?? UUID().uuidString.lowercased()
    let uuid = self.n4comMakeSureUUIDisUUID4(originalUuid)
    let callerNameRaw = (payload.dictionaryPayload["callerName"] as? String)
      ?? (extra?["callerName"] as? String)
      ?? "Unknown"
    let callerName = "\\(callerNameRaw) is Calling"
    let handle = (payload.dictionaryPayload["handle"] as? String)
      ?? (extra?["handle"] as? String)
      ?? callerNameRaw
    let isVideo = payload.dictionaryPayload["isVideo"] as? Bool ?? false

    self.n4comPerformClassSelector(
      className: "RNVoipPushNotificationManager",
      selectorName: "didReceiveIncomingPushWithPayload:forType:",
      with: payload,
      and: type.rawValue as NSString
    )

    self.n4comReportIncomingCall(
      uuid: uuid,
      handle: handle,
      callerName: callerName,
      hasVideo: isVideo,
      payload: payload.dictionaryPayload as NSDictionary?,
      completion: completion
    )
  }

  private func n4comPerformClassSelector(
    className: String,
    selectorName: String,
    with firstArgument: AnyObject? = nil,
    and secondArgument: AnyObject? = nil
  ) {
    guard let cls: AnyObject = NSClassFromString(className) else {
      return
    }

    let selector = NSSelectorFromString(selectorName)

    if firstArgument == nil {
      _ = cls.perform(selector)
      return
    }

    _ = cls.perform(selector, with: firstArgument, with: secondArgument)
  }

  private func n4comReportIncomingCall(
    uuid: String,
    handle: String,
    callerName: String,
    hasVideo: Bool,
    payload: NSDictionary?,
    completion: @escaping () -> Void
  ) {
    let selector = NSSelectorFromString("reportNewIncomingCall:handle:handleType:hasVideo:localizedCallerName:supportsHolding:supportsDTMF:supportsGrouping:supportsUngrouping:fromPushKit:payload:withCompletionHandler:")

    guard
      let callKeepClass: AnyClass = NSClassFromString("RNCallKeep"),
      let method = class_getClassMethod(callKeepClass, selector)
    else {
      completion()
      return
    }

    typealias ReportNewIncomingCallFunction = @convention(c) (
      AnyClass,
      Selector,
      NSString,
      NSString,
      NSString,
      Bool,
      NSString,
      Bool,
      Bool,
      Bool,
      Bool,
      Bool,
      NSDictionary?,
      (@convention(block) () -> Void)?
    ) -> Void

    let implementation = method_getImplementation(method)
    let function = unsafeBitCast(implementation, to: ReportNewIncomingCallFunction.self)

    function(
      callKeepClass,
      selector,
      uuid as NSString,
      handle as NSString,
      "generic" as NSString,
      hasVideo,
      callerName as NSString,
      true,
      true,
      true,
      true,
      true,
      payload,
      completion
    )
  }

  private func n4comMakeSureUUIDisUUID4(_ value: String) -> String {
    if value.count == 32 {
      return value.lowercased()
    }

    let digest = Insecure.MD5.hash(data: Data(value.utf8))
    let hashHex = digest.map { String(format: "%02x", $0) }.joined()

    let first = hashHex.prefix(8)
    let second = hashHex.dropFirst(8).prefix(4)
    let third = hashHex.dropFirst(12).prefix(3)
    let fourth = hashHex.dropFirst(15).prefix(3)
    let fifth = hashHex.dropFirst(18).prefix(12)

    return "\\(first)-\\(second)-4\\(third)-a\\(fourth)-\\(fifth)".lowercased()
  }
}
`;

  return `${contents.trimEnd()}\n${swiftExtensionBlock}\n`;
};

const applySwiftPatch = (contents: string) => {
  contents = ensureSwiftImports(contents);
  contents = addSwiftDidFinishLaunchInvocation(contents);
  contents = addSwiftPushKitExtension(contents);
  return contents;
};

export const withIosAppDelegate: ConfigPlugin = (config) => {
  return withAppDelegate(config, (cfg) => {
    const { modResults } = cfg;

    if (["objc", "objcpp"].includes(modResults.language)) {
      modResults.contents = applyObjcPatch(modResults.contents);
      return cfg;
    }

    if (modResults.language === "swift") {
      modResults.contents = applySwiftPatch(modResults.contents);
      return cfg;
    }

    throw new Error(
      `Unsupported iOS AppDelegate language: ${modResults.language}`
    );

    return cfg;
  });
};
