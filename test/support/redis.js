import { createConnection } from 'node:net';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

export async function startRedis() {
  const dir = mkdtempSync(join(process.env.TMPDIR, 'vyvask-redis-'));
  const socket = join(dir, 'redis.sock');
  const child = spawn(process.env.REDIS_SERVER_BIN, ['--port', '0', '--unixsocket', socket,
    '--save', '', '--appendonly', 'no', '--dir', dir], { stdio: 'ignore' });
  let error;
  child.on('error', e => { error = e; });
  async function command(args) {
    return new Promise((resolve, reject) => {
      const client = createConnection(socket);
      let received = Buffer.alloc(0);
      client.on('error', reject);
      client.on('connect', () => {
        client.write(`*${args.length}\r\n` + args.map(arg => {
          const text = String(arg); return `$${Buffer.byteLength(text)}\r\n${text}\r\n`;
        }).join(''));
      });
      client.on('data', chunk => {
        received = Buffer.concat([received, chunk]);
        let offset = 0;
        function read() {
          const end = received.indexOf('\r\n', offset);
          if (end < 0) throw Error('incomplete');
          const type = String.fromCharCode(received[offset]), value = received.toString('utf8', offset + 1, end);
          offset = end + 2;
          if (type === '*') return Array.from({ length: Number(value) }, read);
          if (type === '$') {
            const size = Number(value);
            if (size === -1) return null;
            if (received.length < offset + size + 2) throw Error('incomplete');
            const text = received.toString('utf8', offset, offset + size); offset += size + 2; return text;
          }
          if (type === '-') throw Error('redis command failed');
          return type === ':' ? Number(value) : value;
        }
        try { const result = read(); client.end(); resolve(result); }
        catch (e) { if (e.message !== 'incomplete') { client.destroy(); reject(e); } }
      });
      client.setTimeout(5000, () => { client.destroy(); reject(Error('redis timeout')); });
    });
  }
  async function stop() {
    if (child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGTERM');
      const force = setTimeout(() => child.kill('SIGKILL'), 5000);
      await exited; clearTimeout(force);
    }
    rmSync(dir, { recursive: true, force: true });
  }
  try {
    for (let i = 0; i < 100; i++) {
      if (error || child.exitCode !== null) throw Error('local Redis failed to start');
      try { if (await command(['PING']) === 'PONG') return { command, stop, pid: child.pid }; } catch {}
      await delay(50);
    }
    throw Error('local Redis did not become ready');
  } catch (e) { await stop(); throw e; }
}
