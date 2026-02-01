/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Vibrant Player colors
        'player-red': '#E85454',
        'player-blue': '#4A90D9',
        'player-orange': '#E89B3C',
        'player-white': '#F0F0EC',

        // Vibrant Resource colors (matching terrain)
        'resource-brick': '#C45C3B',
        'resource-lumber': '#2D7A4F',
        'resource-ore': '#6B7B8C',
        'resource-grain': '#E8C43D',
        'resource-wool': '#7DC95E',

        // Vibrant Terrain colors
        'terrain-desert': '#E8D4A8',
        'terrain-hills': '#C45C3B',
        'terrain-mountains': '#6B7B8C',
        'terrain-forest': '#2D7A4F',
        'terrain-pasture': '#7DC95E',
        'terrain-fields': '#E8C43D',

        // Pastel backgrounds for UI
        'pastel-pink': '#FFE4E8',
        'pastel-blue': '#E4F0FF',
        'pastel-green': '#E4FFE8',
        'pastel-yellow': '#FFF8E4',

        // UI Colors - Clean and modern
        'ui-bg': '#FAF8F5',
        'ui-card': '#FFFFFF',
        'ui-border': '#E8E4E0',
        'ui-text': '#2D2D2D',
        'ui-text-muted': '#6A6A6A',
        'ui-accent': '#4A90D9',
        'ui-accent-hover': '#3A7DC4',
        'ui-success': '#4CAF50',
        'ui-warning': '#FF9800',
        'ui-error': '#E85454',

        // Ocean
        'ocean-light': '#87CEEB',
        'ocean-dark': '#4A90D9',
      },
      fontFamily: {
        'display': ['var(--font-display)', 'system-ui', 'sans-serif'],
        'body': ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'soft-md': '0 4px 12px rgba(0, 0, 0, 0.12)',
        'soft-lg': '0 8px 24px rgba(0, 0, 0, 0.15)',
        'glow': '0 0 20px rgba(74, 144, 217, 0.4)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      animation: {
        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}
