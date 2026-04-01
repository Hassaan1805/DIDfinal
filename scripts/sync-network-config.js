#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const backendEnvPath = path.join(rootDir, 'backend', '.env.development');
const backendEnvExamplePath = path.join(rootDir, 'backend', '.env.example');
const walletEnvPath = path.join(rootDir, 'wallet', '.env');
const walletEnvExamplePath = path.join(rootDir, 'wallet', '.env.example');

const backendPort = process.env.BACKEND_PORT || '3001';

function run(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function isPrivateIpv4(ip) {
  const match = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return false;

  const a = Number(match[1]);
  const b = Number(match[2]);

  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function extractCandidateIps(text) {
  if (!text) return [];

  const candidates = text.match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g) || [];
  const unique = [];
  for (const ip of candidates) {
    if (!unique.includes(ip) && isPrivateIpv4(ip) && !ip.startsWith('169.254.')) {
      unique.push(ip);
    }
  }
  return unique;
}

function detectIpFromRouting() {
  if (process.platform === 'win32') {
    const output = run("powershell -NoProfile -Command \"$route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' | Sort-Object RouteMetric,ifMetric | Select-Object -First 1; if ($route) { Get-NetIPAddress -InterfaceIndex $route.ifIndex -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress }\"");
    return extractCandidateIps(output)[0] || '';
  }

  if (process.platform === 'linux') {
    const output = run('ip route get 1.1.1.1');
    return extractCandidateIps(output)[0] || '';
  }

  if (process.platform === 'darwin') {
    const defaultRoute = run('route -n get default');
    const ifaceMatch = defaultRoute.match(/interface:\s*(\S+)/);
    if (ifaceMatch && ifaceMatch[1]) {
      const output = run(`ipconfig getifaddr ${ifaceMatch[1]}`);
      return extractCandidateIps(output)[0] || '';
    }
  }

  return '';
}

function scoreInterface(name, ip) {
  let score = 0;
  const lower = name.toLowerCase();

  if (ip.startsWith('192.168.')) score += 40;
  if (ip.startsWith('10.')) score += 30;
  if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) score += 25;

  if (/wifi|wi-fi|wlan|ethernet|eth|en0|en1/.test(lower)) score += 20;
  if (/virtual|vmware|vbox|hyper-v|vethernet|docker|loopback|tailscale|zerotier|hamachi/.test(lower)) {
    score -= 50;
  }

  return score;
}

function detectIpFromInterfaces() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addresses] of Object.entries(interfaces)) {
    if (!addresses) continue;

    for (const address of addresses) {
      if (!address || address.family !== 'IPv4' || address.internal) continue;
      if (!isPrivateIpv4(address.address) || address.address.startsWith('169.254.')) continue;

      candidates.push({
        name,
        ip: address.address,
        score: scoreInterface(name, address.address),
      });
    }
  }

  if (candidates.length === 0) return '';

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].ip;
}

function detectActiveIp() {
  const forcedIp = (process.env.FORCE_LOCAL_IP || '').trim();
  if (forcedIp) {
    if (!isPrivateIpv4(forcedIp)) {
      throw new Error(`FORCE_LOCAL_IP is not a private IPv4 address: ${forcedIp}`);
    }
    return forcedIp;
  }

  return detectIpFromRouting() || detectIpFromInterfaces();
}

function ensureFileFromExample(targetPath, examplePath) {
  if (fs.existsSync(targetPath)) return;
  if (!fs.existsSync(examplePath)) {
    fs.writeFileSync(targetPath, '', 'utf8');
    return;
  }
  fs.copyFileSync(examplePath, targetPath);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function upsertEnvVar(content, key, value) {
  const line = `${key}=${value}`;
  const keyPattern = new RegExp(`^${escapeRegExp(key)}=.*$`, 'm');

  if (keyPattern.test(content)) {
    return content.replace(keyPattern, line);
  }

  const separator = content.endsWith('\n') || content.length === 0 ? '' : '\n';
  return `${content}${separator}${line}\n`;
}

function updateEnvFile(filePath, updates) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';

  for (const [key, value] of Object.entries(updates)) {
    content = upsertEnvVar(content, key, value);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

function main() {
  const detectedIp = detectActiveIp();
  if (!detectedIp) {
    throw new Error('Could not detect an active private IPv4 address. Set FORCE_LOCAL_IP and retry.');
  }

  ensureFileFromExample(walletEnvPath, walletEnvExamplePath);
  ensureFileFromExample(backendEnvPath, backendEnvExamplePath);

  const backendBaseUrl = `http://${detectedIp}:${backendPort}`;

  updateEnvFile(walletEnvPath, {
    EXPO_PUBLIC_API_URL: backendBaseUrl,
    EXPO_PUBLIC_API_URL_FALLBACK_1: 'http://localhost:3001',
  });

  updateEnvFile(backendEnvPath, {
    PRIMARY_HOST_IP: detectedIp,
    LOCAL_IP: detectedIp,
    PUBLIC_API_BASE_URL: backendBaseUrl,
  });

  console.log('Network configuration synchronized successfully.');
  console.log(`Detected IP: ${detectedIp}`);
  console.log(`Backend URL: ${backendBaseUrl}`);
  console.log(`Updated: ${path.relative(rootDir, walletEnvPath)}`);
  console.log(`Updated: ${path.relative(rootDir, backendEnvPath)}`);
}

try {
  main();
} catch (error) {
  console.error('Failed to synchronize network configuration.');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
