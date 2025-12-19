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
      const output = await this.execute(['shell', 'ls', '-laL', path]);
      return this.parseLsOutput(output, path, false);
    } catch (err) {
      try {
        const output = await this.execute(['shell', 'ls', '-la', path]);
        return this.parseLsOutput(output, path, true);
      } catch (err2) {
        if (err2.message.includes('No such file or directory')) {
          return [];
        }
        throw err2;
      }
    }
  }

  parseLsOutput(output, basePath, keepSymlinkInfo) {
    const lines = output.split('\n').filter((line) => line.trim());
    const files = [];

    for (const line of lines) {
      if (line.startsWith('total ')) continue;

      let match = line.match(
        /^([d\-lrwxsStT@]+)\s+\d+\s+\S+\s+\S+\s+([\d,]+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(.+)$/
      );

      if (!match) {
        match = line.match(
          /^([d\-lrwxsStT@]+)\s+\d+\s+\S+\s+\S+\s+([\d,]+)\s+(\w{3}\s+\d+\s+(?:\d{2}:\d{2}|\d{4}))\s+(.+)$/
        );
      }

      if (!match) {
        match = line.match(
          /^([d\-lrwxsStT@]+)\s+([\d,]+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(.+)$/
        );
      }

      if (!match) {
        match = line.match(
          /^([d\-lrwxsStT@]+)\s+\S+\s+\S+\s+([\d,]+)\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s+(.+)$/
        );
      }

      if (match) {
        const [, permissions, sizeStr, dateStr, name] = match;
        const size = parseInt(sizeStr.replace(/,/g, ''), 10) || 0;

        if (name === '.' || name === '..') continue;

        let actualName = name;
        let isSymlink = permissions.startsWith('l');
        let symlinkTarget = null;

        if (name.includes(' -> ')) {
          const parts = name.split(' -> ');
          actualName = parts[0];
          symlinkTarget = parts[1];
        }

        const isDirectory = permissions.startsWith('d');

        files.push({
          name: actualName,
          isDirectory: isDirectory || isSymlink,
          isSymlink,
          symlinkTarget,
          size,
          mtime: this.parseDate(dateStr),
          permissions,
        });
      }
    }

    return files;
  }

  parseDate(dateStr) {
    if (!dateStr) return null;
    
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(dateStr);
    }

    const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    const match = dateStr.match(/(\w{3})\s+(\d+)\s+(?:(\d{2}:\d{2})|(\d{4}))/);
    
    if (match) {
      const [, month, day, time, year] = match;
      const now = new Date();
      const y = year ? parseInt(year, 10) : now.getFullYear();
      const m = months[month] ?? 0;
      const d = parseInt(day, 10);
      
      if (time) {
        const [h, min] = time.split(':').map(Number);
        return new Date(y, m, d, h, min);
      }
      return new Date(y, m, d);
    }
    
    return null;
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

