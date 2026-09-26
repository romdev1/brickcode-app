const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const MAIN_TARGET = 'n.MenuDropdown=e=>{const{id:t,className:c,ariaHidden:u,ariaLabel:d,role:h,items:p,label:f,title:g,icon:m,tabIndex:b,disabled:y}=e,';

const MAIN_INJECTION = `n.MenuDropdown=e=>{const{id:t,className:c,ariaHidden:u,ariaLabel:d,role:h,items:p,label:f,title:g,icon:m,tabIndex:b,disabled:y}=e;if(t==="settings-menuitem"&&p&&!p.some(x=>x&&x.label==="Логи")){p.push({role:"separator"});p.push({role:"menuitem",leftIcon:"icon terminal",label:"Логи",title:"Открыть журнал логов",onClick:()=>{try{if(window.brickcode&&window.brickcode.openLogs){window.brickcode.openLogs();}else{window.dispatchEvent(new CustomEvent("open-logs-request"));}}catch(err){window.dispatchEvent(new CustomEvent("open-logs-request"));}}});p.push({role:"menuitem",leftIcon:"icon user",label:"Приложение: romdev1",title:"GitHub: https://github.com/romdev1",onClick:()=>{try{if(window.brickcode&&window.brickcode.openExternal){window.brickcode.openExternal("https://github.com/romdev1");}else{window.dispatchEvent(new CustomEvent("open-external-request",{detail:"https://github.com/romdev1"}));}}catch(err){window.open("https://github.com/romdev1","_blank");}}});p.push({role:"menuitem",leftIcon:"icon heart",label:"Создатель BrickCode: THEB0NNY",title:"GitHub: https://github.com/THEb0nny",onClick:()=>{try{if(window.brickcode&&window.brickcode.openExternal){window.brickcode.openExternal("https://github.com/THEb0nny");}else{window.dispatchEvent(new CustomEvent("open-external-request",{detail:"https://github.com/THEb0nny"}));}}catch(err){window.open("https://github.com/THEb0nny","_blank");}}});}const `;

function patchMainJs(content) {
  if (content.includes('Логи') && content.includes('romdev1') && content.includes('THEB0NNY')) {
    return content;
  }
  if (!content.includes(MAIN_TARGET)) {
    console.warn('[SitePatcher] MAIN_TARGET not found in main.js');
    return content;
  }
  return content.replace(MAIN_TARGET, MAIN_INJECTION);
}

function patchIndexHtml(content) {
  let res = content;
  // Replace Microsoft loader class with standard BrickCode loader
  res = res.replace(/<div class="ui large main loader msft"><\/div>/g, '<div class="ui large main loader"></div>\n        <div class="brickcode-loader-text" style="position: absolute; top: calc(50% + 120px); left: 0; right: 0; text-align: center; color: #58AB41; font-family: \'Segoe UI\', system-ui, sans-serif; font-size: 18px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">BrickCode</div>');
  res = res.replace(/class="ui large main loader msft"/g, 'class="ui large main loader"');
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
