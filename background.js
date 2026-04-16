// Background Service Worker

const DOC_NAME = "Context Builder - Extension";

// Feature 2: "Build Context" Highlight & Capture

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add-to-context",
    title: "Add to Active Context",
    contexts: ["selection"]
  });

  // Initialize storage if empty
  chrome.storage.local.get(['contexts', 'activeContextId'], (data) => {
    if (!data.contexts) {
      chrome.storage.local.set({
        contexts: {
          'default': { name: 'Default Context', content: '' }
        },
        activeContextId: 'default'
      });
    }
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "add-to-context" && info.selectionText) {
    await addTextToContext(info.selectionText, tab);
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "add-to-context") {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
      const result = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });

      const selectedText = result[0].result;
      if (selectedText) {
        await addTextToContext(selectedText, tab);
      }
    } catch (error) {
      console.error('Error getting selection:', error);
    }
  }
});

async function addTextToContext(text, tab) {
  const data = await chrome.storage.local.get(['contexts', 'activeContextId']);
  const activeId = data.activeContextId;
  const contexts = data.contexts;

  if (activeId && contexts && contexts[activeId]) {
    contexts[activeId].content += (contexts[activeId].content ? '\n\n' : '') + text;
    await chrome.storage.local.set({ contexts });

    // Visual feedback: Show toast
    const contextName = contexts[activeId].name;

    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (name) => {
        const host = document.createElement('div');
        const shadow = host.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
          .ctx-toast-widget {
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border: 1px solid #cbd5e1;
            border-radius: 16px;
            padding: 12px 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.1);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            z-index: 2147483647;
            overflow: hidden;
            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), opacity 0.4s ease;
            opacity: 0;
            transform: translateY(20px);
          }

          .ctx-waves-bg {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            z-index: 1; pointer-events: none;
          }
          .ctx-wave {
            position: absolute; width: 200%; height: 200%;
            top: 70%; left: -50%;
            background: linear-gradient(to bottom, rgba(255,255,255,0.95), rgba(45,212,191,0.15), rgba(20,184,166,0.2));
            border-radius: 43%;
            animation: ctx-wave-spin 35s linear infinite;
          }
          .ctx-wave-2 {
            top: 75%;
            background: linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(52,211,153,0.1), rgba(16,185,129,0.15));
            border-radius: 40%;
            animation: ctx-wave-spin 45s linear infinite reverse;
          }
          @keyframes ctx-wave-spin { 100% { transform: rotate(360deg); } }

          .ctx-toast-content {
            display: flex; flex-direction: column; position: relative; z-index: 2;
          }
          .ctx-toast-title {
            font-size: 9px; font-weight: 700; color: #b45309;
            text-transform: uppercase; letter-spacing: 0.05em;
          }
          .ctx-toast-name {
            font-size: 14px; font-weight: 700; color: #0c4a6e;
          }
          .ctx-toast-badge {
            background: #0284c7; color: white;
            font-size: 10px; font-weight: 700;
            padding: 4px 10px; border-radius: 12px;
            text-transform: uppercase; display: flex; align-items: center; gap: 4px;
            position: relative; z-index: 2;
            box-shadow: 0 2px 4px rgba(2, 132, 199, 0.2);
          }
        `;

        const widget = document.createElement('div');
        widget.className = 'ctx-toast-widget';

        const waves = document.createElement('div');
        waves.className = 'ctx-waves-bg';
        waves.innerHTML = '<div class="ctx-wave"></div><div class="ctx-wave ctx-wave-2"></div>';
        widget.appendChild(waves);

        const content = document.createElement('div');
        content.className = 'ctx-toast-content';
        content.innerHTML = `
          <span class="ctx-toast-title">ContextBuilder</span>
          <span class="ctx-toast-name">${name}</span>
        `;
        widget.appendChild(content);

        const badge = document.createElement('div');
        badge.className = 'ctx-toast-badge';
        badge.innerHTML = '<span>✓</span> Added';
        widget.appendChild(badge);

        shadow.appendChild(style);
        shadow.appendChild(widget);
        document.documentElement.appendChild(host);

        widget.offsetHeight;
        widget.style.opacity = '1';
        widget.style.transform = 'translateY(0)';

        setTimeout(() => {
          widget.style.opacity = '0';
          widget.style.transform = 'translateY(20px)';
          setTimeout(() => host.remove(), 400);
        }, 2500);
      },
      args: [contextName]
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'capture-selection') {
    addTextToContext(message.text, sender.tab);
    return;
  }

  if (message.action === 'sync-docs') {
    handleSyncDocs(message.contextId).then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    return true; // Keep channel open
  }
});

async function handleSyncDocs(contextId) {
  const data = await chrome.storage.local.get(['contexts']);
  const contexts = data.contexts;
  const active = contexts[contextId];

  if (!active || !active.content) {
    throw new Error('Context is empty or not found.');
  }

  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true }, async (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      try {
        let docId = null;

        // 1. Search for the document in Drive
        const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(DOC_NAME)}' and mimeType='application/vnd.google-apps.document' and trashed=false`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!searchResponse.ok) {
          throw new Error(`Drive search failed: ${searchResponse.status}`);
        }

        const searchData = await searchResponse.json();
        
        if (searchData.files && searchData.files.length > 0) {
          docId = searchData.files[0].id;
        }

        // 2. If not found, create it
        if (!docId) {
          const createResponse = await fetch('https://docs.googleapis.com/v1/documents', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ title: DOC_NAME })
          });

          if (!createResponse.ok) {
            throw new Error(`Failed to create document: ${createResponse.status}`);
          }

          const doc = await createResponse.json();
          docId = doc.documentId;
        }

        // 3. Fetch document to check for existing heading
        const getResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!getResponse.ok) {
          throw new Error(`Failed to fetch document: ${getResponse.status}`);
        }

        const fullDoc = await getResponse.json();
        const bodyContent = fullDoc.body.content;
        
        let targetHeading = null;
        let nextHeading = null;

        for (let i = 0; i < bodyContent.length; i++) {
          const element = bodyContent[i];
          if (element.paragraph && element.paragraph.paragraphStyle.namedStyleType === 'HEADING_1') {
            const text = element.paragraph.elements.map(el => el.textRun ? el.textRun.content : '').join('').trim();
            if (text === active.name) {
              targetHeading = element;
              for (let j = i + 1; j < bodyContent.length; j++) {
                const nextEl = bodyContent[j];
                if (nextEl.paragraph && nextEl.paragraph.paragraphStyle.namedStyleType === 'HEADING_1') {
                  nextHeading = nextEl;
                  break;
                }
              }
              break;
            }
          }
        }

        let insertIndex = bodyContent[bodyContent.length - 1].endIndex - 1;
        let headingText = `\n\n${active.name}\n`;
        let contentText = `${active.content}\n`;
        let startOfHeading = insertIndex;

        if (targetHeading) {
          // Delete existing section FIRST
          insertIndex = targetHeading.startIndex;
          const deleteEndIndex = nextHeading ? nextHeading.startIndex : bodyContent[bodyContent.length - 1].endIndex - 1;
          
          const deleteResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              requests: [
                {
                  deleteContentRange: {
                    range: {
                      startIndex: insertIndex,
                      endIndex: deleteEndIndex
                    }
                  }
                }
              ]
            })
          });

          if (!deleteResponse.ok) {
            throw new Error(`Failed to delete old section: ${deleteResponse.status}`);
          }

          headingText = `${active.name}\n`;
          startOfHeading = insertIndex;
        }

        // Now Insert the new content
        const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              {
                insertText: {
                  location: { index: insertIndex },
                  text: headingText + contentText
                }
              },
              {
                updateParagraphStyle: {
                  range: {
                    startIndex: targetHeading ? startOfHeading : startOfHeading + 2,
                    endIndex: targetHeading ? startOfHeading + headingText.length - 1 : startOfHeading + headingText.length - 1
                  },
                  paragraphStyle: {
                    namedStyleType: 'HEADING_1'
                  },
                  fields: 'namedStyleType'
                }
              }
            ]
          })
        });

        if (!updateResponse.ok) {
          throw new Error(`Failed to add content: ${updateResponse.status}`);
        }

        chrome.tabs.create({ url: `https://docs.google.com/document/d/${docId}/edit` });
        resolve({ success: true, docId });

      } catch (error) {
        reject(error);
      }
    });
  });
}
