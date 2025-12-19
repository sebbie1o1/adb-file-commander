import blessed from 'blessed';
import { THEME } from './theme.js';

export class StatusBar {
  constructor(options) {
    this.box = blessed.box({
      parent: options.parent,
      bottom: 1,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: THEME.colors.statusBg,
        fg: THEME.colors.statusFg,
      },
      tags: true,
    });

    this.message = '';
    this.timeout = null;
  }

  setMessage(message, duration = 5000) {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.message = message;
    this.box.setContent(` ${message}`);
    this.box.screen.render();

    if (duration > 0) {
      this.timeout = setTimeout(() => {
        this.clear();
      }, duration);
    }
  }

  clear() {
    this.message = '';
    this.box.setContent('');
    this.box.screen.render();
  }
}


