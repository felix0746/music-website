const { fontFamily } = require('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        art: {
          ivory: '#F9F7F2',
          ink: '#1A1A1A',
          gold: '#C5A059',
          sage: '#7D8471',
        },
        retro: {
          dark: '#1A120B', // 深焦糖褐
          wood: '#3C2A21', // 胡桃木
          amber: '#E1974C', // 琥珀金
          cream: '#F5E8C7', // 復古米白
          wine: '#4A1C1C',  // 深酒紅
        }
      },
      fontFamily: {
        serif: ['var(--font-noto-serif)', ...fontFamily.serif],
        playfair: ['var(--font-playfair)', ...fontFamily.serif],
        cormorant: ['var(--font-cormorant)', ...fontFamily.serif],
      },
      letterSpacing: {
        'widest-plus': '0.25em',
      }
    },
  },
  plugins: [],
}

