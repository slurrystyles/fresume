import { spawn } from 'child_process';

const args = process.argv.slice(2);
const filteredArgs = [];

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--host') {
    if (i + 1 < args.length && !args[i + 1].startsWith('-')) {
      i++;
    }
  } else if (arg.startsWith('--host=')) {
    // Skip it
  } else {
    filteredArgs.push(arg);
  }
}

const nextArgs = ['dev', '-p', '3000', '-H', '0.0.0.0', ...filteredArgs];

console.log(`Launching Next.js dev server with args:`, nextArgs);

const child = spawn('npx', ['next', ...nextArgs], {
  stdio: 'inherit',
  shell: true
});

child.on('close', (code) => {
  process.exit(code);
});

child.on('error', (err) => {
  console.error('Failed to start Next.js dev server:', err);
  process.exit(1);
});
