const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const MAIN_TARGET = 'n.MenuDropdown=e=>{const{id:t,className:c,ariaHidden:u,ariaLabel:d,role:h,items:p,label:f,title:g,icon:m,tabIndex:b,disabled:y}=e,';

const MAIN_INJECTION = `n.MenuDropdown=e=>{const{id:t,className:c,ariaHidden:u,ariaLabel:d,role:h,items:p,label:f,title:g,icon:m,tabIndex:b,disabled:y}=e;if(t==="settings-menuitem"&&p&&!p.some(x=>x&&x.label==="Логи")){p.push({role:"separator"});p.push({role:"menuitem",leftIcon:"icon microchip",label:"Диагностика EV3 (Beta)",title:"Проверка связи Bluetooth / USB и батареи",onClick:()=>{try{if(window.brickcode&&window.brickcode.openEv3Tools){window.brickcode.openEv3Tools();}else{window.dispatchEvent(new CustomEvent("open-ev3-tools-request"));}}catch(err){window.dispatchEvent(new CustomEvent("open-ev3-tools-request"));}}});p.push({role:"menuitem",leftIcon:"icon terminal",label:"Логи",title:"Открыть журнал логов",onClick:()=>{try{if(window.brickcode&&window.brickcode.openLogs){window.brickcode.openLogs();}else{window.dispatchEvent(new CustomEvent("open-logs-request"));}}catch(err){window.dispatchEvent(new CustomEvent("open-logs-request"));}}});p.push({role:"menuitem",leftIcon:"icon user",label:"Приложение: romdev1",title:"GitHub: https://github.com/romdev1",onClick:()=>{try{if(window.brickcode&&window.brickcode.openExternal){window.brickcode.openExternal("https://github.com/romdev1");}else{window.dispatchEvent(new CustomEvent("open-external-request",{detail:"https://github.com/romdev1"}));}}catch(err){window.open("https://github.com/romdev1","_blank");}}});p.push({role:"menuitem",leftIcon:"icon heart",label:"Создатель BrickCode: THEB0NNY",title:"GitHub: https://github.com/THEb0nny",onClick:()=>{try{if(window.brickcode&&window.brickcode.openExternal){window.brickcode.openExternal("https://github.com/THEb0nny");}else{window.dispatchEvent(new CustomEvent("open-external-request",{detail:"https://github.com/THEb0nny"}));}}catch(err){window.open("https://github.com/THEb0nny","_blank");}}});}const `;

