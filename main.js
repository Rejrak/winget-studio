// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { exec, spawn } = require('child_process');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    icon: path.join(__dirname, 'assets', 'icons', 'wingetstudio.ico'),
    minWidth: 1100,
    minHeight: 650,
    backgroundColor: '#0b0f17',
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('index.html');
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function parseWingetTable(raw, expectSource = false) {
  const lines = raw.split(/\r?\n/);
  const dataLines = lines.slice(2);

  const items = [];

  for (const line of dataLines) {
    if (!line.trim()) continue;
    if (/^-+$/.test(line.trim())) continue;

    const normalized = line.replace(/\s{2,}/g, '|');
    const parts = normalized.split('|');

    if (parts.length >= 2) {
      const obj = {
        name: parts[0].trim(),
        id: parts[1].trim(),
        version: parts[2] ? parts[2].trim() : ''
      };
      if (expectSource && parts[3]) {
        obj.source = parts[3].trim();
      }
      items.push(obj);
    }
  }

  return items;
}

function normalizeSearchResult(pkg) {
  const result = { ...pkg };
  const idLower = (result.id || '').toLowerCase();
  if ((idLower === 'winget' || idLower === 'msstore' || !result.id) && result.name) {
    const tokens = result.name.trim().split(/\s+/);
    if (tokens.length >= 3) {
      const last = tokens[tokens.length - 1];
      const prev = tokens[tokens.length - 2];
      const versionLike = /^\d+(\.\d+)*([a-zA-Z0-9-]+)?$/.test(last);
      const idLike = /\w+\.\w+/.test(prev);
      if (versionLike && idLike) {
        result.id = prev;
        if (!result.version || /^n\/?a$/i.test(result.version)) {
          result.version = last;
        }
        result.name = tokens.slice(0, tokens.length - 2).join(' ');
      }
    }
  }
  return result;
}

function execPromise(cmd) {
  return new Promise((resolve, reject) => {
    console.log(`\n============================`);
    console.log(`ESEGUO COMANDO: ${cmd}`);
    console.log(`============================\n`);

    exec(cmd, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (stdout && stdout.trim()) {
        console.log('--- STDOUT ---');
        console.log(stdout);
      }
      if (stderr && stderr.trim()) {
        console.log('--- STDERR ---');
        console.log(stderr);
      }

      if (error) {
        const code = typeof error.code === 'number' ? error.code : 0;
        const lowerOut = (stdout || '').toLowerCase();

        const isAppInstallerUpgrade =
          cmd.includes('Microsoft.AppInstaller') || cmd.includes('microsoft.appinstaller');

        const looksSuccessful =
          lowerOut.includes('successfully installed') ||
          lowerOut.includes('successfully extracted archive') ||
          lowerOut.includes('starting package install');

        if (isAppInstallerUpgrade && looksSuccessful) {
          console.warn(
            'Winget ha restituito un exit code non zero ma l\'output indica successo; ' +
            'tratto il comando come completato correttamente.'
          );
          return resolve(stdout);
        }

        console.log('--- ERRORE OGGETTO ---');
        console.log('name:', error.name);
        console.log('message:', error.message);
        console.log('code:', error.code);
        console.log('signal:', error.signal);

        const msg =
          `Comando: ${cmd}\n` +
          `Exit code: ${code}\n` +
          (stderr && stderr.trim() ? `STDERR:\n${stderr}\n` : '') +
          (stdout && stdout.trim() ? `STDOUT:\n${stdout}\n` : '');

        console.error('ERRORE execPromise:\n', msg);
        return reject(new Error(msg));
      }

      resolve(stdout);
    });
  });
}

const operations = new Map();
let operationCounter = 0;

function createOperationId() {
  operationCounter += 1;
  return `op-${Date.now()}-${operationCounter}`;
}

function sendOperationUpdate(sender, payload) {
  if (!sender || sender.isDestroyed()) return;
  sender.send('operation-update', payload);
}

function sendOperationLog(sender, payload) {
  if (!sender || sender.isDestroyed()) return;
  sender.send('operation-log', payload);
}

function formatWingetCommand(args) {
  const parts = ['winget', ...args].map((part) => {
    return /\s/.test(part) ? `"${part}"` : part;
  });
  return parts.join(' ');
}

function isAppInstallerUpgrade(args, stdout) {
  const lowerOut = (stdout || '').toLowerCase();
  const looksSuccessful =
    lowerOut.includes('successfully installed') ||
    lowerOut.includes('successfully extracted archive') ||
    lowerOut.includes('starting package install');
  const hasAppInstaller = args.some((arg) => /microsoft\.appinstaller/i.test(arg));
  return hasAppInstaller && looksSuccessful;
}

