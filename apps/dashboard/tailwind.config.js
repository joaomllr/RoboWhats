/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eefbf4",
          100: "#d6f5e3",
          200: "#b0ebca",
          300: "#7bdca8",
          400: "#42c381",
          500: "#1da863",
          600: "#12874e",
          700: "#106b40",
          800: "#115535",
          900: "#0f462c",
          950: "#062719",
        },
        whatsapp: {
          light: "#25D366",
          dark: "#075E54",
          teal: "#128C7E",
          chatBg: "#EFEAE2",
          chatBgDark: "#0B141A",
          bubbleOut: "#DCF8C6",
          bubbleOutDark: "#005C4B",
          bubbleIn: "#FFFFFF",
          bubbleInDark: "#202C33",
        },
      },
    },
  },
  plugins: [],
};
