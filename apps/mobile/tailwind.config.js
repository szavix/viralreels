/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0a",
        foreground: "#fafafa",
        card: "#0f0f0f",
        border: "#262626",
        primary: "#8b5cf6",
        muted: "#262626",
        "muted-foreground": "#a1a1a1",
        destructive: "#7f1d1d",
      },
    },
  },
  plugins: [],
};