const LOADER_STYLES = `<style id="brickcode-ultimate-loader">
  /* BrickCode Cybernetic Dimmer */
  #loading.ui.dimmer, .brickcode-super-dimmer {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    width: 100vw !important;
    height: 100vh !important;
    background: radial-gradient(circle at 50% 45%, #131b2e 0%, #090d16 65%, #05070c 100%) !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 9999999 !important;
    user-select: none !important;
    overflow: hidden !important;
    opacity: 1 !important;
    visibility: visible !important;
    transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1) !important;
  }

  #loading.fade-out {
    opacity: 0 !important;
    transform: scale(1.05) !important;
    pointer-events: none !important;
  }

  .loader-ambient {
    position: absolute;
    width: 100%;
    height: 100%;
    pointer-events: none;
    overflow: hidden;
    z-index: 1;
  }

  .ambient-glow-1 {
    position: absolute;
    top: 35%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 550px;
    height: 550px;
    background: radial-gradient(circle, rgba(88, 171, 65, 0.25) 0%, rgba(0, 229, 255, 0.14) 40%, transparent 70%);
    filter: blur(50px);
    animation: bcdPulseAura 4s ease-in-out infinite alternate;
  }

  .ambient-glow-2 {
    position: absolute;
    top: 55%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(0, 200, 83, 0.18) 0%, transparent 65%);
    filter: blur(40px);
    animation: bcdPulseAura 3s ease-in-out infinite alternate-reverse;
  }

  .cyber-grid {
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
    background-size: 40px 40px;
    background-position: center center;
    mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, transparent 70%);
  }

  .loader-content {
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    animation: bcdLevitate 3.5s ease-in-out infinite;
  }

  .orbit-ring {
    position: absolute;
    border-radius: 50%;
    pointer-events: none;
  }

  .orbit-ring-1 {
    width: 280px;
    height: 280px;
    border: 1.5px dashed rgba(88, 171, 65, 0.35);
    animation: bcdSpinClockwise 18s linear infinite;
  }

  .orbit-ring-2 {
    width: 320px;
    height: 320px;
    border: 1px solid rgba(0, 229, 255, 0.2);
    border-top-color: rgba(0, 229, 255, 0.7);
    border-bottom-color: rgba(88, 171, 65, 0.7);
    animation: bcdSpinCounter 12s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .ev3-brick {
    position: relative;
    width: 170px;
    height: 190px;
    background: linear-gradient(165deg, #242938 0%, #161b26 45%, #0f131c 100%);
    border-radius: 28px;
    box-shadow: 
      0 20px 50px rgba(0, 0, 0, 0.7),
      0 0 0 1px rgba(255, 255, 255, 0.12),
      inset 0 1px 1px rgba(255, 255, 255, 0.25),
      inset 0 -2px 4px rgba(0, 0, 0, 0.6),
      0 0 35px rgba(88, 171, 65, 0.25);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 14px;
    overflow: hidden;
  }

  .brick-studs {
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 18px;
    z-index: 5;
  }

  .stud {
    width: 22px;
    height: 9px;
    background: linear-gradient(to top, #1f2533, #323b4e);
    border-radius: 4px 4px 0 0;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-bottom: none;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }

  .brick-screen {
    position: relative;
    width: 132px;
    height: 84px;
    background: #08120c;
    border-radius: 14px;
    border: 2px solid #202b24;
    box-shadow: 
      inset 0 0 16px rgba(0, 0, 0, 0.9),
      0 0 12px rgba(88, 171, 65, 0.2),
      0 1px 0 rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    margin-top: 4px;
  }

  .screen-grid {
    position: absolute;
    inset: 0;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.4) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 255, 0, 0.03));
    background-size: 100% 3px, 6px 100%;
    pointer-events: none;
    z-index: 4;
    opacity: 0.8;
  }

  .screen-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(88, 171, 65, 0.25) 0%, transparent 80%);
    pointer-events: none;
    z-index: 2;
  }

  .robot-eyes {
    display: flex;
    gap: 16px;
    z-index: 3;
    animation: bcdEyesLookAround 4s ease-in-out infinite;
  }

  .eye {
    width: 38px;
    height: 48px;
    background: #f0fdf4;
    border-radius: 12px;
    position: relative;
    box-shadow: 
      0 0 16px rgba(88, 171, 65, 0.8),
      0 0 30px rgba(0, 229, 255, 0.4);
    overflow: hidden;
    animation: bcdEyeBlink 3.6s ease-in-out infinite;
  }

  .pupil {
    position: absolute;
    width: 20px;
    height: 20px;
    background: #0f172a;
    border-radius: 50%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.8);
    animation: bcdPupilMotion 4s ease-in-out infinite;
  }

  .pupil::after {
    content: '';
    position: absolute;
    width: 6px;
    height: 6px;
    background: #ffffff;
    border-radius: 50%;
    top: 3px;
    right: 3px;
  }

  .brick-controls {
    position: relative;
    width: 72px;
    height: 72px;
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .dpad-bg {
    position: absolute;
    width: 66px;
    height: 66px;
    background: linear-gradient(135deg, #1b212d 0%, #11151e 100%);
    clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.15);
  }

  .center-btn {
    position: relative;
    width: 26px;
    height: 26px;
    background: linear-gradient(145deg, #58AB41 0%, #3d802b 100%);
    border-radius: 7px;
    box-shadow: 
      0 0 14px rgba(88, 171, 65, 0.8),
      inset 0 1px 1px rgba(255, 255, 255, 0.5),
      0 2px 4px rgba(0, 0, 0, 0.5);
    z-index: 5;
    animation: bcdCenterGlow 2s ease-in-out infinite alternate;
  }

  .dpad-arrow {
    position: absolute;
    width: 6px;
    height: 6px;
    background: rgba(255, 255, 255, 0.35);
    border-radius: 1px;
  }
  .arrow-top { top: 6px; }
  .arrow-bottom { bottom: 6px; }
  .arrow-left { left: 6px; }
  .arrow-right { right: 6px; }

  .brand-title {
    margin-top: 32px;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: 4px;
    text-transform: uppercase;
    background: linear-gradient(135deg, #ffffff 0%, #a7f3d0 40%, #58AB41 75%, #00e5ff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 0 24px rgba(88, 171, 65, 0.45);
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .brand-badge {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 1.5px;
    padding: 3px 8px;
    background: rgba(88, 171, 65, 0.18);
    border: 1px solid rgba(88, 171, 65, 0.4);
    color: #4ade80;
    border-radius: 6px;
    -webkit-text-fill-color: initial;
  }

  .brand-subtitle {
    margin-top: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #94a3b8;
    letter-spacing: 0.5px;
  }

  .progress-track {
    margin-top: 22px;
    width: 240px;
    height: 5px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 999px;
    overflow: hidden;
    position: relative;
    box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6);
  }

  .progress-glow-bar {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    width: 45%;
    background: linear-gradient(90deg, transparent, #58AB41, #00e5ff, transparent);
    border-radius: 999px;
    animation: bcdProgressSweep 1.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }

  .status-text {
    margin-top: 14px;
    font-size: 12px;
    font-family: 'Consolas', monospace;
    color: #64748b;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-dot {
    width: 7px;
    height: 7px;
    background: #58AB41;
    border-radius: 50%;
    box-shadow: 0 0 8px #58AB41;
    animation: bcdDotBlink 1.2s infinite ease-in-out;
  }

  #loadingStatusText {
    transition: opacity 0.25s ease-in-out;
  }

  @keyframes bcdLevitate {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }

  @keyframes bcdPulseAura {
    0% { opacity: 0.6; transform: translate(-50%, -50%) scale(0.92); }
    100% { opacity: 1; transform: translate(-50%, -50%) scale(1.08); }
  }

  @keyframes bcdSpinClockwise {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes bcdSpinCounter {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }

  @keyframes bcdEyesLookAround {
    0%, 15% { transform: translate(0, 0); }
    20%, 35% { transform: translate(-7px, 0); }
    40%, 55% { transform: translate(7px, 0); }
    60%, 75% { transform: translate(0, -3px); }
    80%, 100% { transform: translate(0, 0); }
  }

  @keyframes bcdPupilMotion {
    0%, 15% { transform: translate(-50%, -50%); }
    20%, 35% { transform: translate(-80%, -50%); }
    40%, 55% { transform: translate(-20%, -50%); }
    60%, 75% { transform: translate(-50%, -80%); }
    80%, 100% { transform: translate(-50%, -50%); }
  }

  @keyframes bcdEyeBlink {
    0%, 46%, 50%, 100% { transform: scaleY(1); }
    48% { transform: scaleY(0.08); }
  }

  @keyframes bcdCenterGlow {
    0% { box-shadow: 0 0 10px rgba(88, 171, 65, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.4); filter: brightness(0.95); }
    100% { box-shadow: 0 0 24px rgba(0, 229, 255, 0.9), 0 0 14px rgba(88, 171, 65, 0.9), inset 0 1px 2px rgba(255, 255, 255, 0.8); filter: brightness(1.2); }
  }

  @keyframes bcdProgressSweep {
    0% { left: -50%; width: 35%; }
    50% { width: 60%; }
    100% { left: 110%; width: 35%; }
  }

  @keyframes bcdDotBlink {
    0%, 100% { opacity: 0.3; transform: scale(0.85); }
    50% { opacity: 1; transform: scale(1.15); }
  }
</style>`;

