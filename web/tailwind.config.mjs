/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0b14',
        surface: '#15152a',
        primary: 'hsl(270, 70%, 60%)',
        accent:  'hsl(187, 74%, 50%)',
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
