/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        conifer: '#0E1B0E',
        sage: '#8A9688',
        canvas: '#F5FBF2',
        soft: '#F4F6F3',
        line: '#DDE3DA',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
