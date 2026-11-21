/** Design tokens: colours, radii, shadows and fonts live here (see docs/DESIGN_SYSTEM.md). */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0f1f3d', 900: '#0b1730', 800: '#16294d', 700: '#1f3763', 600: '#2d4a80' },
        brand: { 50: '#e8faf6', 100: '#c9f3ea', 200: '#9fe8d8', 300: '#6fd9c3', 400: '#3cc5aa', 500: '#17a58c', 600: '#0f8a76', 700: '#0b6f60', 800: '#0a5a4f', 900: '#094a42' },
        lavender: { 50: '#f7f8fe', 100: '#eef0fb', 200: '#e1e5f7', 300: '#cfd5ee' },
        ink: { DEFAULT: '#1c2540', soft: '#4a5578', mute: '#6b7494' },
      },
      borderRadius: { card: '1rem', pill: '999px' },
      boxShadow: { card: '0 1px 2px rgba(15,31,61,.04), 0 4px 16px rgba(15,31,61,.06)', pop: '0 12px 40px rgba(15,31,61,.18)' },
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
};
