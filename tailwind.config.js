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
        'primary': 'var(--color-primary)',   // amarillo dorado
        'secondary': 'var(--color-secondary)', // negro logo
        'accent': 'var(--color-accent)',    // negro total
        'coral': 'var(--color-coral)',     // coral para títulos
        'text-dark': 'var(--color-text-dark)', 
        'text-light': 'var(--color-text-light)', 
        'text-medium': 'var(--color-text-medium)',
        'bg-dark': 'var(--color-bg-dark)',
        'bg-card': 'var(--color-bg-card)',
        'bg-light': 'var(--color-bg-light)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        'decorative': ['var(--font-decorative)'],
      },
      backgroundColor: {
        'coral-30': 'rgba(231, 111, 81, 0.3)',
      }
    },
  },
  plugins: [],
}; 