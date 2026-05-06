import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#13AF70',
        'primary-light': '#E8F9F1',
      },
      maxWidth: {
        mobile: '430px',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}

export default config
