// Runs the api and the worker in one container, for hosts whose free tier has
// no background workers (Render). If either process exits, stop the other and
// exit with its code so the host restarts the container; forward SIGTERM so
// both shut down cleanly on redeploys.

import { spawn } from 'node:child_process';

const children = ['api', 'worker'].map((app) =>
  spawn('node', [`${app}/dist/index.js`], { stdio: 'inherit' }),
);

let exiting = false;
const stopAll = (code) => {
  if (exiting) return;
  exiting = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  process.exitCode = code;
};

for (const child of children) child.on('exit', (code) => stopAll(code ?? 1));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => stopAll(0));
