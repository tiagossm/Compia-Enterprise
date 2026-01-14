/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Mantemos suporte a dark mode
  theme: {
    extend: {
      fontFamily: {
        // Definindo Montserrat como a fonte principal do sistema
        sans: ['Montserrat', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
      colors: {
        // Paleta Profissional B2B (Alinhada com o Login)
        primary: {
          DEFAULT: "#1565C0", // Azul Material 800 - Ação principal
          hover: "#0D47A1",   // Azul Material 900
          focus: "#0B1829",   // Deep Blue
          light: "#E3F2FD",   // Azul Material 400 (Highlights)
        },
        // Sistema de Superfícies
        background: {
          light: "#FFFFFF",   // Clean White
          dark: "#0B1829",    // Fundo Dark Mode
        },
        surface: {
          light: "#FFFFFF",   // Clean White
          dark: "#15202B",    // Cartões dark
        },
        slate: {
          800: "#1E293B", // Texto Escuro
          500: "#64748B", // Texto Secundário
        },
        // Cores de Status (para Inspeções)
        status: {
          success: "#10B981", // Emerald 500
          warning: "#F59E0B", // Amber 500
          error: "#EF4444",   // Red 500
          info: "#3B82F6",    // Blue 500
        }
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(11, 24, 41, 0.05)', // Sombra muito suave para header
        'card': '0 2px 8px rgba(0,0,0,0.05)',             // Sombra padrão de cards
        'professional': '0 6px 16px rgba(0, 0, 0, 0.08)', // Sombra de destaque (usada no login)
        'hover': '0 14px 28px rgba(0,0,0,0.15), 0 10px 10px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}
