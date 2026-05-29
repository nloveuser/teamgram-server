import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg:         '#0d1117',
        surface:    '#161b22',
        surface2:   '#1c2230',
        border:     '#21262d',
        border2:    '#30363d',
        tx:         '#e6edf3',
        muted:      '#7d8590',
        accent:     '#2f81f7',
        'accent-h': '#388bfd',
        ok:         '#3fb950',
        err:        '#f85149',
        warn:       '#d29922',
        purple:     '#a371f7',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
