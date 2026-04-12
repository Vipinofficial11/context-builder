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
        const toast = document.createElement('div');
        toast.textContent = `Added to [${name}]`;

        Object.assign(toast.style, {
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: '#1f2937',
          color: 'white',
          padding: '10px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          zIndex: '100000',
          fontSize: '14px',
          fontWeight: '500',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          transition: 'opacity 0.3s, transform 0.3s',
          opacity: '0',
          transform: 'translateY(-10px)'
        });

        document.body.appendChild(toast);
        toast.offsetHeight; // Trigger reflow

        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';

        setTimeout(() => {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(-10px)';
          setTimeout(() => toast.remove(), 300);
        }, 2000);
      },
      args: [contextName]
    });
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
