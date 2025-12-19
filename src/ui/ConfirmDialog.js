import blessed from 'blessed';
import { THEME } from './theme.js';

export class ConfirmDialog {
  constructor(options) {
    this.parent = options.parent;
    this.keyHandlers = [];

    this.box = blessed.box({
      parent: this.parent,
      top: 'center',
      left: 'center',
      width: 50,
      height: 8,
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
      height: 2,
      content: '',
      style: {
        fg: THEME.colors.fg,
        bg: THEME.colors.dialogBg,
      },
      tags: true,
    });

    this.buttonsBox = blessed.text({
      parent: this.box,
      bottom: 1,
      left: 'center',
      width: 30,
      height: 1,
      content: '',
      style: {
        bg: THEME.colors.dialogBg,
      },
      tags: true,
    });

    this.hint = blessed.text({
      parent: this.box,
      bottom: 0,
      left: 2,
      right: 2,
      height: 1,
      content: '{gray-fg}← → to select, Enter to confirm, Esc to cancel{/}',
      style: {
        bg: THEME.colors.dialogBg,
      },
      tags: true,
    });

    this.resolve = null;
    this.selected = 0;
  }

  show(messageText) {
    return new Promise((resolve) => {
      this.resolve = resolve;
      this.message.setContent(messageText);
      this.selected = 0;
      this.updateButtons();
      this.box.show();
      this.parent.render();

      this.cleanup();

      const onKey = (key) => {
        if (key === 'y') {
          this.finish(resolve, true);
        } else if (key === 'n' || key === 'escape') {
          this.finish(resolve, false);
        } else if (key === 'enter') {
          this.finish(resolve, this.selected === 0);
        } else if (key === 'left' || key === 'right' || key === 'tab') {
          this.selected = this.selected === 0 ? 1 : 0;
          this.updateButtons();
          this.parent.render();
        }
      };

      this.keyHandlers = [
        { keys: 'y', handler: () => onKey('y') },
        { keys: 'n', handler: () => onKey('n') },
        { keys: 'escape', handler: () => onKey('escape') },
        { keys: 'enter', handler: () => onKey('enter') },
        { keys: 'left', handler: () => onKey('left') },
        { keys: 'right', handler: () => onKey('right') },
        { keys: 'tab', handler: () => onKey('tab') },
      ];

      this.keyHandlers.forEach(({ keys, handler }) => {
        this.parent.key(keys, handler);
      });
    });
  }

  updateButtons() {
    const yesStyle = this.selected === 0
      ? `{${THEME.colors.success}-bg}{black-fg} [ YES ] {/}`
      : `{${THEME.colors.dialogBg}-bg}{${THEME.colors.fg}-fg}   yes   {/}`;

    const noStyle = this.selected === 1
      ? `{${THEME.colors.error}-bg}{black-fg} [ NO ] {/}`
      : `{${THEME.colors.dialogBg}-bg}{${THEME.colors.fg}-fg}   no   {/}`;

    this.buttonsBox.setContent(`${yesStyle}     ${noStyle}`);
  }

  cleanup() {
    this.keyHandlers.forEach(({ keys, handler }) => {
      this.parent.unkey(keys, handler);
    });
    this.keyHandlers = [];
  }

  finish(resolve, result) {
    this.cleanup();
    this.hide();
    resolve(result);
  }

  hide() {
    this.box.hide();
    this.parent.render();
  }
}
