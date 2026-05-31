import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      // Tracking suave — Playfair (display serif) com kerning apertado
      // vira borrão. Defaults Tailwind eram agressivos (-0.025em em tight,
      // -0.05em em tighter). Suavizamos sem chegar a wide.
      letterSpacing: {
        tighter: "-0.01em",
        tight: "-0.005em",
        normal: "0em",
        wide: "0.01em",
        wider: "0.025em",
        widest: "0.08em",
      },
      colors: {
        // Tokens Lustro
        brand: {
          DEFAULT: "hsl(var(--brand))",
          fg: "hsl(var(--brand-fg))",
          soft: "hsl(var(--brand-soft))",
        },
        ink: "hsl(var(--ink))",
        surface: {
          DEFAULT: "hsl(var(--surface))",
          2: "hsl(var(--surface-2))",
          3: "hsl(var(--surface-3))",
        },
        subtle: "hsl(var(--subtle))",
        line: "hsl(var(--line))",
        ok: "hsl(var(--ok))",
        warn: "hsl(var(--warn))",
        danger: "hsl(var(--danger))",

        // shadcn legacy (mantém compat com components/ui/*)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        DEFAULT: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
      },
      boxShadow: {
        xs: "0 1px 0 0 hsl(var(--ink) / 0.04)",
        sm: "0 1px 2px 0 hsl(var(--ink) / 0.06), 0 0 0 1px hsl(var(--ink) / 0.04)",
        md: "0 4px 16px -4px hsl(var(--ink) / 0.08), 0 2px 4px -2px hsl(var(--ink) / 0.05)",
        lg: "0 12px 32px -8px hsl(var(--ink) / 0.12), 0 4px 8px -4px hsl(var(--ink) / 0.06)",
        xl: "0 32px 64px -16px hsl(var(--ink) / 0.18), 0 8px 16px -8px hsl(var(--ink) / 0.06)",
        glow: "0 0 0 4px hsl(var(--brand) / 0.18)",
      },
      animation: {
        "fade-up": "fadeUp .6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fadeIn .6s ease both",
        "pop-in": "popIn .35s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "pop-check": "pop-check .8s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        popIn: {
          "0%": { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
