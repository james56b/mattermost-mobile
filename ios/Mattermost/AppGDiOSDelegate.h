// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

#import <Foundation/Foundation.h>
#import <GD/GDiOS.h>
#import "RCCManager.h"
#import "AppDelegate.h"

@interface AppGDiOSDelegate : NSObject <GDiOSDelegate>

@property (weak, nonatomic) AppDelegate *appDelegate;

@property (assign, nonatomic, readonly) BOOL hasAuthorized;

@property (weak, nonatomic) NSDictionary *launchOptions;

+(AppGDiOSDelegate *)sharedInstance;

@end
