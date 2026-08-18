/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // JobClaw's slot in the Railgun product palette is teal; Meet holds
        // violet. Distinct hues are what make one shared account feel like
        // several products rather than an undifferentiated suite.
        //
        // `primary` and `accent` are the same teal on purpose — the old
        // theme used two competing brand hues, which meant a page had no
        // single thing your eye landed on. Emphasis now comes from weight
        // and surface, not from a second colour fighting the first.
        bg: '#0a0f12',
        surface: '#111b20',
        primary: '#2dd4bf',
        accent: '#2dd4bf',
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
