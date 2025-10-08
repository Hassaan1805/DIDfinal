#!/bin/bash

# Mobile App Build Script for Production Deployment
# This script builds the Flutter app with production configuration

echo "📱 Building DID Wallet for Production"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Flutter is installed
if ! command -v flutter &> /dev/null; then
    print_error "Flutter is not installed!"
    echo "Please install Flutter from: https://flutter.dev/docs/get-started/install"
    exit 1
fi

print_success "Flutter is installed"

# Get backend URL from user input
echo ""
print_status "Enter your Railway backend URL (e.g., https://your-backend-service.railway.app):"
read BACKEND_URL

if [ -z "$BACKEND_URL" ]; then
    print_error "Backend URL is required!"
    exit 1
fi

print_success "Backend URL set to: $BACKEND_URL"

# Navigate to mobile wallet directory
cd mobile_wallet

# Clean previous builds
print_status "Cleaning previous builds..."
flutter clean
flutter pub get

# Update network service with production URL
print_status "Configuring production URLs..."

# Create a temporary configuration file
cat > lib/config/production_config.dart << EOF
class ProductionConfig {
  static const String backendUrl = '$BACKEND_URL';
  static const List<String> productionUrls = [
    '$BACKEND_URL',
  ];
}
EOF

# Update network service to use production URL
sed -i.bak "s|https://did-platform-backend.railway.app|$BACKEND_URL|g" lib/services/network_service.dart
sed -i.bak "s|https://your-backend-service.railway.app|$BACKEND_URL|g" lib/services/network_service.dart

print_success "Production URLs configured"

# Build for Android
print_status "Building Android APK..."
flutter build apk --release --target-platform android-arm64

if [ $? -eq 0 ]; then
    print_success "Android APK built successfully!"
    APK_PATH="build/app/outputs/flutter-apk/app-release.apk"
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    print_success "APK Location: $APK_PATH"
    print_success "APK Size: $APK_SIZE"
    
    # Copy APK to project root with descriptive name
    cp "$APK_PATH" "../DID-Wallet-Production-$(date +%Y%m%d).apk"
    print_success "APK copied to project root"
else
    print_error "Android build failed!"
    exit 1
fi

# Build App Bundle for Play Store (optional)
print_status "Building Android App Bundle..."
flutter build appbundle --release

if [ $? -eq 0 ]; then
    print_success "Android App Bundle built successfully!"
    AAB_PATH="build/app/outputs/bundle/release/app-release.aab"
    AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
    print_success "AAB Location: $AAB_PATH"
    print_success "AAB Size: $AAB_SIZE"
else
    print_warning "App Bundle build failed (this is optional)"
fi

# iOS build (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    print_status "Building iOS app..."
    flutter build ios --release --no-codesign
    
    if [ $? -eq 0 ]; then
        print_success "iOS build completed!"
        print_warning "Note: Code signing required for distribution"
    else
        print_warning "iOS build failed (this is optional)"
    fi
else
    print_warning "Skipping iOS build (requires macOS)"
fi

# Restore original network service file
if [ -f "lib/services/network_service.dart.bak" ]; then
    mv lib/services/network_service.dart.bak lib/services/network_service.dart
fi

echo ""
print_success "🎉 Build Complete!"
echo "==================="
echo "Backend URL: $BACKEND_URL"
echo "APK Location: ../DID-Wallet-Production-$(date +%Y%m%d).apk"
echo ""
echo "📱 Installation Instructions:"
echo "1. Transfer the APK to your Android device"
echo "2. Enable 'Install from unknown sources' in Android settings"
echo "3. Install the APK"
echo "4. The app will automatically connect to your Railway backend"
echo ""
echo "🔧 Testing Steps:"
echo "1. Open the app"
echo "2. Check network connectivity in the app"
echo "3. Verify it connects to: $BACKEND_URL"
echo "4. Test QR code authentication with your portal"
echo ""
echo "💡 Troubleshooting:"
echo "- Check network connectivity"
echo "- Verify backend URL is accessible"
echo "- Check app logs for connection errors"