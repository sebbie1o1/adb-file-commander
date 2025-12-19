import blessed from 'blessed';
import { THEME } from './theme.js';

export class InputDialog {
  constructor(options) {
    this.parent = options.parent;

    this.box = blessed.box({
      parent: this.parent,
      top: 'center',
      left: 'center',
      width: 60,
      height: 7,
      border: { type: 'line' },
      style: {
        bg: THEME.colors.dialogBg,
        border: { fg: THEME.colors.dialogBorder },
      },
      hidden: true,
      tags: true,
    });

    this.label = blessed.text({
      parent: this.box,
      top: 1,
      left: 2,
      content: '',
      style: {
        fg: THEME.colors.fg,
        bg: THEME.colors.dialogBg,
      },
    });

    this.input = blessed.textbox({
      parent: this.box,
      top: 3,
      left: 2,
      right: 2,
      height: 1,
      style: {
        fg: THEME.colors.fg,
        bg: THEME.colors.panelBg,
        focus: {
          bg: THEME.colors.cursorBg,
        },
      },
      inputOnFocus: true,
    });

    this.resolve = null;
  }

  show(labelText, defaultValue = '') {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.label.setContent(labelText);
      this.input.setValue(defaultValue);
      this.box.show();
      this.input.focus();
      this.parent.render();

      this.input.once('submit', (value) => {
        this.hide();
        resolve(value);
      });

      this.input.once('cancel', () => {
        this.hide();
        resolve(null);
      });

      this.input.key('escape', () => {
        this.hide();
        resolve(null);
      });
    });
  }

  hide() {
    this.box.hide();
    this.parent.render();
  }
}


