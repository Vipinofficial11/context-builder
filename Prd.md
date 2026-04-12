## 🚀 ContextBuilder: Chrome Extension PRD & Agent Guidelines

### 1. Project Overview
ContextBuilder is a Manifest V3 Chrome Extension designed to streamline the gathering, formatting, and deployment of text/code contexts for AI agents. It allows users to scrape text, convert entire web pages to AI-readable Markdown, manage multiple contexts via Google Docs Tabs, and inject these contexts directly into the input fields of popular AI chatbots.

### 2. Core Features & Requirements

#### Feature 1: Context Management (The "Notes" System)
* **Functionality:** A popup UI where users can create, rename, delete, and switch between different "Contexts" (similar to a notes app).
* **Background Sync:** The active context is stored instantly in `chrome.storage.local` to ensure zero lag for the user.

#### Feature 2: "Build Context" Highlight & Capture
* **Functionality:** When the user selects text on any webpage, they can right-click and select "Add to Active Context" from the context menu, or use a keyboard shortcut (e.g., `Ctrl+Shift+X`).
* **Visual Feedback:** A sleek, temporary toast notification appears on the webpage confirming "Added to [Context Name]."

#### Feature 3: Smart Website Scraping (AI-Optimized)
* **Functionality:** A button in the extension popup to "Copy Full Page Content."
* **Optimization:** The extension must strip away boilerplate HTML, navigation bars, and ads. 
* **Agent Instruction:** Use the open-source `Readability.js` (by Mozilla) to extract the main content, and then convert it to Markdown format using a library like `Turndown`. AI models process Markdown significantly better and cheaper than raw HTML.

#### Feature 4: In-Browser Injection (The "Paste Context" Button)
* **Functionality:** The extension must inject a floating, sleek "Paste Context" button directly next to the text input areas of popular AI web apps (e.g., ChatGPT, Claude, Gemini).
* **Action:** Clicking this button immediately pastes the *entirety* of the currently active Context Note into the AI's text bar, bypassing the need to open the extension popup.

#### Feature 5: Google Docs Backend Integration
* **Functionality:** OAuth2 authentication with Google Drive/Docs API via the extension's options page.
* **Architecture:** Upon initial setup, the extension creates a master "AI Contexts" document. Whenever a new context note is created in the extension, a new **Document Tab** is created within that Google Doc. 
* **Fallback Rule:** If the Google Docs API does not yet fully support programmatic creation of the new "Tabs" feature, the agent must fallback to creating a dedicated Google Drive folder containing individual Google Docs for each context.

---

### 3. Antigravity Agent Rules & Guidelines
*(Agent: Follow these strictly during implementation)*

* **Framework & Design:** Use plain JavaScript (ES6+), HTML, and CSS to keep the extension lightweight. For the UI, use a modern CSS framework like Tailwind CSS to ensure a sleek, minimalist design.
* **Manifest Version:** Must use Chrome Extension Manifest V3. Background scripts must be implemented as Service Workers.
* **Permissions:** Request only what is necessary: `storage`, `contextMenus`, `activeTab`, `scripting`, and `identity` (for Google OAuth).
* **API Rate Limiting:** Implement debounce/throttle logic for the Google Docs sync. Do not write to Google Docs on every keystroke/copy. Sync every 5 seconds of inactivity, or on a manual "Sync" button press.

### 4. Security & Testing Guidelines
* **Content Security Policy (CSP):** Ensure Manifest V3 CSP compliance. Do not use `eval()` or inline scripts.
* **Auth Token Handling:** Use `chrome.identity.getAuthToken` for Google OAuth. Never store raw access tokens in plaintext local storage for extended periods.
* **Testing Strategy:** * Write unit tests for the Markdown conversion utility (Turndown + Readability).
    * The Agent must use its **Browser Subagent** to navigate to a dummy webpage, highlight text, and verify the context menu adds it to the local storage properly.
    * The Agent must navigate to an AI interface to visually verify the injection of the "Paste Context" UI button.

---