/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Inter var"',
          'Inter',
          '"Noto Sans Devanagari"',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'sans-serif',
        ],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Warm neutral foundation
        canvas: '#F6F7F6',
        surface: '#FFFFFF',
        ink: {
          900: '#111917',
          800: '#1D2926',
          700: '#33423E',
          600: '#4C5B57',
          500: '#6B7A76',
          400: '#8D9A96',
          300: '#B4BFBB',
          200: '#D6DEDB',
          100: '#E9EEEC',
          50: '#F3F6F5',
        },
        // Restrained healthcare teal accent
        care: {
          50: '#EFF8F6',
          100: '#D6EDE8',
          200: '#AFDCD3',
          300: '#7FC4B8',
          400: '#4EA79A',
          500: '#2E8B7E',
          600: '#1F6F66',
          700: '#1A5952',
          800: '#164843',
          900: '#123B37',
        },
        risk: {
          green: '#1B7F4E',
          greenSoft: '#E8F5EE',
          greenBorder: '#B4DFC7',
          amber: '#A8620A',
          amberSoft: '#FDF3E3',
          amberBorder: '#F0D3A0',
          red: '#B4231C',
          redSoft: '#FDEDEB',
          redBorder: '#F3C0BB',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06)',
        raised: '0 4px 12px -2px rgba(16, 24, 40, 0.08), 0 2px 4px -2px rgba(16, 24, 40, 0.06)',
        pop: '0 12px 32px -8px rgba(16, 24, 40, 0.16), 0 4px 8px -4px rgba(16, 24, 40, 0.08)',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.92)', opacity: '0.7' },
          '70%': { transform: 'scale(1.25)', opacity: '0' },
          '100%': { transform: 'scale(1.25)', opacity: '0' },
        },
        'bar': {
          '0%,100%': { transform: 'scaleY(0.35)' },
          '50%': { transform: 'scaleY(1)' },
        },
        'indeterminate': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(300%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'slide-up': 'slide-up 220ms ease-out',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.24, 0, 0.38, 1) infinite',
        'indeterminate': 'indeterminate 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
