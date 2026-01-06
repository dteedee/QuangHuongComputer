/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-red': '#cb1c22', // FPT Shop Red
        'brand-gray': '#f3f4f6',
      }
    },
  },
  plugins: [require('tailwindcss-animate')],
}
