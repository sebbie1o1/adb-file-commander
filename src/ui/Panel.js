import blessed from 'blessed';
import { EventEmitter } from 'events';
import { readdir, stat } from 'fs/promises';
import { join, dirname, basename } from 'path';
import { homedir } from 'os';
import { THEME } from './theme.js';
import { AdbClient } from '../adb/AdbClient.js';
import { formatSize, formatDate } from '../utils/format.js';

export class FilePanel extends EventEmitter {
  constructor(options) {
    super();
    this.parent = options.parent;
    this.position = options.position;
    this.mode = options.mode || 'local';
    this.currentPath = options.path || (this.mode === 'local' ? homedir() : '/sdcard');
    this.files = [];
    this.cursor = 0;
    this.scroll = 0;
    this.selected = new Set();
    this.showHidden = false;
    this.isActive = false;
    this.adb = new AdbClient();

    this.createBox(options.label);
    this.refresh();
  }

  createBox(label) {
    const left = this.position === 'left' ? 0 : '50%';
    const width = '50%';

    this.box = blessed.box({
      parent: this.parent,
      left,
      top: 0,
      width,
      height: '100%-2',
      border: { type: 'line' },
      style: {
        border: { fg: THEME.colors.panelBorder },
        bg: THEME.colors.panelBg,
      },
      label: ` ${this.mode === 'adb' ? 'ADB' : 'LOCAL'} `,
      scrollable: true,
      tags: true,
    });

    this.pathBox = blessed.text({
      parent: this.box,
      top: 0,
      left: 1,
      right: 1,
      height: 1,
      content: '',
      style: {
        fg: this.mode === 'adb' ? THEME.colors.adb : THEME.colors.local,
        bg: THEME.colors.panelBg,
      },
      tags: true,
    });

    this.headerBox = blessed.text({
      parent: this.box,
      top: 1,
      left: 1,
      right: 1,
      height: 1,
      content: '{bold}Name                          Size       Date{/bold}',
      style: {
        fg: THEME.colors.fg,
        bg: THEME.colors.statusBg,
      },
      tags: true,
    });

    this.listBox = blessed.box({
      parent: this.box,
      top: 2,
      left: 1,
      right: 1,
      bottom: 1,
      style: {
        bg: THEME.colors.panelBg,
      },
      tags: true,
    });

    this.infoBox = blessed.text({
      parent: this.box,
      bottom: 0,
      left: 1,
      right: 1,
      height: 1,
      content: '',
      style: {
        fg: THEME.colors.helpFg,
        bg: THEME.colors.panelBg,
      },
      tags: true,
    });
  }

  setActive(active) {
    this.isActive = active;
    this.box.style.border.fg = active ? THEME.colors.panelBorderActive : THEME.colors.panelBorder;
    this.render();
  }

  async refresh() {
    try {
      if (this.mode === 'local') {
        await this.loadLocalFiles();
      } else {
        await this.loadAdbFiles();
      }
      this.cursor = Math.min(this.cursor, Math.max(0, this.files.length - 1));
      this.render();
    } catch (err) {
      this.emit('statusUpdate', `Error: ${err.message}`);
    }
  }

  async loadLocalFiles() {
    const entries = await readdir(this.currentPath, { withFileTypes: true });
    this.files = [];

    if (this.currentPath !== '/') {
      this.files.push({
        name: '..',
        isDirectory: true,
        isParent: true,
        size: 0,
        mtime: null,
      });
    }

    for (const entry of entries) {
      if (!this.showHidden && entry.name.startsWith('.')) continue;

      try {
        const fullPath = join(this.currentPath, entry.name);
        const stats = await stat(fullPath).catch(() => null);

        this.files.push({
          name: entry.name,
          fullPath,
          isDirectory: entry.isDirectory(),
          isSymlink: entry.isSymbolicLink(),
          size: stats?.size || 0,
          mtime: stats?.mtime || null,
        });
      } catch {
        continue;
      }
    }

    this.sortFiles();
  }

  async loadAdbFiles() {
    const entries = await this.adb.listDirectory(this.currentPath);
    this.files = [];

    if (this.currentPath !== '/') {
      this.files.push({
        name: '..',
        isDirectory: true,
        isParent: true,
        size: 0,
        mtime: null,
      });
    }

    for (const entry of entries) {
      if (!this.showHidden && entry.name.startsWith('.')) continue;

      this.files.push({
        name: entry.name,
        fullPath: this.currentPath === '/' ? `/${entry.name}` : `${this.currentPath}/${entry.name}`,
        isDirectory: entry.isDirectory,
        isSymlink: entry.isSymlink,
        size: entry.size,
        mtime: entry.mtime,
      });
    }

    this.sortFiles();
  }

  sortFiles() {
    const parent = this.files.find((f) => f.isParent);
    const dirs = this.files.filter((f) => f.isDirectory && !f.isParent).sort((a, b) => a.name.localeCompare(b.name));
    const files = this.files.filter((f) => !f.isDirectory).sort((a, b) => a.name.localeCompare(b.name));
    this.files = parent ? [parent, ...dirs, ...files] : [...dirs, ...files];
  }

