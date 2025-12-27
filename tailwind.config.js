/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'cyber-grid': "url('https://grainy-gradients.vercel.app/noise.svg')",
      },
      colors: {
        cyan: {
          400: '#00e5ff',
          500: '#00b8cc',
          900: '#003333',
        }
      }
    },
  },
  plugins: [],
}
