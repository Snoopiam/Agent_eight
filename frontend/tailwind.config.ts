import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Agent Eight color palette - cyberpunk/hacker aesthetic
        'agent': {
          'bg': '#0a0e14',
          'surface': '#131920',
          'surface-light': '#1a222d',
          'border': '#2d3848',
          'text': '#c5c8c6',
          'text-muted': '#6b7280',
          'accent': '#00ff9f',
          'accent-dim': '#00cc7f',
          'critical': '#ff3b5c',
          'high': '#ff8c42',
          'medium': '#ffd93d',
          'low': '#6bcb77',
          'info': '#4d96ff',
        },
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
        'display': ['Orbitron', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(0, 255, 159, 0.3)' },
          '50%': { opacity: '0.8', boxShadow: '0 0 40px rgba(0, 255, 159, 0.6)' },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;

