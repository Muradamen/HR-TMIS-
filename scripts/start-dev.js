import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('[Dev Server] Applying Django database migrations...');
const migrate = spawn('python3', ['backend/manage.py', 'migrate'], {
  cwd: rootDir,
  stdio: 'inherit',
});

migrate.on('close', (code) => {
  if (code !== 0) {
    console.error(`[Dev Server] Migrate exited with code ${code}`);
  }

  console.log('[Dev Server] Seeding initial database data if needed...');
  const seed = spawn('python3', ['backend/manage.py', 'seed_all_data'], {
    cwd: rootDir,
    stdio: 'inherit',
  });

  seed.on('close', () => {
    console.log('[Dev Server] Starting Django REST Framework API server on 127.0.0.1:8001...');
    const django = spawn('python3', ['backend/manage.py', 'runserver', '127.0.0.1:8001', '--noreload'], {
      cwd: rootDir,
      stdio: 'inherit',
    });

    console.log('[Dev Server] Starting Vite dev server on 0.0.0.0:3000...');
    const vite = spawn('npx', ['vite', '--host', '0.0.0.0', '--port', '3000'], {
      cwd: rootDir,
      stdio: 'inherit',
    });

    const cleanup = () => {
      console.log('[Dev Server] Shutting down processes...');
      django.kill('SIGTERM');
      vite.kill('SIGTERM');
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    django.on('exit', (c) => {
      console.log(`[Dev Server] Django process exited with code ${c}`);
    });
    vite.on('exit', (c) => {
      console.log(`[Dev Server] Vite process exited with code ${c}`);
      cleanup();
    });
  });
});
