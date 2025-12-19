import { spawn, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class AdbClient {
  constructor() {
    this.adbPath = 'adb';
  }

  async execute(args) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.adbPath, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr || `ADB exited with code ${code}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  async isConnected() {
    try {
      const output = await this.execute(['devices']);
      const lines = output.split('\n').filter((line) => line.includes('\tdevice'));
      return lines.length > 0;
    } catch {
      return false;
    }
  }

  async listDirectory(path) {
    try {
      const output = await this.execute(['shell', 'ls', '-la', path]);
      return this.parseLsOutput(output, path);
    } catch (err) {
      if (err.message.includes('No such file or directory')) {
        return [];
      }
      throw err;
    }
  }

  parseLsOutput(output, basePath) {
    const lines = output.split('\n').filter((line) => line.trim());
    const files = [];

    for (const line of lines) {
      if (line.startsWith('total ')) continue;

      const match = line.match(
        /^([d\-lrwxs]+)\s+(\d+)\s+(\S+)\s+(\S+)\s+(\d+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(.+)$/
      );

      if (match) {
        const [, permissions, , , , size, dateStr, name] = match;

        if (name === '.' || name === '..') continue;

        let actualName = name;
        let isSymlink = permissions.startsWith('l');
        if (isSymlink && name.includes(' -> ')) {
          actualName = name.split(' -> ')[0];
        }

        files.push({
          name: actualName,
          isDirectory: permissions.startsWith('d'),
          isSymlink,
          size: parseInt(size, 10),
          mtime: new Date(dateStr),
          permissions,
        });
      }
    }

    return files;
  }

  async push(localPath, remotePath, onProgress) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.adbPath, ['push', localPath, remotePath]);
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        const match = data.toString().match(/\[([^\]]+)%\]/);
        if (match && onProgress) {
          onProgress(parseInt(match[1], 10) / 100);
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `Push failed with code ${code}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  async pull(remotePath, localPath, onProgress) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.adbPath, ['pull', remotePath, localPath]);
      let stderr = '';

      process.stderr.on('data', (data) => {
        stderr += data.toString();
        const match = data.toString().match(/\[([^\]]+)%\]/);
        if (match && onProgress) {
          onProgress(parseInt(match[1], 10) / 100);
        }
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(stderr || `Pull failed with code ${code}`));
        }
      });

      process.on('error', (err) => {
        reject(err);
      });
    });
  }

  async delete(path) {
    await this.execute(['shell', 'rm', '-rf', path]);
  }

  async mkdir(path) {
    await this.execute(['shell', 'mkdir', '-p', path]);
  }

  async exists(path) {
    try {
      await this.execute(['shell', 'ls', path]);
      return true;
    } catch {
      return false;
    }
  }

  async stat(path) {
    try {
      const output = await this.execute(['shell', 'stat', '-c', '%F %s %Y', path]);
      const [type, size, mtime] = output.trim().split(' ');
      return {
        isDirectory: type === 'directory',
        size: parseInt(size, 10),
        mtime: new Date(parseInt(mtime, 10) * 1000),
      };
    } catch {
      return null;
    }
  }
}