  render() {
    const height = this.listBox.height || 20;
    const modeIcon = this.mode === 'adb' ? THEME.icons.adb : THEME.icons.local;
    const modeColor = this.mode === 'adb' ? THEME.colors.adb : THEME.colors.local;

    let pathDisplay = this.currentPath;
    if (pathDisplay.length > 40) {
      pathDisplay = '...' + pathDisplay.slice(-37);
    }

    this.pathBox.setContent(`{${modeColor}-fg}${pathDisplay}{/}`);
    this.box.setLabel(` ${modeIcon} ${this.mode.toUpperCase()} `);

    if (this.cursor < this.scroll) {
      this.scroll = this.cursor;
    } else if (this.cursor >= this.scroll + height) {
      this.scroll = this.cursor - height + 1;
    }

    let content = '';
    const visibleFiles = this.files.slice(this.scroll, this.scroll + height);

    visibleFiles.forEach((file, idx) => {
      const realIdx = this.scroll + idx;
      const isSelected = this.selected.has(file.fullPath);
      const isCursor = realIdx === this.cursor;

      let icon = file.isDirectory ? THEME.icons.directory : THEME.icons.file;
      if (file.isParent) icon = THEME.icons.parent;
      if (file.isSymlink && !file.isDirectory) icon = THEME.icons.symlink;

      let nameColor = file.isDirectory ? THEME.colors.directory : THEME.colors.file;
      if (file.isSymlink) nameColor = THEME.colors.symlink;

      const selectMark = isSelected ? `{${THEME.colors.selected}-fg}${THEME.icons.selected}{/}` : THEME.icons.unselected;

      let name = file.name;
      const maxNameLen = 26;
      if (name.length > maxNameLen) {
        name = name.slice(0, maxNameLen - 1) + '…';
      } else {
        name = name.padEnd(maxNameLen);
      }

      const size = (file.isDirectory || file.isSymlink) ? '<DIR>' : formatSize(file.size);
      const date = file.mtime ? formatDate(file.mtime) : '';

      let line = `${selectMark} ${icon} {${nameColor}-fg}${name}{/} ${size.padStart(8)} ${date}`;

      if (isCursor && this.isActive) {
        line = `{${THEME.colors.cursorBg}-bg}${line}{/}`;
      }

      content += line + '\n';
    });

    this.listBox.setContent(content);

    const selectedCount = this.selected.size;
    const totalSize = [...this.selected]
      .map((path) => this.files.find((f) => f.fullPath === path)?.size || 0)
      .reduce((a, b) => a + b, 0);

    this.infoBox.setContent(
      `${this.files.length} items` +
        (selectedCount > 0 ? ` | {${THEME.colors.selected}-fg}${selectedCount} selected (${formatSize(totalSize)}){/}` : '')
    );
  }

  moveUp() {
    if (this.cursor > 0) {
      this.cursor--;
      this.render();
    }
  }

  moveDown() {
    if (this.cursor < this.files.length - 1) {
      this.cursor++;
      this.render();
    }
  }

  async enter() {
    const file = this.files[this.cursor];
    if (!file) return;

    if (file.isDirectory || file.isSymlink) {
      if (file.isParent) {
        await this.goUp();
      } else {
        this.currentPath = file.fullPath;
        this.cursor = 0;
        this.scroll = 0;
        this.selected.clear();
        await this.refresh();
      }
    }
  }

  async goUp() {
    if (this.mode === 'local') {
      const parent = dirname(this.currentPath);
      if (parent !== this.currentPath) {
        this.currentPath = parent;
        this.cursor = 0;
        this.scroll = 0;
        this.selected.clear();
        await this.refresh();
      }
    } else {
      if (this.currentPath !== '/') {
        const parts = this.currentPath.split('/').filter(Boolean);
        parts.pop();
        this.currentPath = parts.length ? '/' + parts.join('/') : '/';
        this.cursor = 0;
        this.scroll = 0;
        this.selected.clear();
        await this.refresh();
      }
    }
  }

  async goHome() {
    this.currentPath = this.mode === 'local' ? homedir() : '/sdcard';
    this.cursor = 0;
    this.scroll = 0;
    this.selected.clear();
    await this.refresh();
  }

  async goRoot() {
    this.currentPath = '/';
    this.cursor = 0;
    this.scroll = 0;
    this.selected.clear();
    await this.refresh();
  }

  async goTo(path) {
    this.currentPath = path;
    this.cursor = 0;
    this.scroll = 0;
    this.selected.clear();
    await this.refresh();
  }

  toggleSelect() {
    const file = this.files[this.cursor];
    if (!file || file.isParent) return;

    if (this.selected.has(file.fullPath)) {
      this.selected.delete(file.fullPath);
    } else {
      this.selected.add(file.fullPath);
    }

    this.moveDown();
  }

  selectAll() {
    this.files.forEach((file) => {
      if (!file.isParent) {
        this.selected.add(file.fullPath);
      }
    });
    this.render();
  }

  deselectAll() {
    this.selected.clear();
    this.render();
  }

  toggleHidden() {
    this.showHidden = !this.showHidden;
    this.refresh();
    this.emit('statusUpdate', `Hidden files: ${this.showHidden ? 'shown' : 'hidden'}`);
  }

  async toggleMode() {
    this.mode = this.mode === 'local' ? 'adb' : 'local';
    this.currentPath = this.mode === 'local' ? homedir() : '/sdcard';
    this.cursor = 0;
    this.scroll = 0;
    this.selected.clear();

    this.pathBox.style.fg = this.mode === 'adb' ? THEME.colors.adb : THEME.colors.local;

    await this.refresh();
    this.emit('statusUpdate', `Switched to ${this.mode.toUpperCase()} mode`);
  }

  getSelectedFiles() {
    if (this.selected.size === 0) {
      const file = this.files[this.cursor];
      if (file && !file.isParent) {
        return [{ path: file.fullPath, isDirectory: file.isDirectory }];
      }
      return [];
    }

    return [...this.selected].map((path) => {
      const file = this.files.find((f) => f.fullPath === path);
      return { path, isDirectory: file?.isDirectory || false };
    });
  }
}

