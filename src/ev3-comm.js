const { execFile } = require('child_process');
const logger = require('./logger');

/**
 * LEGO MINDSTORMS EV3 Direct Commands Communication Helper (Beta)
 * Supports Windows Serial (USB & Bluetooth SPP virtual COM ports)
 */

function getAvailablePorts() {
  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', '[System.IO.Ports.SerialPort]::GetPortNames()'],
      (err, stdout, stderr) => {
        if (err) {
          logger.warn('EV3-COMM', 'Failed to query serial ports via PowerShell: ' + err.message);
          resolve([]);
          return;
        }
        const ports = stdout
          .split(/\r?\n/)
          .map(p => p.trim())
          .filter(Boolean)
          .sort();
        logger.info('EV3-COMM', `Found ${ports.length} COM port(s): ${ports.join(', ')}`);
        resolve(ports);
      }
    );
  });
}

/**
 * Sends opSound (0x94) cmdTONE (0x01) to the EV3 brick.
 * Frequency: 1000 Hz, Duration: 250 ms, Volume: 50%
 */
function sendPlayTone(portName, freq = 1000, durationMs = 250, volume = 50) {
  return new Promise((resolve, reject) => {
    if (!portName) {
      return reject(new Error('Не выбран COM-порт'));
    }

    const freqLow = freq & 0xFF;
    const freqHigh = (freq >> 8) & 0xFF;
    const durLow = durationMs & 0xFF;
    const durHigh = (durationMs >> 8) & 0xFF;

    // EV3 Direct Command:
    // [0..1] Length: 15 bytes (Little Endian)
    // [2..3] Counter: 1
    // [4] Type: 0x80 (Direct command without reply)
    // [5..6] Reservations: 0, 0
    // [7] Opcode: 0x94 (opSound)
    // [8] Subcode: 0x01 (cmdTONE)
    // [9] LC0: 0x81 (constant byte follows)
    // [10] Volume: volume
    // [11] LC1: 0x82 (constant 2-bytes follow)
    // [12..13] Frequency: freq
    // [14] LC1: 0x82 (constant 2-bytes follow)
    // [15..16] Duration: durationMs
    const bytes = [15, 0, 1, 0, 128, 0, 0, 148, 1, 129, volume, 130, freqLow, freqHigh, 130, durLow, durHigh];
    const byteStr = bytes.join(',');

    const psScript = `
      try {
        $p = New-Object System.IO.Ports.SerialPort "${portName}", 115200, None, 8, One;
        $p.ReadTimeout = 2000;
        $p.WriteTimeout = 2000;
        $p.Open();
        $b = [byte[]]@(${byteStr});
        $p.Write($b, 0, $b.Length);
        Start-Sleep -Milliseconds 350;
        $p.Close();
        Write-Output "OK"
      } catch {
        Write-Output "ERR: $($_.Exception.Message)"
      }
    `.replace(/\r?\n/g, ' ');

    logger.info('EV3-COMM', `Отправка звукового сигнала (Beep) на ${portName}...`);

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', psScript],
      (err, stdout, stderr) => {
        const out = (stdout || '').trim();
        if (out.includes('OK')) {
          logger.info('EV3-COMM', `Звуковой сигнал успешно отправлен на ${portName}`);
          resolve({ success: true, message: `Команда выполнена: робот ${portName} воспроизвёл звук!` });
        } else {
          const errMsg = out.replace(/^ERR:\s*/, '') || (stderr || err ? (stderr || err.message) : 'Не удалось открыть порт');
          logger.warn('EV3-COMM', `Ошибка связи с ${portName}: ${errMsg}`);
          reject(new Error(errMsg));
        }
      }
    );
  });
}

/**
 * Queries EV3 battery level using opUI_Read (0x81) cmdGET_LBATT (0x18)
 */
function queryBattery(portName) {
  return new Promise((resolve, reject) => {
    if (!portName) {
      return reject(new Error('Не выбран COM-порт'));
    }

    // Direct command with reply:
    // [0..1] Length: 10 bytes
    // [2..3] Counter: 2
    // [4] Type: 0x00 (Direct command WITH reply)
    // [5] Global reservation: 1 byte
    // [6] Local reservation: 0
    // [7] Opcode: 0x81 (opUI_Read)
    // [8] Subcode: 0x18 (GET_LBATT)
    // [9..10] GV0: 0x60 (global variable 0)
    const bytes = [10, 0, 2, 0, 0, 1, 0, 129, 24, 96];
    const byteStr = bytes.join(',');

    const psScript = `
      try {
        $p = New-Object System.IO.Ports.SerialPort "${portName}", 115200, None, 8, One;
        $p.ReadTimeout = 2500;
        $p.WriteTimeout = 2000;
        $p.Open();
        $b = [byte[]]@(${byteStr});
        $p.Write($b, 0, $b.Length);
        Start-Sleep -Milliseconds 150;
        $resp = New-Object byte[] 64;
        $read = $p.Read($resp, 0, 64);
        $p.Close();
        if ($read -ge 6) {
          $batt = [int]$resp[5];
          Write-Output "BATT:$batt"
        } else {
          Write-Output "ERR: Пустой ответ от блока"
        }
      } catch {
        Write-Output "ERR: $($_.Exception.Message)"
      }
    `.replace(/\r?\n/g, ' ');

    logger.info('EV3-COMM', `Запрос заряда батареи с ${portName}...`);

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', psScript],
      (err, stdout, stderr) => {
        const out = (stdout || '').trim();
        const match = out.match(/BATT:(\d+)/);
        if (match) {
          const level = parseInt(match[1], 10);
          logger.info('EV3-COMM', `Заряд батареи ${portName}: ${level}%`);
          resolve({ success: true, level });
        } else {
          const errMsg = out.replace(/^ERR:\s*/, '') || (stderr || err ? (stderr || err.message) : 'Нет ответа от EV3');
          logger.warn('EV3-COMM', `Не удалось прочитать батарею с ${portName}: ${errMsg}`);
          reject(new Error(errMsg));
        }
      }
    );
  });
}

module.exports = {
  getAvailablePorts,
  sendPlayTone,
  queryBattery
};
