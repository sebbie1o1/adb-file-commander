import blessed from 'blessed';
import { THEME } from './theme.js';

export class ProgressDialog {
  constructor(options) {
    this.parent = options.parent;

    this.box = blessed.box({
      parent: this.parent,
      top: 'center',
      left: 'center',
      width: 60,
      height: 9,
      border: { type: 'line' },
      style: {
        bg: THEME.colors.dialogBg,
        border: { fg: THEME.colors.dialogBorder },
      },
      hidden: true,
      tags: true,
      label: ' Progress ',
    });

    this.title = blessed.text({
      parent: this.box,
      top: 1,
      left: 2,
      right: 2,
      content: '',
      style: {
        fg: THEME.colors.fg,
        bg: THEME.colors.dialogBg,
      },
    });

    this.progressBar = blessed.progressbar({
      parent: this.box,
      top: 3,
      left: 2,
      right: 2,
      height: 1,
      style: {
        bg: THEME.colors.panelBg,
        bar: {
          bg: THEME.colors.success,
        },
      },
      filled: 0,
    });

    this.currentFile = blessed.text({
      parent: this.box,
      top: 5,
      left: 2,
      right: 2,
      height: 1,
      content: '',
      style: {
        fg: THEME.colors.helpFg,
        bg: THEME.colors.dialogBg,
      },
      tags: true,
    });

    this.percentage = blessed.text({
      parent: this.box,
      top: 3,
      left: 'center',
      width: 6,
      height: 1,
      content: '0%',
      style: {
        fg: THEME.colors.fg,
        bg: THEME.colors.dialogBg,
      },
    });
  }

  show(title) {
    this.title.setContent(title);
    this.progressBar.setProgress(0);
    this.percentage.setContent('0%');
    this.currentFile.setContent('');
    this.box.show();
    this.parent.render();
  }

  update(progress, currentFile = '') {
    const percent = Math.round(progress * 100);
    this.progressBar.setProgress(percent);
    this.percentage.setContent(`${percent}%`);

    let displayFile = currentFile;
    if (displayFile.length > 50) {
      displayFile = '...' + displayFile.slice(-47);
    }
    this.currentFile.setContent(displayFile);
  }

  hide() {
    this.box.hide();
    this.parent.render();
  }
}

