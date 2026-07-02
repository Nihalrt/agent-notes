/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F3",
        ink: "#1C1B1F",
        inkfaint: "#8A8790",
        line: "#E7E2D8",
        lilac: "#DAD3F2",
        lilacDeep: "#5A4FA6",
        sage: "#CFE8C9",
        sageDeep: "#3F7A4A",
        peach: "#F6D6A8",
        peachDeep: "#9A6A1E",
        sky: "#C4E1F0",
        skyDeep: "#2C6C8C",
      },
      fontFamily: {
        display: ["SpaceGrotesk_700Bold"],
        displayMed: ["SpaceGrotesk_500Medium"],
        body: ["Inter_400Regular"],
        bodyMed: ["Inter_500Medium"],
        mono: ["JetBrainsMono_500Medium"],
      },
    },
  },
  plugins: [],
};