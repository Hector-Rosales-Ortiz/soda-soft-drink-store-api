'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..');

const packagesToVerify = [
  { name: 'iconv-lite', entry: 'lib/index.js' },
  { name: 'sequelize-pool', entry: 'lib/index.js' },
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} failed with status ${result.status}\n` +
        `stdout:\n${result.stdout}\nstderr:\n${result.stderr}`
    );
  }

  return result.stdout.trim();
}

function repairPackage(pkg) {
  const packageRoot = path.join(repoRoot, 'node_modules', pkg.name);
  const packageJsonPath = path.join(packageRoot, 'package.json');

  if (!fs.existsSync(packageJsonPath)) {
    return false;
  }

  const entryPath = path.join(packageRoot, pkg.entry);
  if (fs.existsSync(entryPath)) {
    return false;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const tarballName = run('npm', ['pack', `${pkg.name}@${packageJson.version}`, '--silent']);

  try {
    run('tar', ['-xf', tarballName, '-C', packageRoot, '--strip-components=1']);
  } finally {
    const tarballPath = path.join(repoRoot, tarballName);
    if (fs.existsSync(tarballPath)) {
      fs.unlinkSync(tarballPath);
    }
  }

  if (!fs.existsSync(entryPath)) {
    throw new Error(`Failed to restore ${pkg.name} entrypoint ${pkg.entry}`);
  }

  console.log(`Repaired ${pkg.name} by restoring missing ${pkg.entry}`);
  return true;
}

function main() {
  const repaired = [];

  for (const pkg of packagesToVerify) {
    if (repairPackage(pkg)) {
      repaired.push(pkg.name);
    }
  }

  if (repaired.length === 0) {
    console.log('Install verification passed');
  }
}

main();