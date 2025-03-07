/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FFD700',   // amarillo más brillante
        secondary: '#212121', // negro logo
        accent: '#000000',    // negro total
        'text-dark': '#1a1a1a', // texto oscuro para fondos claros
        'text-light': '#ffffff', // texto claro para fondos oscuros
        'text-medium': '#E0E0E0', // texto gris muy claro para mejor contraste en fondos oscuros
      },
      fontFamily: {
        sans: ['var(--font-montserrat)', 'sans-serif'],
        'dancing-script': ['var(--font-dancing-script)', 'cursive'],
      },
    },
  },
  plugins: [],
}; 