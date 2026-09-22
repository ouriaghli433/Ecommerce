/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // The palette of the project. Use these names everywhere
      // (bg-sage, text-navy...) instead of writing hex codes in components.
      colors: {
        sage: {
          DEFAULT: '#ACBDAA',
          light: '#C7D3C5',
          soft: '#E7EDE6',
          dark: '#8DA08B',
        },
        navy: {
          DEFAULT: '#1E2D4C',
          light: '#33456B',
          soft: '#E4E8EF',
        },
        beige: {
          DEFAULT: '#CEC0BB',
          soft: '#F1EAE7',
        },
        muted: '#858585',
        cream: '#F7F8F5',
      },
      fontFamily: {
        // Poppins: geometric sans, close to the reference design.
        display: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '1.5rem',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(30, 45, 76, 0.18)',
        card: '0 18px 40px -20px rgba(30, 45, 76, 0.25)',
      },
    },
  },
  plugins: [],
}
