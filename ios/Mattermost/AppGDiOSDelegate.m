// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

#import <GD/GDiOS.h>
#import <React/RCTBundleURLProvider.h>
#import "AppGDiOSDelegate.h"
#import "RCCManager.h"
#import "AppDelegate.h"


@interface AppGDiOSDelegate()

@property(assign, nonatomic) BOOL hasAuthorized;
-(instancetype)init;
-(void)didAuthorize;

@end

@implementation AppGDiOSDelegate
+(instancetype)sharedInstance
{
  static AppGDiOSDelegate *appGDiOSDelegate = nil;
  static dispatch_once_t onceToken = 0;
  dispatch_once(&onceToken, ^{
    appGDiOSDelegate = [[AppGDiOSDelegate alloc] init]; });
  return appGDiOSDelegate;
}

-(instancetype)init
{
  self = [super init];
  return self;
}

-(void)setAppDelegate:(AppDelegate *)appDelegate
{
  _appDelegate = appDelegate;
  [self didAuthorize];
}

-(void)didAuthorize
{
  if (self.hasAuthorized && self.appDelegate){
    NSURL *jsCodeLocation;
    
    jsCodeLocation = [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index.ios" fallbackResource:nil];
    
    self.appDelegate.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
    self.appDelegate.window.backgroundColor = [UIColor whiteColor];
    [[RCCManager sharedInstance] initBridgeWithBundleURL:jsCodeLocation launchOptions:self.launchOptions];
  }
}

- (void)onNotAuthorized:(GDAppEvent *)anEvent {
  
  /* Handle the Good Libraries not authorized event. */
  switch (anEvent.code)
  {
    case GDErrorActivationFailed:
    case GDErrorProvisioningFailed:
    case GDErrorPushConnectionTimeout:
    case GDErrorSecurityError:
    case GDErrorAppDenied:
    case GDErrorAppVersionNotEntitled:
    case GDErrorBlocked:
    case GDErrorWiped:
    case GDErrorRemoteLockout:
    case GDErrorPasswordChangeRequired:
    {
      // an condition has occured denying authorization, an application
      // may wish to log these events
      NSLog(@"onNotAuthorized %@", anEvent.message);
      break;
    }
    case GDErrorIdleLockout:
    {
      // idle lockout is benign & informational
      break;
    }
    default:
      NSAssert(false, @"Unhandled not authorized event");
      break;
  }
  
}
- (void)onAuthorized:(GDAppEvent *)anEvent {
  /* Handle the Good Libraries authorized event. */
  switch (anEvent.code)
  {
    case GDErrorNone:
    {
      if (!self.hasAuthorized)
      {
        self.hasAuthorized = YES;
        
        [self didAuthorize];
        
      }
      break;
    }
    default:
      NSAssert(false, @"authorized startup with an error");
      break;
  }
}

-(void)handleEvent:(GDAppEvent *)anEvent {
  /* Called from _good when events occur, such as system startup. */
  switch (anEvent.type)
  {
    case GDAppEventAuthorized:
    {
      [self onAuthorized:anEvent];
      break;
    }
    case GDAppEventNotAuthorized:
    {
      [self onNotAuthorized:anEvent];
      break;
    }
    case GDAppEventRemoteSettingsUpdate:
    {
      //A change to application-related configuration or policy settings.
      break;
    }
    case GDAppEventServicesUpdate:
    {
      //A change to services-related configuration.
      break;
    }
    case GDAppEventPolicyUpdate:
    {
      //A change to one or more application-specific policy settings has been received.
      break;
    }
    case GDAppEventEntitlementsUpdate:
    {
      //A change to the entitlements data has been received.
      break;
    }
      
  }
}

@end
