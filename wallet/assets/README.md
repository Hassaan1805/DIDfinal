# Assets for DID Wallet

This directory should contain the app assets:

## Required Assets

### Icons
- `icon.png` - App icon (1024x1024 px)
- `adaptive-icon.png` - Android adaptive icon (1024x1024 px)
- `favicon.png` - Web favicon (48x48 px)

### Splash Screen
- `splash.png` - Splash screen image (2048x2048 px with content centered in 1284x2778)

## Generating Assets

You can use Expo's asset generation tools or create custom assets.

### Quick Setup with Placeholders

For development, you can use simple colored placeholders:

1. Create a 1024x1024 image with a dark blue (#1a1a2e) background
2. Add "DID" text in white in the center
3. Save as `icon.png` and `adaptive-icon.png`

### Production Assets

For production builds, create professional assets:
- Use a vector graphics tool (Figma, Illustrator, etc.)
- Follow platform guidelines:
  - [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
  - [Android Material Design](https://material.io/design)

## Asset Guidelines

- **Icon**: Should be recognizable at small sizes
- **Colors**: Use brand colors (#1a1a2e, #0ea5e9)
- **Style**: Modern, professional, trustworthy
- **Format**: PNG with transparency

## Temporary Development Assets

For now, the app will use Expo's default assets. Replace them before publishing to app stores.
