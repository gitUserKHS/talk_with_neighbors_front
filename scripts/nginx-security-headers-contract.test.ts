import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dockerfile = readFileSync(path.join(projectRoot, 'Dockerfile'), 'utf8');
const nginxConfig = readFileSync(path.join(projectRoot, 'deploy', 'nginx.conf'), 'utf8');
const securityHeaders = readFileSync(
  path.join(projectRoot, 'deploy', 'security-headers.conf'),
  'utf8'
);

test('the production image installs security headers for static responses', () => {
  assert.match(
    dockerfile,
    /COPY deploy\/security-headers\.conf \/etc\/nginx\/security-headers\.inc/
  );

  const includes = nginxConfig.match(/include \/etc\/nginx\/security-headers\.inc;/g) ?? [];
  assert.equal(includes.length, 4);

  assert.match(securityHeaders, /Strict-Transport-Security "max-age=31536000; includeSubDomains" always;/);
  assert.match(securityHeaders, /X-Content-Type-Options "nosniff" always;/);
  assert.match(securityHeaders, /X-Frame-Options "DENY" always;/);
  assert.match(securityHeaders, /Referrer-Policy "strict-origin-when-cross-origin" always;/);
});
