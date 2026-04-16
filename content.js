if (window.hasContextBuilderInjected) {
  // Skip if already injected
} else {
  window.hasContextBuilderInjected = true;

  // Feature 4: In-Browser Injection

  function findChatInput() {
    const gemini = document.querySelector('rich-textarea');
    if (gemini) {
      const root = gemini.shadowRoot || gemini;
      const editor = root.querySelector('div.ql-editor[contenteditable="true"]');
      if (editor) return editor;
    }

    const chatgpt = document.querySelector('#prompt-textarea');
    if (chatgpt) return chatgpt;

    const selectors = [
      'div.ql-editor[contenteditable="true"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Ask"]',
      'div[contenteditable="true"][aria-label*="chat"]',
      'div[contenteditable="true"]',
      'textarea'
    ];

    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el) return el;
    }
    return null;
  }

  let floatingWidgetHost = null;

  function createFloatingWidget() {
    if (document.getElementById('ctx-floating-widget-host')) {
      return;
    }

    if (!document.documentElement) {
      return;
    }

    // Create Host Element
    floatingWidgetHost = document.createElement('div');
    floatingWidgetHost.id = 'ctx-floating-widget-host';

    // Position Host
    Object.assign(floatingWidgetHost.style, {
      position: 'fixed',
      top: '100px',
      right: '20px',
      zIndex: '2147483647'
    });

    // Attach Shadow DOM for style isolation
    const shadow = floatingWidgetHost.attachShadow({ mode: 'open' });

    // Create Style Element inside Shadow DOM
    const style = document.createElement('style');
    style.textContent = `
      .ctx-floating-widget {
        display: flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        position: relative !important;
        /* Beach Theme: Sand to Ocean Gradient */
        background: linear-gradient(135deg, rgba(254, 243, 199, 0.9) 0%, rgba(224, 242, 254, 0.9) 100%);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 16px;
        padding: 12px 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
        font-family: system-ui, -apple-system, sans-serif;
        width: 250px;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        transition: box-shadow 0.3s ease, transform 0.3s ease;
        overflow: hidden;
        user-select: none;
      }

      .ctx-floating-widget:hover {
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        transform: translateY(-2px);
      }

      .ctx-widget-content {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 12px;
      }

      .ctx-widget-info {
        display: flex;
        flex-direction: column;
        cursor: move;
        flex: 1;
        min-width: 0;
      }

      .ctx-widget-title {
        font-size: 9px;
        font-weight: 700;
        color: #b45309; /* Warm sand/amber color */
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .ctx-active-name {
        font-size: 14px;
        font-weight: 700;
        color: #0c4a6e; /* Deep ocean blue */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .ctx-widget-actions {
        display: flex;
        flex-shrink: 0;
      }

      .ctx-widget-btn {
        padding: 8px 14px;
        font-size: 13px;
        font-weight: 700;
        border-radius: 10px;
        border: none;
        cursor: pointer;
        transition: background-color 0.2s, transform 0.1s, box-shadow 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
        /* New Blue Shade for Paste Button */
        background-color: #0284c7; /* Sky 600 */
        color: white;
        box-shadow: 0 4px 6px rgba(2, 132, 199, 0.2);
      }

      .ctx-widget-btn:hover {
        background-color: #0369a1; /* Sky 700 */
        box-shadow: 0 6px 12px rgba(2, 132, 199, 0.3);
      }

      .ctx-widget-btn:active {
        transform: scale(0.95);
      }

      /* Beach Waves Effect */
      .ctx-waves-bg {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        pointer-events: none;
      }

      .ctx-wave {
        position: absolute;
        width: 200%;
        height: 200%;
        top: 70%;
        left: -50%;
        background: linear-gradient(to bottom, rgba(255, 255, 255, 0.95) 0%, rgba(45, 212, 191, 0.15) 50%, rgba(20, 184, 166, 0.2) 100%);
        border-radius: 43%;
        animation: ctx-wave-spin 35s linear infinite;
      }

      .ctx-wave-2 {
        top: 75%;
        background: linear-gradient(to bottom, rgba(255, 255, 255, 0.9) 0%, rgba(52, 211, 153, 0.1) 50%, rgba(16, 185, 129, 0.15) 100%);
        border-radius: 40%;
        animation: ctx-wave-spin 45s linear infinite reverse;
        opacity: 0.6;
      }

      @keyframes ctx-wave-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .ctx-toggle-wrapper {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        font-weight: 700;
        color: #0369a1;
        background: rgba(255, 255, 255, 0.9);
        padding: 3px 8px;
        border-radius: 20px;
        border: 1px solid #0284c7;
        box-shadow: 0 2px 4px rgba(2, 132, 199, 0.1);
        margin-top: 4px;
        width: fit-content;
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }

      .ctx-switch {
        position: relative;
        display: inline-block;
        width: 28px;
        height: 16px;
      }

      .ctx-switch input {
        opacity: 0;
        width: 0;
        height: 0;
      }

      .ctx-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #cbd5e1;
        transition: .4s;
        border-radius: 16px;
      }

      .ctx-slider:before {
        position: absolute;
        content: "";
        height: 12px;
        width: 12px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: .4s;
        border-radius: 50%;
      }

      input:checked + .ctx-slider {
        background-color: #0284c7;
      }

      input:checked + .ctx-slider:before {
        transform: translateX(12px);
      }
    `;
    shadow.appendChild(style);

    // Create Widget Element
    const floatingWidget = document.createElement('div');
    floatingWidget.className = 'ctx-floating-widget';

    // Waves Background
    const wavesBg = document.createElement('div');
    wavesBg.className = 'ctx-waves-bg';

    const wave1 = document.createElement('div');
    wave1.className = 'ctx-wave';
    const wave2 = document.createElement('div');
    wave2.className = 'ctx-wave ctx-wave-2';

    wavesBg.appendChild(wave1);
    wavesBg.appendChild(wave2);
    floatingWidget.appendChild(wavesBg);

    // Content Wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'ctx-widget-content';

    // Info Section
    const infoSection = document.createElement('div');
    infoSection.className = 'ctx-widget-info';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'ctx-widget-title';
    titleSpan.textContent = 'ContextBuilder';

    const nameSpan = document.createElement('span');
    nameSpan.id = 'ctx-active-name';
    nameSpan.className = 'ctx-active-name';
    nameSpan.textContent = 'Loading...';

    infoSection.appendChild(titleSpan);
    infoSection.appendChild(nameSpan);
    contentWrapper.appendChild(infoSection);

    // Actions Section
    const actions = document.createElement('div');
    actions.className = 'ctx-widget-actions';
    actions.style.display = 'flex';
    actions.style.alignItems = 'center';
    actions.style.gap = '8px';

    // Compression Toggle
    const toggleWrapper = document.createElement('div');
    toggleWrapper.className = 'ctx-toggle-wrapper';

    const toggleLabel = document.createElement('span');
    toggleLabel.textContent = 'Compress';

    const switchLabel = document.createElement('label');
    switchLabel.className = 'ctx-switch';

    const toggleInput = document.createElement('input');
    toggleInput.type = 'checkbox';
    toggleInput.id = 'ctx-compress-toggle';

    const sliderSpan = document.createElement('span');
    sliderSpan.className = 'ctx-slider';

    switchLabel.appendChild(toggleInput);
    switchLabel.appendChild(sliderSpan);

    toggleWrapper.appendChild(toggleLabel);
    toggleWrapper.appendChild(switchLabel);

    infoSection.appendChild(toggleWrapper);

    const pasteActionBtn = document.createElement('button');
    pasteActionBtn.id = 'ctx-paste-action-btn';
    pasteActionBtn.className = 'ctx-widget-btn';
    pasteActionBtn.textContent = '⌨️ Paste';

    actions.appendChild(pasteActionBtn);
    contentWrapper.appendChild(actions);

    floatingWidget.appendChild(contentWrapper);
    shadow.appendChild(floatingWidget);

    // Append Host to documentElement
    document.documentElement.appendChild(floatingWidgetHost);

    // Load toggle state
    chrome.storage.local.get(['compressEnabled'], (data) => {
      toggleInput.checked = data.compressEnabled || false;
    });

    // Save toggle state
    toggleInput.addEventListener('change', () => {
      chrome.storage.local.set({ compressEnabled: toggleInput.checked });
    });

    // Setup listeners
    pasteActionBtn.addEventListener('click', async () => {
      const inputEl = findChatInput();
      const data = await chrome.storage.local.get(['contexts', 'activeContextId']);
      const activeId = data.activeContextId;
      const contexts = data.contexts;

      if (!activeId || !contexts || !contexts[activeId]) return;
      let content = contexts[activeId].content;

      if (toggleInput.checked && window.compressText) {
        content = window.compressText(content);
      }

      if (!inputEl) {
        alert('Input not found.');
        return;
      }

      try {
        inputEl.focus();
        if (inputEl.isContentEditable) {
          const range = document.createRange();
          range.selectNodeContents(inputEl);
          range.collapse(false);
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        document.execCommand('insertText', false, content);
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));

        const oldText = pasteActionBtn.textContent;
        pasteActionBtn.textContent = '✅ Pasted!';
        setTimeout(() => { pasteActionBtn.textContent = oldText; }, 2000);
      } catch (err) {
        console.error(err);
      }
    });

    // Drag and Drop Logic
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    infoSection.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      if (e.target === infoSection || infoSection.contains(e.target)) {
        isDragging = true;
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        xOffset = currentX;
        yOffset = currentY;
        floatingWidgetHost.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      }
    }

    function dragEnd(e) {
      initialX = currentX;
      initialY = currentY;
      isDragging = false;
    }

    // Update Header
    async function updateWidgetHeader() {
      const data = await chrome.storage.local.get(['contexts', 'activeContextId']);
      const activeId = data.activeContextId;
      const contexts = data.contexts;
      if (activeId && contexts && contexts[activeId]) {
        const nameSpan = shadow.getElementById('ctx-active-name');
        if (nameSpan) {
          nameSpan.textContent = contexts[activeId].name;
        }
      }
    }

    updateWidgetHeader();

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.contexts || changes.activeContextId) {
        updateWidgetHeader();
      }
    });
  }

  // Polling to ensure widget exists on supported sites
  setInterval(() => {
    const url = window.location.href;
    if (url.includes('chatgpt.com') || url.includes('chat.openai.com') || url.includes('claude.ai')) {
      if (!document.getElementById('ctx-floating-widget-host')) {
        createFloatingWidget();
      }
    }
  }, 2000);

  // Initial run
  const url = window.location.href;
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com') || url.includes('claude.ai')) {
    window.addEventListener('load', createFloatingWidget);
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      createFloatingWidget();
    }
  }
}
