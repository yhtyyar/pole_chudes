/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ['attribute', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg:     'var(--color-bg)',
        panel:  'var(--color-panel)',
        card:   'var(--color-card)',
        accent: '#e94560',
        gold:   '#f5c542',
        success:'#00d26a',
        error:  '#ff6b6b',
        text:   'var(--color-text)',
        'text-muted': 'var(--color-text-muted)',
        border: 'var(--color-border)',
      },
      fontFamily: {
        sans: ['Montserrat', 'Roboto', 'sans-serif'],
      },
      animation: {
        'spin-drum': 'spin-drum 3s cubic-bezier(0.2,0.8,0.5,1) forwards',
        'reveal': 'reveal 0.35s ease-out forwards',
        'pulse-red': 'pulse-red 0.5s ease-in-out infinite',
        'bounce-in': 'bounce-in 0.4s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
      },
      keyframes: {
        'spin-drum': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(1440deg)' },
        },
        'reveal': {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '70%': { transform: 'scale(1.1)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'pulse-red': {
          '0%, 100%': { backgroundColor: '#e94560' },
          '50%': { backgroundColor: '#ff0000' },
        },
        'bounce-in': {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
