import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Tailwind tree-shake elimina clases construidas dinámicamente
  // (ej. STATUS_COLORS[status] en lib/utils/format.ts).
  // Safelist preserva los colores de status badges en el bundle.
  safelist: [
    {
      pattern:
        /(bg|text|border)-(yellow|blue|purple|green|red|gray)-(50|100|200|800|900)/,
    },
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
export default config;
