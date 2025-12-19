import blessed from 'blessed';
import { THEME } from './theme.js';

export class ConfirmDialog {
  constructor(options) {
    this.parent = options.parent;

    this.box = blessed.box({
      parent: this.parent,
      top: 'center',
      left: 'center',
      width: 50,
      height: 7,
      border: { type: 'line' },
      style: {
        bg: THEME.colors.dialogBg,
        border: { fg: THEME.colors.dialogBorder },
      },
      hidden: true,
      tags: true,
      label: ' Confirm ',
    });

    this.message = blessed.text({
      parent: this.box,
      top: 1,
      left: 2,
      right: 2,
      content: '',
      style: {
        fg: THEME.colors.fg,
        bg: THEME.colors.dialogBg,
      },
      tags: true,
    });

    this.buttons = blessed.box({
      parent: this.box,
      bottom: 1,
      left: 'center',
      width: 20,
      height: 1,
      style: {
        bg: THEME.colors.dialogBg,
      },
      tags: true,
    });

    this.yesBtn = blessed.button({
      parent: this.buttons,
      left: 0,
      width: 8,
      height: 1,
      content: '  Yes  ',
      style: {
        fg: THEME.colors.fg,
        bg: THEME.colors.success,
        focus: {
          bg: THEME.colors.selected,
        },
      },
      mouse: true,
    });

    this.noBtn = blessed.button({
      parent: this.buttons,
      right: 0,
      width: 8,
      height: 1,
      content: '  No   ',
      style: {
        fg: THEME.colors.fg,
        bg: THEME.colors.error,
        focus: {
          bg: THEME.colors.warning,
        },
      },
      mouse: true,
    });

    this.resolve = null;
    this.focused = 0;
  }

  show(messageText) {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.message.setContent(messageText);
      this.focused = 1;
      this.updateFocus();
      this.box.show();
      this.parent.render();

      const cleanup = () => {
        this.parent.unkey(['y', 'n', 'enter', 'escape', 'left', 'right', 'tab']);
      };

      this.parent.key('y', () => {
        cleanup();
        this.hide();
        resolve(true);
      });

      this.parent.key('n', () => {
        cleanup();
        this.hide();
        resolve(false);
      });

      this.parent.key('escape', () => {
        cleanup();
        this.hide();
        resolve(false);
      });

      this.parent.key('enter', () => {
        cleanup();
        this.hide();
        resolve(this.focused === 0);
      });

      this.parent.key(['left', 'right', 'tab'], () => {
        this.focused = this.focused === 0 ? 1 : 0;
        this.updateFocus();
        this.parent.render();
      });

      this.yesBtn.on('press', () => {
        cleanup();
        this.hide();
        resolve(true);
      });

      this.noBtn.on('press', () => {
        cleanup();
        this.hide();
        resolve(false);
      });
    });
  }

  updateFocus() {
    if (this.focused === 0) {
      this.yesBtn.style.bg = THEME.colors.selected;
      this.noBtn.style.bg = THEME.colors.error;
    } else {
      this.yesBtn.style.bg = THEME.colors.success;
      this.noBtn.style.bg = THEME.colors.warning;
    }
  }

  hide() {
    this.box.hide();
    this.parent.render();
  }
}

