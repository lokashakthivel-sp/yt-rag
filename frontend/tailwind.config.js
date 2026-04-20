/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        // Light mode — dual-tone neumorphic
        'neu':        '8px 8px 16px #b8bcc2, -8px -8px 16px #ffffff',
        'neu-sm':     '4px 4px 8px #b8bcc2,  -4px -4px 8px #ffffff',
        'neu-xs':     '2px 2px 5px #b8bcc2,  -2px -2px 5px #ffffff',
        'neu-inset':  'inset 8px 8px 16px #b8bcc2, inset -8px -8px 16px #ffffff',
        'neu-inset-sm':'inset 4px 4px 8px #b8bcc2, inset -4px -4px 8px #ffffff',
        // Dark mode — deep slate dual-tone
        'neu-dark':        '6px 6px 12px #141c27, -6px -6px 12px #28364f',
        'neu-dark-sm':     '3px 3px 6px #141c27,  -3px -3px 6px #28364f',
        'neu-dark-xs':     '2px 2px 4px #141c27,  -2px -2px 4px #28364f',
        'neu-dark-inset':  'inset 6px 6px 12px #141c27, inset -6px -6px 12px #28364f',
        'neu-dark-inset-sm':'inset 3px 3px 6px #141c27, inset -3px -3px 6px #28364f',
        // Ambient float — used for modals / overlays
        'ambient': '0 24px 64px rgba(0,0,0,0.05), 0 4px 12px rgba(0,0,0,0.04)',
        'ambient-dark': '0 24px 64px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.25)',
      },
      colors: {
        slate: {
          150: '#eaecf2',
          750: '#253147',
          850: '#172030',
        },
      },
      letterSpacing: {
        editorial: '-0.02em',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.35s ease forwards',
        'pulse-soft': 'pulseSoft 1.8s ease-in-out infinite',
        'shimmer': 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
    },
  },
  plugins: [],
};
