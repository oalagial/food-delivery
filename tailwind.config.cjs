module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        // Brand + neutral system (serious, clean)
        brand: {
          50: '#FFF3E8',
          100: '#FFE2CC',
          200: '#FFC799',
          300: '#FFAB66',
          400: '#FF9033',
          500: '#F5861F',
          600: '#E8740F',
          700: '#C8600C',
          800: '#A44E0A',
          900: '#7E3C07',
        },
        app: {
          bg: '#FAFAFB',
          surface: '#FFFFFF',
          surface2: '#F4F5F7',
          border: '#E7E9EE',
          text: '#121417',
          muted: '#6B7280',
        },
      },
    },
  },
  plugins: [],
}
