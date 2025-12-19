#!/usr/bin/env node

import blessed from 'blessed';
import { FilePanel } from './ui/Panel.js';
import { StatusBar } from './ui/StatusBar.js';
import { HelpBar } from './ui/HelpBar.js';
import { InputDialog } from './ui/InputDialog.js';
import { ConfirmDialog } from './ui/ConfirmDialog.js';
import { ProgressDialog } from './ui/ProgressDialog.js';
import { copyFiles, moveFiles, deleteFiles } from './operations/fileOps.js';
import { THEME } from './ui/theme.js';

class AdbCommander {
  constructor() {
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'ADB Commander',
      cursor: { artificial: true, shape: 'line', blink: true, color: null },
    });

    this.activePanel = 'left';
    this.setupUI();
    this.setupKeyBindings();
  }

  setupUI() {
    this.leftPanel = new FilePanel({
      parent: this.screen,
      position: 'left',
      label: ' Local ',
      path: process.cwd(),
      mode: 'local',
    });

    this.rightPanel = new FilePanel({
      parent: this.screen,
      position: 'right',
      label: ' ADB ',
      path: '/sdcard',
      mode: 'adb',
    });

    this.statusBar = new StatusBar({
      parent: this.screen,
    });

    this.helpBar = new HelpBar({
      parent: this.screen,
    });

    this.inputDialog = new InputDialog({ parent: this.screen });
    this.confirmDialog = new ConfirmDialog({ parent: this.screen });
    this.progressDialog = new ProgressDialog({ parent: this.screen });

    this.leftPanel.setActive(true);
    this.rightPanel.setActive(false);

    this.leftPanel.on('statusUpdate', (msg) => this.statusBar.setMessage(msg));
    this.rightPanel.on('statusUpdate', (msg) => this.statusBar.setMessage(msg));

    this.screen.render();
  }

  getActivePanel() {
    return this.activePanel === 'left' ? this.leftPanel : this.rightPanel;
  }

  getInactivePanel() {
    return this.activePanel === 'left' ? this.rightPanel : this.leftPanel;
  }

  switchPanel() {
    this.activePanel = this.activePanel === 'left' ? 'right' : 'left';
    this.leftPanel.setActive(this.activePanel === 'left');
    this.rightPanel.setActive(this.activePanel === 'right');
    this.screen.render();
  }

  setupKeyBindings() {
    this.screen.key(['escape', 'q', 'C-c'], () => process.exit(0));

    this.screen.key(['tab', 'left', 'right'], () => this.switchPanel());

    this.screen.key('up', () => {
      this.getActivePanel().moveUp();
      this.screen.render();
    });

    this.screen.key('down', () => {
      this.getActivePanel().moveDown();
      this.screen.render();
    });

    this.screen.key('enter', async () => {
      await this.getActivePanel().enter();
      this.screen.render();
    });

    this.screen.key('space', () => {
      this.getActivePanel().toggleSelect();
      this.screen.render();
    });

    this.screen.key('a', () => {
      this.getActivePanel().selectAll();
      this.screen.render();
    });

    this.screen.key('n', () => {
      this.getActivePanel().deselectAll();
      this.screen.render();
    });

    this.screen.key('c', () => this.copySelected());
    this.screen.key('m', () => this.moveSelected());
    this.screen.key('d', () => this.deleteSelected());

    this.screen.key('r', async () => {
      await this.getActivePanel().refresh();
      this.screen.render();
    });

    this.screen.key('h', () => {
      this.getActivePanel().toggleHidden();
      this.screen.render();
    });

    this.screen.key('.', async () => {
      await this.getActivePanel().goUp();
      this.screen.render();
    });

    this.screen.key('~', async () => {
      await this.getActivePanel().goHome();
      this.screen.render();
    });

    this.screen.key('/', async () => {
      await this.getActivePanel().goRoot();
      this.screen.render();
    });

    this.screen.key('g', async () => {
      const path = await this.inputDialog.show('Go to path:', this.getActivePanel().currentPath);
      if (path) {
        await this.getActivePanel().goTo(path);
        this.screen.render();
      }
    });

    this.screen.key('t', async () => {
      await this.getActivePanel().toggleMode();
      this.screen.render();
    });
  }

  async copySelected() {
    const source = this.getActivePanel();
    const target = this.getInactivePanel();
    const selected = source.getSelectedFiles();

    if (selected.length === 0) {
      this.statusBar.setMessage('No files selected');
      this.screen.render();
      return;
    }

    const confirm = await this.confirmDialog.show(
      `Copy ${selected.length} item(s) to ${target.currentPath}?`
    );

    if (!confirm) return;

    this.progressDialog.show('Copying files...');
    this.screen.render();

    try {
      await copyFiles(selected, target.currentPath, source.mode, target.mode, (progress, file) => {
        this.progressDialog.update(progress, file);
        this.screen.render();
      });
      this.statusBar.setMessage(`Copied ${selected.length} item(s)`);
      source.deselectAll();
      await target.refresh();
    } catch (err) {
      this.statusBar.setMessage(`Error: ${err.message}`);
    }

    this.progressDialog.hide();
    this.screen.render();
  }

  async moveSelected() {
    const source = this.getActivePanel();
    const target = this.getInactivePanel();
    const selected = source.getSelectedFiles();

    if (selected.length === 0) {
      this.statusBar.setMessage('No files selected');
      this.screen.render();
      return;
    }

    const confirm = await this.confirmDialog.show(
      `Move ${selected.length} item(s) to ${target.currentPath}?`
    );

    if (!confirm) return;

    this.progressDialog.show('Moving files...');
    this.screen.render();

    try {
      await moveFiles(selected, target.currentPath, source.mode, target.mode, (progress, file) => {
        this.progressDialog.update(progress, file);
        this.screen.render();
      });
      this.statusBar.setMessage(`Moved ${selected.length} item(s)`);
      source.deselectAll();
      await source.refresh();
      await target.refresh();
    } catch (err) {
      this.statusBar.setMessage(`Error: ${err.message}`);
    }

    this.progressDialog.hide();
    this.screen.render();
  }

  async deleteSelected() {
    const panel = this.getActivePanel();
    const selected = panel.getSelectedFiles();

    if (selected.length === 0) {
      this.statusBar.setMessage('No files selected');
      this.screen.render();
      return;
    }

    const confirm = await this.confirmDialog.show(
      `DELETE ${selected.length} item(s)? This cannot be undone!`
    );

    if (!confirm) return;

    this.progressDialog.show('Deleting files...');
    this.screen.render();

    try {
      await deleteFiles(selected, panel.mode, (progress, file) => {
        this.progressDialog.update(progress, file);
        this.screen.render();
      });
      this.statusBar.setMessage(`Deleted ${selected.length} item(s)`);
      panel.deselectAll();
      await panel.refresh();
    } catch (err) {
      this.statusBar.setMessage(`Error: ${err.message}`);
    }

    this.progressDialog.hide();
    this.screen.render();
  }

  run() {
    this.screen.render();
  }
}

const app = new AdbCommander();
app.run();