function attachWingetLogs(sender, meta, child, output) {
  if (child.stdout) {
    child.stdout.on('data', (data) => {
      const text = data.toString();
      output.stdout += text;
      sendOperationLog(sender, { ...meta, stream: 'stdout', message: text });
    });
  }
  if (child.stderr) {
    child.stderr.on('data', (data) => {
      const text = data.toString();
      output.stderr += text;
      sendOperationLog(sender, { ...meta, stream: 'stderr', message: text });
    });
  }
}

async function killProcessTree(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    await execPromise(`taskkill /PID ${pid} /T /F`);
  } else {
    process.kill(-pid, 'SIGTERM');
  }
}

function startWingetOperation(sender, type, appId, args) {
  const opId = createOperationId();
  const child = spawn('winget', args, { windowsHide: true });
  const output = { stdout: '', stderr: '' };
  const meta = { opId, type, appId };

  const operation = {
    opId,
    type,
    appId,
    child,
    canceled: false
  };
  operations.set(opId, operation);

  sendOperationUpdate(sender, { opId, type, appId, status: 'started' });
  sendOperationLog(sender, { ...meta, stream: 'meta', message: `> ${formatWingetCommand(args)}` });
  attachWingetLogs(sender, meta, child, output);

  child.on('error', (err) => {
    sendOperationUpdate(sender, {
      opId,
      type,
      appId,
      status: 'failed',
      error: err.message
    });
    sendOperationLog(sender, { ...meta, stream: 'meta', message: `Process error: ${err.message}` });
    operations.delete(opId);
  });

  child.on('exit', (code) => {
    const isSuccessful =
      code === 0 ||
      (code !== 0 && isAppInstallerUpgrade(args, output.stdout));
    const status = operation.canceled ? 'canceled' : isSuccessful ? 'completed' : 'failed';
    sendOperationUpdate(sender, {
      opId,
      type,
      appId,
      status,
      exitCode: code
    });
    sendOperationLog(sender, { ...meta, stream: 'meta', message: `Process exited with code ${code}` });
    operations.delete(opId);
  });

  return { opId };
}

function runWingetCommandWithLogs(sender, type, appId, args) {
  return new Promise((resolve, reject) => {
    const opId = createOperationId();
    const child = spawn('winget', args, { windowsHide: true });
    const output = { stdout: '', stderr: '' };
    const meta = { opId, type, appId };

    sendOperationLog(sender, { ...meta, stream: 'meta', message: `> ${formatWingetCommand(args)}` });
    attachWingetLogs(sender, meta, child, output);

    child.on('error', (err) => {
      sendOperationLog(sender, { ...meta, stream: 'meta', message: `Process error: ${err.message}` });
      reject(err);
    });

    child.on('exit', (code) => {
      const isSuccessful =
        code === 0 ||
        (code !== 0 && isAppInstallerUpgrade(args, output.stdout));
      sendOperationLog(sender, { ...meta, stream: 'meta', message: `Process exited with code ${code}` });

      if (!isSuccessful) {
        const msg =
          `Comando: ${formatWingetCommand(args)}\n` +
          `Exit code: ${code}\n` +
          (output.stderr && output.stderr.trim() ? `STDERR:\n${output.stderr}\n` : '') +
          (output.stdout && output.stdout.trim() ? `STDOUT:\n${output.stdout}\n` : '');
        return reject(new Error(msg));
      }
      return resolve(output.stdout);
    });
  });
}

async function execWingetWithSourceRetry(cmd) {
  try {
    return await execPromise(cmd);
  } catch (err) {
    console.warn('Winget fallito, provo aggiornamento sorgenti e retry.', err.message);
    try {
      await execPromise('winget source update --accept-source-agreements --disable-interactivity');
    } catch (updateErr) {
      console.error('Errore aggiornamento sorgenti winget:', updateErr);
    }
    return execPromise(cmd);
  }
}

ipcMain.on('window-control', (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return;

  if (action === 'minimize') {
    win.minimize();
  } else if (action === 'maximize') {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  } else if (action === 'close') {
    win.close();
  }
});

ipcMain.handle('start-upgrade', async (event, appId) => {
  if (!appId) {
    throw new Error('ID applicazione mancante');
  }
  const args = [
    'upgrade',
    '--id',
    appId,
    '--accept-source-agreements',
    '--accept-package-agreements',
    '--disable-interactivity'
  ];
  return startWingetOperation(event.sender, 'upgrade', appId, args);
});

