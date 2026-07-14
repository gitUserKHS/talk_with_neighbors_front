import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const viteCli = path.join('node_modules', 'vite', 'bin', 'vite.js');
const viteArgs = [viteCli, 'build', ...process.argv.slice(2)];

const runVite = (cwd) => spawnSync(process.execPath, viteArgs, {
  cwd,
  env: process.env,
  stdio: 'inherit',
});

const windowsPathNeedsAlias = process.platform === 'win32'
  && /[^\u0000-\u007f]/.test(projectRoot);

if (!windowsPathNeedsAlias) {
  const result = runVite(projectRoot);
  if (result.error) throw result.error;
  process.exit(result.status === 0 ? 0 : 1);
}

let mappedDrive;
for (let code = 'Z'.charCodeAt(0); code >= 'P'.charCodeAt(0); code -= 1) {
  const drive = `${String.fromCharCode(code)}:`;
  if (existsSync(`${drive}\\`)) continue;

  const mapping = spawnSync('subst.exe', [drive, projectRoot], {
    encoding: 'utf8',
    windowsHide: true,
  });
  if (mapping.status === 0) {
    mappedDrive = drive;
    break;
  }
}

if (!mappedDrive) {
  throw new Error('Vite 빌드용 임시 Windows 드라이브를 만들 수 없습니다.');
}

console.warn(
  `[build] 비 ASCII Windows 경로를 감지해 ${mappedDrive} 드라이브에서 Vite를 실행합니다.`,
);

let result;
try {
  result = runVite(`${mappedDrive}\\`);
} finally {
  spawnSync('subst.exe', [mappedDrive, '/D'], {
    stdio: 'ignore',
    windowsHide: true,
  });
}

if (result.error) throw result.error;
process.exit(result.status === 0 ? 0 : 1);