const LOADER_HTML = `<div id='loading' class="ui active dimmer brickcode-super-dimmer">
        <div class="loader-ambient">
            <div class="ambient-glow-1"></div>
            <div class="ambient-glow-2"></div>
            <div class="cyber-grid"></div>
        </div>

        <div class="loader-content">
            <div class="orbit-ring orbit-ring-1"></div>
            <div class="orbit-ring orbit-ring-2"></div>

            <div class="ev3-brick">
                <div class="brick-studs">
                    <div class="stud"></div>
                    <div class="stud"></div>
                </div>

                <div class="brick-screen">
                    <div class="screen-grid"></div>
                    <div class="screen-glow"></div>
                    <div class="robot-eyes">
                        <div class="eye"><div class="pupil"></div></div>
                        <div class="eye"><div class="pupil"></div></div>
                    </div>
                </div>

                <div class="brick-controls">
                    <div class="dpad-bg"></div>
                    <div class="dpad-arrow arrow-top"></div>
                    <div class="dpad-arrow arrow-bottom"></div>
                    <div class="dpad-arrow arrow-left"></div>
                    <div class="dpad-arrow arrow-right"></div>
                    <div class="center-btn"></div>
                </div>
            </div>

            <div class="brand-title">
                BrickCode
                <span class="brand-badge">EV3</span>
            </div>
            <p class="brand-subtitle">Загрузка визуального редактора...</p>

            <div class="progress-track">
                <div class="progress-glow-bar"></div>
            </div>

            <div class="status-text">
                <span class="status-dot"></span>
                <span id="loadingStatusText">Инициализация среды BrickCode...</span>
            </div>
        </div>
        <script>
        (function() {
            var minLoadingMs = 3200; // minimum duration to display loading animation smoothly
            var startTime = Date.now();
            var loadingEl = document.getElementById("loading");

            // 1. Animated telemetry status messages
            var phrases = [
                "Инициализация среды BrickCode...",
                "Загрузка блоков и симулятора EV3...",
                "Подготовка рабочего пространства...",
                "Готово!"
            ];
            var phraseIdx = 0;
            var el = document.getElementById("loadingStatusText");
            var phraseInterval = null;
            if (el) {
                phraseInterval = setInterval(function() {
                    phraseIdx++;
                    if (phraseIdx < phrases.length) {
                        el.style.opacity = '0';
                        setTimeout(function() {
                            if (el) {
                                el.textContent = phrases[phraseIdx];
                                el.style.opacity = '1';
                            }
                        }, 200);
                    }
                }, 900);
            }

            // 2. Smooth delayed dismiss handler
            var isDismissed = false;
            function triggerSmoothDismiss() {
                if (isDismissed) return;
                isDismissed = true;
                if (phraseInterval) clearInterval(phraseInterval);
                if (el) {
                    el.textContent = "Готово!";
                    el.style.opacity = '1';
                }
                if (loadingEl) {
                    loadingEl.classList.add("fade-out");
                    setTimeout(function() {
                        try {
                            if (origRemoveChild && loadingEl && loadingEl.parentNode) {
                                origRemoveChild(loadingEl);
                            } else if (loadingEl && loadingEl.parentNode) {
                                loadingEl.parentNode.removeChild(loadingEl);
                            }
                        } catch (e) {}
                    }, 500);
                }
            }

            function requestDismiss() {
                var elapsed = Date.now() - startTime;
                var remaining = Math.max(0, minLoadingMs - elapsed);
                setTimeout(triggerSmoothDismiss, remaining);
            }

            // Intercept remove on loadingEl directly
            if (loadingEl) {
                loadingEl.remove = function() {
                    requestDismiss();
                };
            }

            // Intercept removeChild on parent container (document.body)
            var origRemoveChild = null;
            if (loadingEl && loadingEl.parentNode) {
                origRemoveChild = loadingEl.parentNode.removeChild.bind(loadingEl.parentNode);
                loadingEl.parentNode.removeChild = function(child) {
                    if (child === loadingEl || (child && child.id === "loading")) {
                        requestDismiss();
                        return child;
                    }
                    return origRemoveChild(child);
                };
            }
        })();
        </script>
    </div>`;

