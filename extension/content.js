// LinkBox Chrome Extension — Content Script (Auto-save on Copy)
'use strict';

(function () {
  if (window.__linkboxContentLoaded) return;
  window.__linkboxContentLoaded = true;

  let lastSentUrl = '';
  let toastTimer = null;

  function extractUrl(text) {
    if (!text || typeof text !== 'string') return '';
    const trimmed = text.trim();
    const match = trimmed.match(/^(?:https?:\/\/|www\.)[^\s"'<>]+$/i) || trimmed.match(/(?:https?:\/\/|www\.)[^\s"'<>]+/i);
    if (!match) return '';
    let u = match[0].replace(/[.,;:!?)\]]+$/, '');
    if (/^www\./i.test(u)) u = 'https://' + u;
    try {
      const parsed = new URL(u);
      return /^https?:$/i.test(parsed.protocol) ? parsed.href : '';
    } catch (e) {
      return '';
    }
  }

  function showCornerToast(msg) {
    let el = document.getElementById('linkbox-ext-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'linkbox-ext-toast';
      Object.assign(el.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '2147483647',
        background: '#1A1C20',
        color: '#F3F4F7',
        border: '1px solid rgba(223, 109, 39, 0.55)',
        borderRadius: '12px',
        padding: '10px 14px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
        fontWeight: '700',
        boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
        transition: 'opacity 0.2s ease, transform 0.2s ease',
        pointerEvents: 'none',
        opacity: '0',
        transform: 'translateY(8px)'
      });
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => {
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
    }, 2600);
  }

  function handleCopyEvent(e) {
    let raw = '';
    if (e.clipboardData) {
      try { raw = e.clipboardData.getData('text/plain') || ''; } catch (err) {}
    }
    if (!raw && window.getSelection) {
      raw = String(window.getSelection().toString() || '');
    }
    let linkTitle = '';
    if (!raw && document.activeElement && document.activeElement.tagName === 'A' && document.activeElement.href) {
      raw = document.activeElement.href;
      linkTitle = (document.activeElement.textContent || '').trim();
    }
    const url = extractUrl(raw);
    if (!url || url === lastSentUrl) return;
    lastSentUrl = url;
    setTimeout(() => { if (lastSentUrl === url) lastSentUrl = ''; }, 3000);

    try {
      chrome.runtime.sendMessage({ type: 'SAVE_COPIED_LINK', url, title: linkTitle }, (res) => {
        if (chrome.runtime.lastError || !res) return;
        if (res.status === 'saved') {
          showCornerToast(`LinkBox: Salvo em «${res.item.cat}» ✓`);
        } else if (res.status === 'duplicate') {
          showCornerToast(`LinkBox: Já salvo em «${res.item.cat}»`);
        }
      });
    } catch (err) {}
  }

  document.addEventListener('copy', handleCopyEvent, true);
  document.addEventListener('cut', handleCopyEvent, true);
})();
