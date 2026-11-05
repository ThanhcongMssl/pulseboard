import type { Preview } from '@storybook/nextjs-vite';
import '../app/globals.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Color theme',
      toolbar: { title: 'Theme', icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    // The same switch the app uses: data-theme on <html> (see lib/theme.ts).
    (Story, { globals }) => {
      if (globals.theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
      else document.documentElement.removeAttribute('data-theme');
      return (
        <div className="bg-page p-6 text-ink">
          <Story />
        </div>
      );
    },
  ],
  parameters: { layout: 'fullscreen' },
};

export default preview;
