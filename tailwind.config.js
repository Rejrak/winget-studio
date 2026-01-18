/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './renderer.js'],
  theme: {
    extend: {
      colors: {
        ink: '#0b0f17',
        panel: '#0f172a',
        panelStrong: '#0b1224',
        accent: '#f97316',
        mint: '#2dd4bf',
        rose: '#fb7185'
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.04), 0 20px 60px rgba(0,0,0,0.45)'
      }
    }
  }
};
