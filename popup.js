document.addEventListener('DOMContentLoaded', async () => {
  const contextSelect = document.getElementById('contextSelect');
  const contextContent = document.getElementById('contextContent');
  const charCount = document.getElementById('charCount');
  const newContextNameInput = document.getElementById('newContextName');
  const createContextBtn = document.getElementById('createContextBtn');
  const renameContextBtn = document.getElementById('renameContextBtn');
  const deleteContextBtn = document.getElementById('deleteContextBtn');
  const copyPageBtn = document.getElementById('copyPageBtn');
  const syncBtn = document.getElementById('syncBtn');
  const optionsBtn = document.getElementById('optionsBtn');

  let state = {
    contexts: {
      'default': { name: 'Default Context', content: '' }
    },
    activeContextId: 'default'
  };

  // Load state from storage
  const loadedState = await chrome.storage.local.get(['contexts', 'activeContextId']);
  if (loadedState.contexts) {
    state.contexts = loadedState.contexts;
  }
  if (loadedState.activeContextId) {
    state.activeContextId = loadedState.activeContextId;
  } else {
    // Ensure default exists if nothing loaded
    if (!state.contexts['default']) {
      state.contexts['default'] = { name: 'Default Context', content: '' };
    }
    state.activeContextId = 'default';
  }

  async function saveState() {
    await chrome.storage.local.set(state);
    console.log('State saved:', state);
  }

  function renderContextSelect() {
    contextSelect.innerHTML = '';
    for (const id in state.contexts) {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = state.contexts[id].name;
      option.selected = (id === state.activeContextId);
      contextSelect.appendChild(option);
    }
  }

  function updatePreview() {
    const active = state.contexts[state.activeContextId];
    if (active) {
      contextContent.value = active.content;
      charCount.textContent = `${active.content.length} chars`;
    }
  }

  // Initial render
  renderContextSelect();
  updatePreview();

  // Event Listeners
  contextSelect.addEventListener('change', (e) => {
    state.activeContextId = e.target.value;
    updatePreview();
    saveState();
  });

  let debounceTimer;
  contextContent.addEventListener('input', (e) => {
    const active = state.contexts[state.activeContextId];
    if (active) {
      active.content = e.target.value;
      charCount.textContent = `${active.content.length} chars`;
      
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        saveState();
      }, 500);
    }
  });

  createContextBtn.addEventListener('click', () => {
    const name = newContextNameInput.value.trim();
    if (!name) return;

    const id = 'ctx_' + Date.now();
    state.contexts[id] = { name: name, content: '' };
    state.activeContextId = id;

    newContextNameInput.value = '';
    renderContextSelect();
    updatePreview();
    saveState();
  });

  renameContextBtn.addEventListener('click', () => {
    const active = state.contexts[state.activeContextId];
    if (!active) return;

    const newName = prompt('Enter new name for "' + active.name + '":', active.name);
    if (newName && newName.trim()) {
      active.name = newName.trim();
      renderContextSelect();
      saveState();
    }
  });

  deleteContextBtn.addEventListener('click', () => {
    const activeId = state.activeContextId;
    if (activeId === 'default' && Object.keys(state.contexts).length === 1) {
      alert('Cannot delete the last remaining context.');
      return;
    }

    const active = state.contexts[activeId];
    if (confirm(`Are you sure you want to delete "${active.name}"?`)) {
      delete state.contexts[activeId];

      // Set new active context
      const remainingIds = Object.keys(state.contexts);
      state.activeContextId = remainingIds[0] || 'default';

      if (remainingIds.length === 0) {
        state.contexts['default'] = { name: 'Default Context', content: '' };
        state.activeContextId = 'default';
      }

      renderContextSelect();
      updatePreview();
      saveState();
    }
  });

  copyPageBtn.addEventListener('click', async () => {
    // Feature 3: Smart Website Scraping
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) return;

    try {
      // Inject libraries and scrape script
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['libs/readability.js', 'libs/turndown.js', 'scrape.js']
      });

      const response = results[0].result;

      if (response && response.content) {
        const active = state.contexts[state.activeContextId];
        if (active) {
          const title = response.title ? `# ${response.title}\n\n` : '';
          active.content += (active.content ? '\n\n' : '') + title + response.content;
          updatePreview();
          saveState();
          alert('Page content added to context!');
        }
      } else if (response && response.error) {
        alert('Scrape error: ' + response.error);
      } else {
        alert('Failed to scrape page or no content found.');
      }
    } catch (error) {
      console.error('Error scraping page:', error);
      alert('Could not scrape page. Ensure you have permission to access this site.');
    }
  });

  syncBtn.addEventListener('click', () => {
    const active = state.contexts[state.activeContextId];
    if (!active || !active.content) {
      alert('Active context is empty. Nothing to sync.');
      return;
    }

    const oldText = syncBtn.innerHTML;
    syncBtn.innerHTML = '<span>Syncing...</span>';
    syncBtn.disabled = true;

    chrome.runtime.sendMessage({
      action: 'sync-docs',
      contextId: state.activeContextId
    }, (response) => {
      syncBtn.innerHTML = oldText;
      syncBtn.disabled = false;

      if (response && response.success) {
        alert('Success! Active context synced to Google Docs.');
      } else {
        alert('Sync failed: ' + (response ? response.error : 'Unknown error'));
      }
    });
  });

  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
});
