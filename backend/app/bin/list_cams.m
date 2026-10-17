#import <Foundation/Foundation.h>
#import <AVFoundation/AVFoundation.h>
#import <stdio.h>

int main() {
    @autoreleasepool {
        // Match OpenCV AVFoundation device enumeration order:
        // External USB devices are enumerated first (index 0), followed by built-in FaceTime camera (index 1)
        NSArray<AVCaptureDeviceType> *deviceTypes = @[
            AVCaptureDeviceTypeExternal,
            AVCaptureDeviceTypeBuiltInWideAngleCamera
        ];
        
        AVCaptureDeviceDiscoverySession *session = [AVCaptureDeviceDiscoverySession
            discoverySessionWithDeviceTypes:deviceTypes
            mediaType:AVMediaTypeVideo
            position:AVCaptureDevicePositionUnspecified];
            
        NSArray<AVCaptureDevice *> *devices = session.devices;
        for (NSUInteger i = 0; i < [devices count]; i++) {
            AVCaptureDevice *dev = devices[i];
            const char *name = [[dev localizedName] UTF8String];
            const char *uid = [[dev uniqueID] UTF8String];
            const char *model = [[dev modelID] UTF8String];
            printf("%lu|%s|%s|%s\n", (unsigned long)i, name, uid, model);
        }
    }
    return 0;
}
