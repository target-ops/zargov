# Zargov - ArgoCD Image Viewer

A Chrome extension that displays Docker image versions for all ArgoCD applications using your existing browser session.

![Zargov](icons/icon128.png)

## Features

- 🐳 **View Docker Images**: See all container images and their versions for each ArgoCD application
- 🔍 **Search**: Filter applications and images with real-time search
- 📋 **Copy to Clipboard**: One-click copy of full image references
- 🎨 **Beautiful UI**: Modern dark theme with gradient accents
- 🔐 **Session-Based**: Uses your existing ArgoCD session - no API tokens needed

## Installation

### From Source (Developer Mode)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `zargov` folder
5. The extension icon should appear in your toolbar

### Pin the Extension

For easy access, click the puzzle piece icon in Chrome's toolbar and pin Zargov.

## Usage

1. Navigate to your ArgoCD dashboard in Chrome
2. Click the Zargov extension icon
3. View all applications and their Docker images
4. Click on an application card to expand and see image details
5. Use the search bar to filter by app name or image
6. Click the copy button to copy full image references

## How It Works

Zargov detects when you're on an ArgoCD page and uses the ArgoCD REST API with your existing session cookies. This means:

- ✅ No API tokens or credentials required
- ✅ Uses your existing permissions
- ✅ Works with any ArgoCD installation
- ✅ Secure - no data leaves your browser

## Requirements

- Google Chrome (or Chromium-based browser)
- Access to an ArgoCD instance (must be logged in)

## Troubleshooting

### "Not an ArgoCD page"
Make sure you're on a page that contains ArgoCD. The extension looks for ArgoCD indicators in the page.

### "Failed to fetch data"
- Verify you're logged into ArgoCD
- Check if ArgoCD API is accessible
- Try refreshing the ArgoCD page and reopening the extension

### No images shown
Some applications may not have container images if they only contain ConfigMaps, Secrets, or other non-container resources.

## Privacy

Zargov runs entirely in your browser:
- No data is sent to external servers
- No analytics or tracking
- All API calls use your existing session

## License

MIT License
