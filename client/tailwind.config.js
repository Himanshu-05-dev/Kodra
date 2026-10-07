/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ide: {
          bg: '#08090d',          // Deep cyber obsidian
          sidebar: '#0d0f17',     // Dark cosmic slate
          panel: '#121520',       // Elevated glass panel
          elevated: '#171b29',    // Floating modals/menus
          border: 'rgba(255, 255, 255, 0.08)',
          borderHover: 'rgba(255, 255, 255, 0.18)',
          activeTab: '#121520',
          inactiveTab: '#090b10',
          hover: 'rgba(255, 255, 255, 0.05)',
          text: '#e2e8f0',
          muted: '#64748b',
          accent: '#a855f7',      // Cyber violet accent
          cyan: '#06b6d4',        // Electric cyan
          pink: '#ec4899',        // Neon pink
          emerald: '#10b981',     // Mint emerald
          amber: '#f59e0b'        // Sunset amber
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif']
      },
      boxShadow: {
        'glow-purple': '0 0 25px -4px rgba(168, 85, 247, 0.35)',
        'glow-cyan': '0 0 25px -4px rgba(6, 182, 212, 0.35)',
        'glow-sm': '0 0 12px -2px rgba(168, 85, 247, 0.25)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'equalizer-1': 'equalizer 1s ease-in-out infinite',
        'equalizer-2': 'equalizer 0.8s ease-in-out infinite 0.2s',
        'equalizer-3': 'equalizer 1.2s ease-in-out infinite 0.4s',
        'equalizer-4': 'equalizer 0.9s ease-in-out infinite 0.1s'
      },
      keyframes: {
        equalizer: {
          '0%, 100%': { height: '3px' },
          '50%': { height: '13px' }
        }
      }
    },
  },
  plugins: [],
};
