// Global Selection Capture Toolbar
document.addEventListener('mouseup', (e) => {
  // Ignore clicks inside our own widget to prevent recursive loops
  if (e.target.closest('.ctx-capture-toolbar-host')) return;

  // Cleanup existing
  const existing = document.querySelector('.ctx-capture-toolbar-host');
  if (existing) existing.remove();

  const selection = window.getSelection();
  const text = selection.toString().trim();

  if (text.length > 0) {
    // Don't show in inputs or textareas
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    const host = document.createElement('div');
    host.className = 'ctx-capture-toolbar-host';
    const shadow = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = `
      .ctx-capture-btn {
        position: absolute;
        background: linear-gradient(135deg, #0284c7, #0369a1);
        color: white;
        border: 1px solid #0c4a6e;
        border-radius: 20px;
        padding: 6px 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3), 0 2px 4px rgba(2, 132, 199, 0.2);
        display: flex;
        align-items: center;
        gap: 6px;
        z-index: 2147483647;
        transform: translate(-50%, -120%);
        animation: ctx-pop-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      }
      .ctx-capture-btn:hover {
        background: linear-gradient(135deg, #0ea5e9, #0284c7);
        transform: translate(-50%, -125%) scale(1.05);
        box-shadow: 0 6px 16px rgba(2, 132, 199, 0.4);
      }
      @keyframes ctx-pop-in {
        0% { opacity: 0; transform: translate(-50%, -100%) scale(0.8); }
        100% { opacity: 1; transform: translate(-50%, -120%) scale(1); }
      }
    `;

    const btn = document.createElement('button');
    btn.className = 'ctx-capture-btn';
    btn.innerHTML = '<span>➕</span> Add to Context';

    // Position directly above the text selection horizontally centered
    btn.style.top = `${rect.top + window.scrollY}px`;
    btn.style.left = `${rect.left + window.scrollX + (rect.width / 2)}px`;

    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      chrome.runtime.sendMessage({ action: 'capture-selection', text: text });
      host.remove();
      selection.removeAllRanges();
    });

    shadow.appendChild(style);
    shadow.appendChild(btn);
    document.body.appendChild(host);
  }
});
