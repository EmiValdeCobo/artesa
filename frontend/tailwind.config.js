// OPCIONAL. El proyecto usa Tailwind v4: la fuente de verdad es `src/index.css` (@theme).
// Usa este archivo solo si (a) el equipo baja a Tailwind v3, o (b) quiere cargarlo en v4 con
//   @config "../tailwind.config.js";   (línea justo debajo de @import "tailwindcss" en index.css)
// En v3, `darkMode: 'class'` + variables CSS (:root/.dark) del index.css funcionan igual.
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Montserrat Variable"', 'Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        // Semánticos (cambian solos con .dark)
        background: 'var(--bg-primary)', surface: 'var(--bg-surface)', muted: 'var(--bg-muted)',
        sidebar: 'var(--bg-sidebar)', fg: 'var(--text-primary)', 'fg-muted': 'var(--text-secondary)',
        'on-sidebar': 'var(--text-on-sidebar)', 'on-accent': 'var(--text-on-accent)', line: 'var(--border-color)',
        primary: { DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)', soft: 'var(--accent-soft)', text: 'var(--accent-text)' },
        secondary: { DEFAULT: 'var(--secondary)', soft: 'var(--secondary-soft)', text: 'var(--secondary-text)' },
        success: { DEFAULT: 'var(--success)', soft: 'var(--success-soft)' },
        warning: { DEFAULT: 'var(--warning)', soft: 'var(--warning-soft)' },
        danger:  { DEFAULT: 'var(--danger)',  soft: 'var(--danger-soft)' },
        info:    { DEFAULT: 'var(--info)',    soft: 'var(--info-soft)' },
        ring: 'var(--ring)',
        // Paleta cruda de marca
        terracota: { 50:'#fbf1ec',100:'#f5ddd2',200:'#ebbca7',300:'#de9776',400:'#c97752',500:'#b15c3d',600:'#984a2f',700:'#7b3b27',800:'#5f2e20',900:'#44211a' },
        ocre: { 50:'#fdf7ea',100:'#faebc9',200:'#f4d79c',300:'#edc173',400:'#e8b866',500:'#e1a651',600:'#c58a38',700:'#9f6c2b',800:'#7a5224',900:'#583b1d' },
        espresso: { 50:'#f7f5f0',100:'#efebe4',200:'#ddd6cb',300:'#bfb5a7',400:'#9a8e7f',500:'#756a5d',600:'#5a4f45',700:'#44362d',800:'#36231b',900:'#321f19',950:'#1f120e' },
      },
    },
  },
};
