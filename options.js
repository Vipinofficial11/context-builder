document.addEventListener('DOMContentLoaded', async () => {
  const authStatus = document.getElementById('authStatus');
  const authBtn = document.getElementById('authBtn');
  const useTabsFallback = document.getElementById('useTabsFallback');

  // Load settings
  const settings = await chrome.storage.local.get(['googleDocsConnected', 'useTabsFallback']);
  
  if (settings.googleDocsConnected) {
    authStatus.textContent = 'Connected';
    authStatus.className = 'text-sm text-green-500 font-medium ml-1';
    authBtn.textContent = 'Disconnect';
  }

  if (settings.useTabsFallback) {
    useTabsFallback.checked = true;
  }

  useTabsFallback.addEventListener('change', (e) => {
    chrome.storage.local.set({ useTabsFallback: e.target.checked });
  });

  authBtn.addEventListener('click', async () => {
    const data = await chrome.storage.local.get('googleDocsConnected');
    
    if (data.googleDocsConnected) {
      // Disconnect
      // In a real app, we might revoke the token
      chrome.storage.local.set({ googleDocsConnected: false });
      authStatus.textContent = 'Not Connected';
      authStatus.className = 'text-sm text-red-500 font-medium ml-1';
      authBtn.textContent = 'Connect Google Account';
      alert('Disconnected from Google Account.');
    } else {
      // Connect
      try {
        // Feature 5: OAuth2 authentication
        // This will prompt the user if interactive is true
        // and if manifest has correct client_id and scopes.
        // Since we have a placeholder client_id, this will fail unless the user replaces it.
        
        chrome.identity.getAuthToken({ interactive: true }, async function(token) {
          if (chrome.runtime.lastError) {
            console.error('Auth failed:', chrome.runtime.lastError);
            alert('Authentication failed: ' + chrome.runtime.lastError.message + '\n\nPlease ensure you have added a valid Client ID to manifest.json.');
            return;
          }

          if (token) {
            console.log('Auth successful, token obtained.');
            chrome.storage.local.set({ googleDocsConnected: true });
            authStatus.textContent = 'Connected';
            authStatus.className = 'text-sm text-green-500 font-medium ml-1';
            authBtn.textContent = 'Disconnect';
            
            // Trigger initial setup or sync
            await setupGoogleDocs(token);
          }
        });
      } catch (error) {
        console.error('Error during auth:', error);
        alert('Error during authentication.');
      }
    }
  });

  async function setupGoogleDocs(token) {
    const useFallback = useTabsFallback.checked;
    
    if (useFallback) {
      console.log('Setting up Folder Fallback...');
      // Implement fallback: Create folder and individual docs
      // We need to use fetch to call Google APIs
      alert('Folder Fallback strategy selected. Setup initiated (simulated).');
    } else {
      console.log('Setting up Master Doc with Tabs...');
      // Implement master doc with tabs
      alert('Master Doc with Tabs strategy selected. Setup initiated (simulated).');
    }
    
    // In a real implementation, we would make fetch calls here:
    // https://www.googleapis.com/drive/v3/files
    // https://docs.googleapis.com/v1/documents
  }
});
