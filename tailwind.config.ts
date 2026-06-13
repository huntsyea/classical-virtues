import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";
import animatePlugin from "tailwindcss-animate";
import typography from '@tailwindcss/typography';

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ['var(--font-heading)', ...fontFamily.serif],
        body: ['var(--font-body)', ...fontFamily.sans],
        text: ['var(--font-text)', 'Literata', 'Georgia', ...fontFamily.serif]
      },
      typography: {
        DEFAULT: {
          css: {
            // Warm ink from the site's own tokens, not typography's cool grays.
            '--tw-prose-body': 'var(--foreground)',
            '--tw-prose-headings': 'var(--foreground)',
            '--tw-prose-lead': 'var(--foreground)',
            '--tw-prose-links': 'var(--primary)',
            '--tw-prose-bold': 'var(--foreground)',
            '--tw-prose-counters': 'var(--muted-foreground)',
            '--tw-prose-bullets': 'var(--muted-foreground)',
            '--tw-prose-hr': 'var(--border)',
            '--tw-prose-quotes': 'var(--foreground)',
            '--tw-prose-quote-borders': 'var(--border)',
            '--tw-prose-captions': 'var(--muted-foreground)',
            '--tw-prose-kbd': 'var(--foreground)',
            '--tw-prose-code': 'var(--foreground)',
            '--tw-prose-pre-code': 'var(--background)',
            '--tw-prose-pre-bg': 'var(--foreground)',
            '--tw-prose-th-borders': 'var(--border)',
            '--tw-prose-td-borders': 'var(--border)',
            // Book measure: prose never needs max-w-none hacks.
            maxWidth: '68ch',
            // Literata text face for story prose; Georgia as the book-serif fallback.
            fontFamily: "var(--font-text, Literata), Georgia, 'Times New Roman', serif",
            // Display headings stay Instrument Serif at its single natural weight.
            'h1, h2, h3, h4, h5, h6': {
              fontFamily: 'var(--font-heading), ui-serif, Georgia, serif',
              fontWeight: '400'
            },
            a: {
              color: 'var(--primary)',
              textUnderlineOffset: '3px',
              textDecorationThickness: '1px'
            },
            blockquote: {
              fontWeight: '400',
              fontStyle: 'italic'
            },
            strong: {
              fontWeight: '700'
            }
          }
        }
      },
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)'
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)'
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)'
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)'
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)'
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)'
        },
      },
      borderRadius: {
        xl: `calc(var(--radius) + 4px)`,
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: `calc(var(--radius) - 4px)`
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out"
      },
    },
  },
  plugins: [
    typography,
    animatePlugin
  ],
};

export default config;