function patchMainJs(content) {
  if (content.includes('Диагностика EV3') && content.includes('Логи') && content.includes('romdev1')) {
    return content;
  }
  // If has previous injection without EV3 tools
  if (content.includes('settings-menuitem') && content.includes('Логи')) {
    const existingInjectionRegex = /n\.MenuDropdown=e=>\{const\{id:t,className:c,ariaHidden:u,ariaLabel:d,role:h,items:p,label:f,title:g,icon:m,tabIndex:b,disabled:y\}=e;if\(t==="settings-menuitem"[\s\S]*?\}\);\}const /;
    if (existingInjectionRegex.test(content)) {
      return content.replace(existingInjectionRegex, MAIN_INJECTION);
    }
  }
  if (!content.includes(MAIN_TARGET)) {
    console.warn('[SitePatcher] MAIN_TARGET not found in main.js');
    return content;
  }
  return content.replace(MAIN_TARGET, MAIN_INJECTION);
}

function patchIndexHtml(content) {
  let res = content;

  // 1. Inject or update loader styles in <head>
  if (res.includes('id="brickcode-ultimate-loader"')) {
    res = res.replace(/<style id="brickcode-ultimate-loader">[\s\S]*?<\/style>/, LOADER_STYLES);
  } else {
    res = res.replace('</head>', `${LOADER_STYLES}\n</head>`);
  }

  // 2. Replace loading block up to custom-content
  const loadingLookahead = /<div id=['"]loading['"][\s\S]*?(?=<div id=['"]custom-content['"])/;
  if (loadingLookahead.test(res)) {
    res = res.replace(loadingLookahead, `${LOADER_HTML}\n\n    `);
  } else if (res.includes('loader msft')) {
    res = res.replace(/<div class="ui large main loader msft"><\/div>/g, LOADER_HTML);
  }

  return res;
}

function patchCss(content) {
  let res = content;
  // Disable Microsoft sprite animation
  res = res.replace(/\.ui\.loader\.main\.msft:after/g, '.ui.loader.main.disabled_msft:after');
  // Make EV3 / BrickCode loader animations unconditional
  res = res.replace(/:not\(\.msft\)/g, '');
  return res;
}

function applyPatchesToDir(dirPath) {
  if (!fs.existsSync(dirPath)) return;

  const mainPath = path.join(dirPath, 'main.js');
  if (fs.existsSync(mainPath)) {
    const orig = fs.readFileSync(mainPath, 'utf8');
    const patched = patchMainJs(orig);
    if (patched !== orig) {
      fs.writeFileSync(mainPath, patched, 'utf8');
      console.log('[SitePatcher] Successfully patched main.js in', dirPath);
    }
  }

  const indexPath = path.join(dirPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    const orig = fs.readFileSync(indexPath, 'utf8');
    const patched = patchIndexHtml(orig);
    if (patched !== orig) {
      fs.writeFileSync(indexPath, patched, 'utf8');
      console.log('[SitePatcher] Successfully patched index.html in', dirPath);
    }
  }

  ['semantic.css', 'rtlsemantic.css'].forEach(cssFile => {
    const cssPath = path.join(dirPath, cssFile);
    if (fs.existsSync(cssPath)) {
      const orig = fs.readFileSync(cssPath, 'utf8');
      const patched = patchCss(orig);
      if (patched !== orig) {
        fs.writeFileSync(cssPath, patched, 'utf8');
        console.log(`[SitePatcher] Successfully patched ${cssFile} in`, dirPath);
      }
    }
  });
}

function applyPatchesToZip(zipFilePath) {
  if (!fs.existsSync(zipFilePath)) return;

  console.log('[SitePatcher] Patching zip archive:', zipFilePath);
  const zip = new AdmZip(zipFilePath);

  const mainEntry = zip.getEntry('main.js');
  if (mainEntry) {
    const orig = zip.readAsText(mainEntry);
    const patched = patchMainJs(orig);
    if (patched !== orig) {
      zip.updateFile('main.js', Buffer.from(patched, 'utf8'));
      console.log('[SitePatcher] Updated main.js in zip');
    }
  }

  const indexEntry = zip.getEntry('index.html');
  if (indexEntry) {
    const orig = zip.readAsText(indexEntry);
    const patched = patchIndexHtml(orig);
    if (patched !== orig) {
      zip.updateFile('index.html', Buffer.from(patched, 'utf8'));
      console.log('[SitePatcher] Updated index.html in zip');
    }
  }

  ['semantic.css', 'rtlsemantic.css'].forEach(cssFile => {
    const entry = zip.getEntry(cssFile);
    if (entry) {
      const orig = zip.readAsText(entry);
      const patched = patchCss(orig);
      if (patched !== orig) {
        zip.updateFile(cssFile, Buffer.from(patched, 'utf8'));
        console.log(`[SitePatcher] Updated ${cssFile} in zip`);
      }
    }
  });

  zip.writeZip(zipFilePath);
  console.log('[SitePatcher] Zip archive written successfully.');
}

module.exports = {
  patchMainJs,
  patchIndexHtml,
  patchCss,
  applyPatchesToDir,
  applyPatchesToZip
};
