/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f5ff',
          100: '#e6ebff',
          500: '#4f5bd5',
          600: '#3f49b8',
          700: '#333c96',
        },
      },
    },
  },
  plugins: [],
};
