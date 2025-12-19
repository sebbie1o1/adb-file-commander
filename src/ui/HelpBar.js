import blessed from 'blessed';
import { THEME } from './theme.js';

export class HelpBar {
  constructor(options) {
    this.box = blessed.box({
      parent: options.parent,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 1,
      style: {
        bg: THEME.colors.helpBg,
        fg: THEME.colors.helpFg,
      },
      tags: true,
    });

    this.render();
  }

  render() {
    const shortcuts = [
      { key: 'Tab', action: 'Switch' },
      { key: 'Space', action: 'Select' },
      { key: 'c', action: 'Copy' },
      { key: 'm', action: 'Move' },
      { key: 'd', action: 'Del' },
      { key: 't', action: 'Mode' },
      { key: 'i', action: 'Diff' },
      { key: 'u', action: 'SelDiff' },
      { key: 'g', action: 'GoTo' },
      { key: 'q', action: 'Quit' },
    ];

    const content = shortcuts
      .map(({ key, action }) => `{${THEME.colors.helpKey}-fg}${key}{/}:${action}`)
      .join('  ');

    this.box.setContent(` ${content}`);
  }
}

