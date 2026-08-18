/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        health: {
          bg: "#f8fafc",
          surface: {
            DEFAULT: "#ffffff",
            muted: "#f8fafc",
          },
          primary: {
            DEFAULT: "#0284c7", // sky-600
            dark: "#0369a1",    // sky-700
            light: "#f0f9ff",   // sky-50
          },
          text: {
            DEFAULT: "#0f172a", // slate-900
            secondary: "#475569", // slate-600
            muted: "#94a3b8",     // slate-400
            primary: "#0369a1",   // sky-700
          },
          border: {
            DEFAULT: "#e2e8f0", // slate-200
            input: "#cbd5e1",   // slate-300
            primary: "#0284c7", // sky-600
          },
          success: {
            DEFAULT: "#16a34a", // green-600
            light: "#f0fdf4",   // green-50
            border: "#86efac",  // green-300
            text: "#15803d",    // green-700
          },
          error: {
            light: "#fef2f2",   // red-50
            border: "#fca5a5",  // red-300
            text: "#b91c1c",    // red-700
          },
        },
      },
    },
  },
  plugins: [],
};