ipcMain.handle('start-uninstall', async (event, appId) => {
  if (!appId) {
    throw new Error('ID applicazione mancante');
  }
  const args = [
    'uninstall',
    '--id',
    appId,
    '--accept-source-agreements',
    '--disable-interactivity'
  ];
  return startWingetOperation(event.sender, 'uninstall', appId, args);
});

ipcMain.handle('cancel-operation', async (event, opId) => {
  const operation = operations.get(opId);
  if (!operation) {
    return { ok: false, reason: 'not_found' };
  }

  operation.canceled = true;
  sendOperationUpdate(event.sender, {
    opId,
    type: operation.type,
    appId: operation.appId,
    status: 'canceling'
  });

  try {
    await killProcessTree(operation.child.pid);
  } catch (err) {
    console.error('Errore cancel operation:', err);
    return { ok: false, reason: 'kill_failed' };
  }

  return { ok: true };
});

ipcMain.handle('get-apps', async () => {
  console.log('[IPC] get-apps chiamato');
  try {
    const [listOut, upgradeOut] = await Promise.all([
      execWingetWithSourceRetry('winget list --accept-source-agreements --disable-interactivity'),
      execWingetWithSourceRetry('winget upgrade --accept-source-agreements --disable-interactivity')
    ]);

    const apps = parseWingetTable(listOut, false);
    const upgrades = parseWingetTable(upgradeOut, false);
    const upgradeIds = new Set(upgrades.map(a => a.id));

    const merged = apps.map(a => ({
      ...a,
      upgradeAvailable: upgradeIds.has(a.id)
    }));

    console.log(`[IPC] get-apps: trovati ${apps.length} programmi, ${upgradeIds.size} aggiornabili`);
    return merged;
  } catch (err) {
    console.error('Errore get-apps (IPC):', err);
    throw err;
  }
});

ipcMain.handle('uninstall-app', async (event, appId) => {
  console.log(`[IPC] uninstall-app chiamato per ID: ${appId}`);
  const args = [
    'uninstall',
    '--id',
    appId,
    '--accept-source-agreements',
    '--disable-interactivity'
  ];
  await runWingetCommandWithLogs(event.sender, 'uninstall', appId, args);
  console.log(`[IPC] uninstall-app completato per ID: ${appId}`);
  return 'ok';
});

ipcMain.handle('upgrade-app', async (event, appId) => {
  console.log(`[IPC] upgrade-app chiamato per ID: ${appId}`);
  const args = [
    'upgrade',
    '--id',
    appId,
    '--accept-source-agreements',
    '--accept-package-agreements',
    '--disable-interactivity'
  ];
  await runWingetCommandWithLogs(event.sender, 'upgrade', appId, args);
  console.log(`[IPC] upgrade-app completato per ID: ${appId}`);
  return 'ok';
});

ipcMain.handle('search-packages', async (event, query) => {
  console.log(`[IPC] search-packages chiamato con query: "${query}"`);
  if (!query || !query.trim()) {
    return [];
  }

  const safeQuery = query.replace(/"/g, '\\"');
  const cmd = `winget search "${safeQuery}" --accept-source-agreements --disable-interactivity`;
  const stdout = await execWingetWithSourceRetry(cmd);

  const rawResults = parseWingetTable(stdout, true);
  const results = rawResults.map(normalizeSearchResult);
  console.log(`[IPC] search-packages: ottenuti ${results.length} risultati`);
  return results;
});

ipcMain.handle('install-package', async (event, pkg) => {
  const { id, source } = pkg || {};
  console.log(`[IPC] install-package chiamato per ID: ${id}, source: ${source}`);

  if (!id) {
    throw new Error('ID pacchetto mancante');
  }

  const lowered = String(id).toLowerCase();
  if (lowered === 'winget' || lowered === 'msstore') {
    throw new Error(`"${id}" sembra una sorgente, non un ID di pacchetto.`);
  }

  const args = [
    'install',
    '--id',
    id,
    '--accept-source-agreements',
    '--accept-package-agreements',
    '--disable-interactivity'
  ];
  if (source && source.trim()) {
    args.push('--source', source.trim());
  }

  await runWingetCommandWithLogs(event.sender, 'install', id, args);
  console.log(`[IPC] install-package completato per ID: ${id}`);
  return 'ok';
});
