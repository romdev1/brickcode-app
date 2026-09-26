const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('brickcode', {
  onStatus: (callback) => ipcRenderer.on('status', (_, msg) => callback(msg)),
  onProgress: (callback) => ipcRenderer.on('progress', (_, val) => callback(val)),
  openLogs: () => ipcRenderer.send('open-logs-window')
});

// DOM Injection for Settings menu & Keyboard Shortcut
window.addEventListener('DOMContentLoaded', () => {
  // Global shortcut: Ctrl+Shift+L or Alt+L opens logs window
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') ||
        (e.altKey && e.key.toLowerCase() === 'l')) {
      e.preventDefault();
      ipcRenderer.send('open-logs-window');
    }
  });

  // Inject "Логи" into Settings dropdown if not already rendered by React
  function injectLogsItem() {
    // Look for active dropdown menus
    const menus = document.querySelectorAll('.ui.dropdown.active .menu, .ui.popup .menu, #settings-menuitem + .menu, .settings-menuitem .menu');
    menus.forEach(menu => {
      if (!menu.querySelector('#injected-logs-item')) {
        const item = document.createElement('div');
        item.id = 'injected-logs-item';
        item.role = 'menuitem';
        item.className = 'item base-menuitem';
        item.style.cursor = 'pointer';
        item.innerHTML = `
          <i class="icon terminal" style="margin-right: 0.75em;"></i>
          <span>Журнал логов</span>
        `;
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          ipcRenderer.send('open-logs-window');
        });
        menu.appendChild(item);
      }
    });
  }

  const observer = new MutationObserver(() => {
    injectLogsItem();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  document.addEventListener('click', () => {
    setTimeout(injectLogsItem, 60);
  });
});
