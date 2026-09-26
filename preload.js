const { contextBridge, ipcRenderer } = require('electron');

const api = {
  onStatus: (callback) => ipcRenderer.on('status', (_, msg) => callback(msg)),
  onProgress: (callback) => ipcRenderer.on('progress', (_, val) => callback(val)),
  openLogs: () => {
    ipcRenderer.send('open-logs-window');
  },
  openExternal: (url) => {
    ipcRenderer.send('open-external', url);
  }
};

// Expose to window
try {
  contextBridge.exposeInMainWorld('brickcode', api);
} catch (e) {
  window.brickcode = api;
}

// Global window event listeners and keyboard shortcut
window.addEventListener('DOMContentLoaded', () => {
  // Global shortcut: Ctrl+Shift+L or Alt+L
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') ||
        (e.altKey && e.key.toLowerCase() === 'l')) {
      e.preventDefault();
      ipcRenderer.send('open-logs-window');
    }
  });

  // Custom DOM event fallback
  window.addEventListener('open-logs-request', () => {
    ipcRenderer.send('open-logs-window');
  });

  window.addEventListener('open-external-request', (e) => {
    if (e.detail) ipcRenderer.send('open-external', e.detail);
  });

  // Dynamic DOM injection fallback for Settings menu
  function injectMenuItems() {
    const menus = document.querySelectorAll('#settings-menuitem .menu, #settings-menuitem + .menu, .settings-menuitem .menu, .ui.dropdown.active .menu, .ui.popup .menu');
    menus.forEach(menu => {
      const text = menu.textContent || '';
      const isSettings = text.includes('Сброс') || text.includes('Reset') || text.includes('Информация') || text.includes('About') || text.includes('Настройки') || menu.closest('#settings-menuitem, .settings-menuitem');
      if (!isSettings) return;

      // 1. Logs
      if (!menu.querySelector('.injected-logs-item') && !text.includes('Логи')) {
        const item = document.createElement('div');
        item.className = 'item base-menuitem injected-logs-item';
        item.role = 'menuitem';
        item.tabIndex = 0;
        item.innerHTML = '<i class="icon terminal"></i><span class="text">Логи</span>';
        item.title = 'Открыть журнал логов';
        item.style.cursor = 'pointer';
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          api.openLogs();
        });
        menu.appendChild(item);
      }

      // 2. romdev1
      if (!menu.querySelector('.injected-author-romdev') && !text.includes('romdev1')) {
        const item = document.createElement('div');
        item.className = 'item base-menuitem injected-author-romdev';
        item.role = 'menuitem';
        item.tabIndex = 0;
        item.innerHTML = '<i class="icon user"></i><span class="text">Приложение: romdev1</span>';
        item.title = 'GitHub: https://github.com/romdev1';
        item.style.cursor = 'pointer';
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          api.openExternal('https://github.com/romdev1');
        });
        menu.appendChild(item);
      }

      // 3. THEB0NNY
      if (!menu.querySelector('.injected-author-bonny') && !text.includes('THEB0NNY')) {
        const item = document.createElement('div');
        item.className = 'item base-menuitem injected-author-bonny';
        item.role = 'menuitem';
        item.tabIndex = 0;
        item.innerHTML = '<i class="icon heart"></i><span class="text">Создатель BrickCode: THEB0NNY</span>';
        item.title = 'GitHub: https://github.com/THEb0nny';
        item.style.cursor = 'pointer';
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          api.openExternal('https://github.com/THEb0nny');
        });
        menu.appendChild(item);
      }
    });
  }

  const observer = new MutationObserver(injectMenuItems);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', () => {
    setTimeout(injectMenuItems, 50);
    setTimeout(injectMenuItems, 150);
  });
});
