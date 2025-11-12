import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f7f4',
          100: '#d8ebe4',
          200: '#b2d7c9',
          300: '#85c1ad',
          400: '#4ea88c',
          500: '#197a60',   // Cypressdale primary (mid)
          600: '#0f5d47',   // Cypressdale deep
          700: '#0c4a39',
          800: '#083529',
          900: '#062a21',
        },
        accent: {
          50:  '#fff7eb',
          100: '#fee9c6',
          200: '#fdd38a',
          300: '#fbb954',
          400: '#f4a53a',
          500: '#d18a2d',   // Cypressdale accent (warm golden)
          600: '#b77325',
          700: '#8f571c',
          800: '#6b4015',
          900: '#4f2f10',
        }
      },
      boxShadow: {
        soft: '0 8px 24px rgba(0,0,0,0.06)'
      }
    },
  },
  plugins: [],
} satisfies Config
