/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Calm Food Tech Neutral Foundation (Stone / Warm Gray)
        surface: {
          50: '#FAF9F6',   // Alabaster warm background
          100: '#F5F4F0',  // Soft stone card back
          200: '#EAE8E2',  // Subtle border
          300: '#D6D3CB',  // Neutral border
          400: '#A8A49B',  // Muted icon/text
          500: '#737068',  // Secondary text
          600: '#524F48',  // Strong text
          700: '#3D3B36',  // Dark surface
          800: '#262522',  // Deep charcoal
          900: '#191816',  // Pure dark background
          950: '#100F0E',  // OLED night
        },
        // Fresh Botanical Accent (Signature Brand Green / Mint)
        brand: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#16A34A',  // Fresh Botanical Core
          600: '#15803D',
          700: '#166534',
          800: '#14532D',
          900: '#052E16',
        },
        // Warm Tangerine / Appetite Accent (for Countdowns & Energy)
        accent: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',  // Warm Citrus
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12',
        },
        // Semantic Food Palette
        veg: {
          50: '#F0FDF4',
          100: '#DCFCE7',
          500: '#16A34A',
          600: '#15803D',
          700: '#166534',
        },
        nonveg: {
          50: '#FEF2F2',
          100: '#FEE2E2',
          500: '#DC2626',
          600: '#B91C1C',
          700: '#991B1B',
        },
        skip: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          500: '#64748B',
          600: '#475569',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'Inter', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.02)',
        'card-hover': '0 12px 24px -6px rgba(0, 0, 0, 0.06), 0 4px 8px -4px rgba(0, 0, 0, 0.03)',
        'float': '0 20px 40px -12px rgba(0, 0, 0, 0.12)',
        'button-brand': '0 2px 8px -1px rgba(22, 163, 74, 0.35)',
        'button-accent': '0 2px 8px -1px rgba(249, 115, 22, 0.35)',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '22px',
        '4xl': '28px',
      },
    },
  },
  plugins: [],
};
