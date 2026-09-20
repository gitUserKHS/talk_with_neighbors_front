import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const viteCli = path.join('node_modules', 'vite', 'bin', 'vite.js');
const viteArgs = [viteCli, 'build', ...process.argv.slice(2)];

const runVite = (cwd) => spawnSync(process.execPath, viteArgs, {
  cwd,
  env: process.env,
  stdio: 'inherit',
});

// nginx의 gzip_static이 그대로 집어 갈 수 있도록 빌드 시점에 미리 압축해 둔다.
// 런타임 gzip은 CPU 100m짜리 nginx 파드에서 매 요청마다 비용을 치르지만,
// 여기서 한 번 만든 .gz는 그냥 파일을 읽어 보내면 끝이다.
const PRECOMPRESS_EXTENSIONS = new Set(['.js', '.css', '.svg', '.json', '.html', '.webmanifest']);
const PRECOMPRESS_MIN_BYTES = 1024;

const walk = (dir, visit) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(entryPath, visit);
    else if (entry.isFile()) visit(entryPath);
  }
};

const precompressDist = (distDir) => {
  if (!existsSync(distDir)) return;
  let written = 0;
  walk(distDir, (filePath) => {
    if (!PRECOMPRESS_EXTENSIONS.has(path.extname(filePath))) return;
    if (statSync(filePath).size <= PRECOMPRESS_MIN_BYTES) return;
    writeFileSync(`${filePath}.gz`, gzipSync(readFileSync(filePath), { level: 9 }));
    written += 1;
  });
  console.warn(`[build] 정적 자산 ${written}개를 gzip으로 미리 압축했습니다.`);
};

const finish = (result) => {
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(1);
  precompressDist(path.join(projectRoot, 'dist'));
  process.exit(0);
};

const windowsPathNeedsAlias = process.platform === 'win32'
  && /[^\u0000-\u007f]/.test(projectRoot);

if (!windowsPathNeedsAlias) {
  finish(runVite(projectRoot));
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

finish(result);
