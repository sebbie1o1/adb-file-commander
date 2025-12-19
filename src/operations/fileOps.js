import { cp, rm, rename, mkdir } from 'fs/promises';
import { basename, join } from 'path';
import { AdbClient } from '../adb/AdbClient.js';

const adb = new AdbClient();

export async function copyFiles(files, targetPath, sourceMode, targetMode, onProgress) {
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = basename(file.path);
    const targetFilePath = targetMode === 'local' ? join(targetPath, fileName) : `${targetPath}/${fileName}`;

    onProgress((i + 0.5) / total, fileName);

    if (sourceMode === 'local' && targetMode === 'local') {
      await cp(file.path, targetFilePath, { recursive: true });
    } else if (sourceMode === 'local' && targetMode === 'adb') {
      await adb.push(file.path, targetFilePath);
    } else if (sourceMode === 'adb' && targetMode === 'local') {
      await adb.pull(file.path, targetFilePath);
    } else if (sourceMode === 'adb' && targetMode === 'adb') {
      await adb.execute(['shell', 'cp', '-r', file.path, targetFilePath]);
    }

    onProgress((i + 1) / total, fileName);
  }
}

export async function moveFiles(files, targetPath, sourceMode, targetMode, onProgress) {
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = basename(file.path);
    const targetFilePath = targetMode === 'local' ? join(targetPath, fileName) : `${targetPath}/${fileName}`;

    onProgress((i + 0.5) / total, fileName);

    if (sourceMode === 'local' && targetMode === 'local') {
      await rename(file.path, targetFilePath);
    } else if (sourceMode === 'local' && targetMode === 'adb') {
      await adb.push(file.path, targetFilePath);
      await rm(file.path, { recursive: true });
    } else if (sourceMode === 'adb' && targetMode === 'local') {
      await adb.pull(file.path, targetFilePath);
      await adb.delete(file.path);
    } else if (sourceMode === 'adb' && targetMode === 'adb') {
      await adb.execute(['shell', 'mv', file.path, targetFilePath]);
    }

    onProgress((i + 1) / total, fileName);
  }
}

export async function deleteFiles(files, mode, onProgress) {
  const total = files.length;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = basename(file.path);

    onProgress((i + 0.5) / total, fileName);

    if (mode === 'local') {
      await rm(file.path, { recursive: true });
    } else {
      await adb.delete(file.path);
    }

    onProgress((i + 1) / total, fileName);
  }
}

export async function createDirectory(path, mode) {
  if (mode === 'local') {
    await mkdir(path, { recursive: true });
  } else {
    await adb.mkdir(path);
  }
}


