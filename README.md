# Context Builder - Chrome Extension

Streamline gathering, formatting, and deployment of contexts for AI agents.

## Setup Instructions

1. Clone the repository.
2. Create a `.env` file in the root directory based on `.env.example`:
   ```
   CLIENT_ID=your_google_oauth_client_id
   ```
3. Run the setup script to generate `manifest.json`:
   ```bash
   node generate-manifest.js
   ```
4. Load the extension in Chrome:
   * Go to `chrome://extensions/`.
   * Enable "Developer mode".
   * Click "Load unpacked" and select the extension directory.

## Features
- **Build Context**: Highlight text and add it to active context via context menu or shortcut.
- **Smart Scraping**: Extract main content from pages using Readability and Turndown.
- **Google Docs Sync**: Sync contexts to a single, persistent document with outline navigation.
