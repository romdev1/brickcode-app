const fs = require('fs');
const path = require('path');

function patchSiteContent(content) {
  let changed = false;

  const logsAction = `try{if(window.brickcode&&window.brickcode.openLogs){window.brickcode.openLogs();}else{window.dispatchEvent(new CustomEvent("open-logs-request"));}}catch(e){window.dispatchEvent(new CustomEvent("open-logs-request"));}}`;
  const romdevAction = `try{if(window.brickcode&&window.brickcode.openExternal){window.brickcode.openExternal("https://github.com/romdev1");}else{window.dispatchEvent(new CustomEvent("open-external-request",{detail:"https://github.com/romdev1"}));}}catch(e){window.open("https://github.com/romdev1","_blank");}}`;
  const bonnyAction = `try{if(window.brickcode&&window.brickcode.openExternal){window.brickcode.openExternal("https://github.com/THEb0nny");}else{window.dispatchEvent(new CustomEvent("open-external-request",{detail:"https://github.com/THEb0nny"}));}}catch(e){window.open("https://github.com/THEb0nny","_blank");}}`;

  // 1. Patch ProjectSettingsMenu (inside active project / editor)
  const projectTarget = 'l.push({role:"menuitem",label:lf("About..."),title:lf("About..."),onClick:this.showAboutDialog})';
  const projectLogsCheck = 'l.push({role:"menuitem",leftIcon:"icon terminal",label:"Логи"';
  if (content.includes(projectTarget) && !content.includes(projectLogsCheck)) {
    const projectReplacement = `${projectTarget},l.push({role:"menuitem",leftIcon:"icon terminal",label:"Логи",title:"Открыть журнал логов",onClick:()=>{${logsAction}}),l.push({role:"menuitem",leftIcon:"icon user",label:"Приложение: romdev1",title:"GitHub: https://github.com/romdev1",onClick:()=>{${romdevAction}}),l.push({role:"menuitem",leftIcon:"icon heart",label:"Создатель BrickCode: THEB0NNY",title:"GitHub: https://github.com/THEb0nny",onClick:()=>{${bonnyAction}}})`;
    content = content.replace(projectTarget, projectReplacement);
    changed = true;
  }

  // 2. Patch SettingsMenu (home page)
  const settingsTarget = 'H.push({role:"menuitem",label:lf("About..."),title:lf("About..."),onClick:this.showAboutDialog})';
  const settingsLogsCheck = 'H.push({role:"menuitem",leftIcon:"icon terminal",label:"Логи"';
  if (content.includes(settingsTarget) && !content.includes(settingsLogsCheck)) {
    const settingsReplacement = `${settingsTarget},H.push({role:"menuitem",leftIcon:"icon terminal",label:"Логи",title:"Открыть журнал логов",onClick:()=>{${logsAction}}),H.push({role:"menuitem",leftIcon:"icon user",label:"Приложение: romdev1",title:"GitHub: https://github.com/romdev1",onClick:()=>{${romdevAction}}),H.push({role:"menuitem",leftIcon:"icon heart",label:"Создатель BrickCode: THEB0NNY",title:"GitHub: https://github.com/THEb0nny",onClick:()=>{${bonnyAction}}})`;
    content = content.replace(settingsTarget, settingsReplacement);
    changed = true;
  }

  return { content, changed };
}

function patchSiteFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const original = fs.readFileSync(filePath, 'utf8');
    const { content, changed } = patchSiteContent(original);
    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`[SitePatcher] Successfully patched: ${filePath}`);
      return true;
    }
  } catch (err) {
    console.error(`[SitePatcher] Error patching ${filePath}:`, err.message);
  }
  return false;
}

function ensureSitePatched(siteDir) {
  if (!siteDir) return;
  const mainJsPath = path.join(siteDir, 'main.js');
  patchSiteFile(mainJsPath);
}

module.exports = {
  patchSiteContent,
  patchSiteFile,
  ensureSitePatched
};
