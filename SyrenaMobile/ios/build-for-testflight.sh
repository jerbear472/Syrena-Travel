#!/bin/bash

# Syrena Mobile - Build for TestFlight Script
# This script builds and prepares your app for TestFlight

set -e

echo "🚀 Building Syrena for TestFlight..."
echo ""

# Navigate to iOS directory
cd "$(dirname "$0")"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf build
rm -rf ~/Library/Developer/Xcode/DerivedData/SyrenaMobile-*

# Install pods
echo "📦 Installing CocoaPods dependencies..."
pod install

# Build archive
echo "🔨 Building archive (this may take 5-10 minutes)..."
xcodebuild -workspace SyrenaMobile.xcworkspace \
  -scheme SyrenaMobile \
  -configuration Release \
  -archivePath "$PWD/build/SyrenaMobile.xcarchive" \
  archive \
  -allowProvisioningUpdates

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Archive created successfully!"
  echo "📁 Location: $PWD/build/SyrenaMobile.xcarchive"
  echo ""
  echo "📤 Opening Xcode Organizer to upload to TestFlight..."
  echo ""
  echo "In the Organizer window that opens:"
  echo "1. Click 'Distribute App'"
  echo "2. Select 'App Store Connect'"
  echo "3. Click 'Upload'"
  echo "4. Follow the prompts to complete upload"
  echo ""

  # Open the archive in Xcode Organizer
  open "$PWD/build/SyrenaMobile.xcarchive"
else
  echo "❌ Build failed. Please check the error messages above."
  exit 1
fi
