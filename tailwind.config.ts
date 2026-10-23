import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#101418",
        paper: "#F6F7F4",
        signal: "#1E7A62", // main brand green (slightly brighter than before)
        "signal-light": "#2FB38E", // used in gradients
        amber: "#E0A93B", // warm accent
        mist: "#E8F3EE", // soft green tint for highlighted areas
        drift: "#C2492D",
        line: "#E2E4DE",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,20,24,.04), 0 8px 24px -12px rgba(16,20,24,.12)",
        lift: "0 2px 4px rgba(16,20,24,.05), 0 22px 44px -18px rgba(16,20,24,.28)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        blob: {
          "0%, 100%": { transform: "translate(0,0) scale(1)" },
          "33%": { transform: "translate(40px,-30px) scale(1.08)" },
          "66%": { transform: "translate(-30px,25px) scale(.95)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        draw: { "0%": { strokeDashoffset: "1" }, "100%": { strokeDashoffset: "0" } },
        flow: { "0%": { strokeDashoffset: "24" }, "100%": { strokeDashoffset: "0" } },
        pop: {
          "0%": { opacity: "0", transform: "scale(.6)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        introOut: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-100%)" },
        },
        grow: { "0%": { width: "0%" }, "100%": { width: "100%" } },
        shimmer: { "0%": { backgroundPosition: "0% 50%" }, "100%": { backgroundPosition: "300% 50%" } },
      },
      animation: {
        "fade-up": "fadeUp .8s cubic-bezier(.16,1,.3,1) both",
        "fade-in": "fadeIn .8s ease both",
        blob: "blob 18s ease-in-out infinite",
        float: "float 5s ease-in-out infinite",
        draw: "draw 1.1s cubic-bezier(.65,0,.35,1) both",
        flow: "flow 1.2s linear infinite",
        pop: "pop .6s cubic-bezier(.34,1.56,.64,1) both",
        "intro-out": "introOut .8s cubic-bezier(.7,0,.3,1) both",
        grow: "grow 2.4s linear both",
        shimmer: "shimmer 8s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
