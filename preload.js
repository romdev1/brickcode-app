const { contextBridge, ipcRenderer } = require('electron');

const api = {
  onStatus: (callback) => ipcRenderer.on('status', (_, msg) => callback(msg)),
  onProgress: (callback) => ipcRenderer.on('progress', (_, val) => callback(val)),
  openLogs: () => {
    ipcRenderer.send('open-logs-window');
  },
  openEv3Tools: () => {
    ipcRenderer.send('open-ev3-tools-window');
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

  window.addEventListener('open-ev3-tools-request', () => {
    ipcRenderer.send('open-ev3-tools-window');
  });

  window.addEventListener('open-external-request', (e) => {
    if (e.detail) ipcRenderer.send('open-external', e.detail);
  });

  // Dynamic DOM injection fallback for Settings menu
  function injectMenuItems() {
    const menus = document.querySelectorAll(
      '#settings-menuitem-menu, .common-menu-dropdown-pane, ul[id*="settings"], #settings-menuitem .menu, #settings-menuitem + .menu, .settings-menuitem .menu, .ui.dropdown.active .menu, .ui.popup .menu, [role="menu"]'
    );
    menus.forEach(menu => {
      const text = menu.textContent || '';
      const isSettings = (menu.id && menu.id.includes('settings')) ||
                         menu.closest('.settings-menuitem, #settings-menuitem') ||
                         text.includes('Сброс') || text.includes('Reset') ||
                         text.includes('Информация') || text.includes('About') ||
                         text.includes('Настройки');
      if (!isSettings) return;

      const isUl = menu.tagName.toLowerCase() === 'ul';

      function createMenuItem(cls, iconClass, labelText, hint, onClick) {
        const item = document.createElement(isUl ? 'li' : 'div');
        item.className = isUl ? `common-menu-dropdown-item ${cls}` : `item base-menuitem ${cls}`;
        item.setAttribute('role', 'menuitem');
        item.tabIndex = -1;
        item.style.cursor = 'pointer';
        item.title = hint;
        if (isUl) {
          item.innerHTML = `<span class="common-button-flex"><i class="${iconClass}" aria-hidden="true"></i><span class="common-button-label">${labelText}</span></span>`;
        } else {
          item.innerHTML = `<i class="${iconClass}"></i><span class="text">${labelText}</span>`;
        }
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onClick();
        });
        return item;
      }

      // Add separator if ul and has other items
      if (isUl && !menu.querySelector('.injected-separator') && !text.includes('Логи')) {
        const sep = document.createElement('li');
        sep.className = 'common-menu-dropdown-separator injected-separator';
        sep.setAttribute('role', 'separator');
        menu.appendChild(sep);
      }

      // 0. EV3 Tools (Beta)
      if (!menu.querySelector('.injected-ev3-tools-item') && !text.includes('Диагностика EV3')) {
        menu.appendChild(createMenuItem('injected-ev3-tools-item', 'icon microchip', 'Диагностика EV3 (Beta)', 'Проверка связи Bluetooth / USB и батареи', () => {
          api.openEv3Tools();
        }));
      }

      // 1. Logs
      if (!menu.querySelector('.injected-logs-item') && !text.includes('Логи')) {
        menu.appendChild(createMenuItem('injected-logs-item', 'icon terminal', 'Логи', 'Открыть журнал логов', () => {
          api.openLogs();
        }));
      }

      // 2. romdev1
      if (!menu.querySelector('.injected-author-romdev') && !text.includes('romdev1')) {
        menu.appendChild(createMenuItem('injected-author-romdev', 'icon user', 'Приложение: romdev1', 'GitHub: https://github.com/romdev1', () => {
          api.openExternal('https://github.com/romdev1');
        }));
      }

      // 3. THEB0NNY
      if (!menu.querySelector('.injected-author-bonny') && !text.includes('THEB0NNY')) {
        menu.appendChild(createMenuItem('injected-author-bonny', 'icon heart', 'Создатель BrickCode: THEB0NNY', 'GitHub: https://github.com/THEb0nny', () => {
          api.openExternal('https://github.com/THEb0nny');
        }));
      }
    });
  }

  const observer = new MutationObserver(injectMenuItems);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('click', () => {
    setTimeout(injectMenuItems, 20);
    setTimeout(injectMenuItems, 80);
    setTimeout(injectMenuItems, 200);
  });
  document.addEventListener('mousedown', () => {
    setTimeout(injectMenuItems, 20);
    setTimeout(injectMenuItems, 80);
  });
});
