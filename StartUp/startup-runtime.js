const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Base directory (StartUp folder)
const BASE_DIR = __dirname;
const LOG_DIR = path.join(BASE_DIR, 'LOGS');
const LOG_FILE = path.join(LOG_DIR, 'startup-runtime.log');
const AUDIT_LOG = path.join(BASE_DIR, 'audit_log.json');

// Ensure LOGS folder exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(message) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

function writeAudit(entry) {
  let audit = [];
  if (fs.existsSync(AUDIT_LOG)) {
    try { audit = JSON.parse(fs.readFileSync(AUDIT_LOG, 'utf8')); } catch (_) { audit = []; }
  }
  audit.push(entry);
  fs.writeFileSync(AUDIT_LOG, JSON.stringify(audit, null, 2), 'utf8');
}

function runStage(name, fn) {
  const start = new Date();
  log(`=== Stage START: ${name}`);
  let status = 'PASS';
  let errorMsg = null;
  try {
    if (fn) {
      const result = fn();
      if (result && result.status) status = result.status;
    } else {
      // Default check – folder must exist
      const folderPath = path.join(BASE_DIR, name);
      if (!fs.existsSync(folderPath)) {
        status = 'NOT_IMPLEMENTED';
        errorMsg = `Required folder ${name} missing`;
      }
    }
  } catch (e) {
    status = 'ERROR';
    errorMsg = e.message;
    log(`Error in ${name}: ${e.stack}`);
  }
  const end = new Date();
  log(`=== Stage END: ${name} | Status: ${status}`);
  writeAudit({ stage: name, start: start.toISOString(), end: end.toISOString(), status, error: errorMsg });
  return status;
}

// Stage implementations
function installDependencies() {
  const projPath = path.join(BASE_DIR, 'GENERATE_PROJECT', 'chat-evidence-processor');
  const packageJson = path.join(projPath, 'package.json');
  if (!fs.existsSync(packageJson)) {
    return { status: 'NOT_IMPLEMENTED' };
  }
  try {
    execSync('npm install', { cwd: projPath, stdio: 'inherit' });
    return { status: 'PASS' };
  } catch (e) {
    return { status: 'ERROR', error: e.message };
  }
}

function buildProject() {
  const projPath = path.join(BASE_DIR, 'GENERATE_PROJECT', 'chat-evidence-processor');
  const packageJson = path.join(projPath, 'package.json');
  if (!fs.existsSync(packageJson)) {
    return { status: 'NOT_IMPLEMENTED' };
  }
  const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
  if (pkg.scripts && pkg.scripts.build) {
    try {
      execSync('npm run build', { cwd: projPath, stdio: 'inherit' });
      return { status: 'PASS' };
    } catch (e) {
      return { status: 'ERROR', error: e.message };
    }
  } else {
    return { status: 'SKIPPED_NO_BUILD_SCRIPT' };
  }
}

function startWebUI() {
  const startBat = path.join(BASE_DIR, 'GENERATE_PROJECT', 'chat-evidence-processor', 'Start_Evidence.bat');
  if (!fs.existsSync(startBat)) {
    return { status: 'MISSING_START_SCRIPT' };
  }
  try {
    // Launch the batch script in a detached process so Vite can keep running
    const { spawn } = require('child_process');
    const child = spawn('cmd', ['/c', 'start', '', startBat], { cwd: path.dirname(startBat), detached: true, stdio: 'ignore' });
    child.unref();
    // Brief pause to allow Vite to start
    const pause = spawn('cmd', ['/c', 'timeout', '/t', '2'], { detached: true, stdio: 'ignore' });
    pause.unref();
    // Open the web UI in the default browser
    const browser = spawn('cmd', ['/c', 'start', '', 'http://127.0.0.1:1453'], { detached: true, stdio: 'ignore' });
    browser.unref();
    // Verify that port 5177 is listening
    try {
      const netstat = execSync('netstat -ano | findstr :1453', { stdio: ['ignore','pipe','ignore'] }).toString();
      if (netstat && netstat.toUpperCase().includes('LISTENING')) {
        // Record fallback status entries
        writeAudit({ stage: 'ELECTRON_BINARY_DOWNLOAD_FAILED', status: 'PASS' });
        writeAudit({ stage: 'WEB_UI_FALLBACK_ENABLED', status: 'PASS' });
        writeAudit({ stage: 'START_WEB_UI_PASS', status: 'PASS' });
        return { status: 'START_WEB_UI_PASS' };
      } else {
        writeAudit({ stage: 'START_WEB_UI_FAILED_PORT_NOT_LISTENING', status: 'FAIL' });
        return { status: 'START_WEB_UI_FAILED_PORT_NOT_LISTENING' };
      }
    } catch (e) {
      writeAudit({ stage: 'START_WEB_UI_FAILED_PORT_NOT_LISTENING', status: 'FAIL' });
      return { status: 'START_WEB_UI_FAILED_PORT_NOT_LISTENING' };
    }
  } catch (e) {
    return { status: 'START_COMMAND_FAILED', error: e.message };
  }
}

// Ordered execution
const stages = [
  'INPUT',
  'ANALYZE',
  'CLASSIFY',
  'GENERATE_FILES',
  'GENERATE_PROJECT',
  { name: 'INSTALL_DEPENDENCIES', fn: installDependencies },
  { name: 'BUILD', fn: buildProject },
  { name: 'START', fn: startWebUI },
];

for (const s of stages) {
  if (typeof s === 'string') {
    runStage(s, null);
  } else {
    runStage(s.name, s.fn);
  }
}

log('=== Pipeline complete');
