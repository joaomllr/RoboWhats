/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        fluxi: {
          blue: "#2D5BFF",         /* primary brand color - header, links, highlights */
          blueHover: "#2048E0",
          blueLight: "#EBF0FF",
          blueDark: "#1A3EC7",
          green: "#00C48C",        /* action/success - primary buttons, CTA, active/completed status */
          greenHover: "#00AD7B",
          greenLight: "#E6F9F3",
          greenDark: "#009167",
          graphite: "#1A1D29",     /* primary text / dark mode background */
          graphiteLight: "#25293A",
          graphiteCard: "#1F2332",
          graphiteBorder: "#2E3347",
          cloud: "#F4F6FB",        /* light mode background */
          cloudCard: "#FFFFFF",
          cloudBorder: "#E2E8F0",
          coral: "#FF6B5B",        /* ONLY alerts, errors, urgency - never decorative */
          coralLight: "#FFF0EE",
        },
        brand: {
          50: "#EBF0FF",
          100: "#D6E2FF",
          200: "#B3C7FF",
          300: "#8FAEFF",
          400: "#5C85FF",
          500: "#2D5BFF",
          600: "#2048E0",
          700: "#1A3EC7",
          800: "#1430A3",
          900: "#0F247D",
          950: "#091652",
        },
        whatsapp: {
          accent: "#00D26A",
          light: "#00D26A",
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
