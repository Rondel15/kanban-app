/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0f0ff',
          100: '#e4e4fe',
          200: '#cccbfd',
          400: '#7c6af7',
          500: '#6c59e6',
          600: '#5a49cc',
        },
      },
    },
  },
  plugins: [],
}
