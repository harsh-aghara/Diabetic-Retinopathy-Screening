/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        clinical: {
          canvas: {
            light: '#F8FAFC',
            dark: '#020617',
          },
          card: {
            light: '#FFFFFF',
            dark: '#0F172A',
          },
          teal: {
            50: '#F0FDFA',
            100: '#CCFBF1',
            600: '#0D9488',
            700: '#0F766E',
            800: '#115E59',
            900: '#134E4A',
            400: '#2DD4BF',
          },
          slate: {
            border: '#E2E8F0',
            borderDark: '#1E293B',
          }
        },
        risk: {
          low: {
            surface: '#ECFDF5',
            surfaceDark: 'rgba(6, 78, 59, 0.25)',
            border: '#6EE7B7',
            borderDark: '#047857',
            text: '#064E3B',
            textDark: '#A7F3D0',
            badge: '#10B981',
          },
          moderate: {
            surface: '#FFFBEB',
            surfaceDark: 'rgba(120, 53, 15, 0.25)',
            border: '#FCD34D',
            borderDark: '#B45309',
            text: '#78350F',
            textDark: '#FDE68A',
            badge: '#F59E0B',
          },
          high: {
            surface: '#FFF1F2',
            surfaceDark: 'rgba(136, 19, 55, 0.25)',
            border: '#FDA4AF',
            borderDark: '#BE123C',
            text: '#881337',
            textDark: '#FECDD3',
            badge: '#F43F5E',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
