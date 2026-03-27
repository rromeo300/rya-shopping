#!/bin/bash
# ============================================================
# Setup script para Mac mini - Asistente de Propiedades
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo ""
echo "=============================================="
echo "  Asistente de Propiedades - Setup Mac mini"
echo "=============================================="
echo ""

# 1. Verificar Homebrew
echo -e "${YELLOW}[1/6] Verificando Homebrew...${NC}"
if ! command -v brew &> /dev/null; then
  echo "Instalando Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  echo -e "${GREEN}✓ Homebrew ya está instalado${NC}"
fi

# 2. Verificar/Instalar Node.js
echo ""
echo -e "${YELLOW}[2/6] Verificando Node.js...${NC}"
if ! command -v node &> /dev/null; then
  echo "Instalando Node.js..."
  brew install node
else
  NODE_VERSION=$(node -v)
  echo -e "${GREEN}✓ Node.js $NODE_VERSION ya está instalado${NC}"
fi

# 3. Instalar PM2 (mantiene el bot activo)
echo ""
echo -e "${YELLOW}[3/6] Instalando PM2 (gestor de procesos)...${NC}"
if ! command -v pm2 &> /dev/null; then
  npm install -g pm2
  echo -e "${GREEN}✓ PM2 instalado${NC}"
else
  echo -e "${GREEN}✓ PM2 ya está instalado${NC}"
fi

# 4. Instalar Cloudflare Tunnel (URL pública gratis)
echo ""
echo -e "${YELLOW}[4/6] Instalando Cloudflare Tunnel...${NC}"
if ! command -v cloudflared &> /dev/null; then
  brew install cloudflared
  echo -e "${GREEN}✓ Cloudflare Tunnel instalado${NC}"
else
  echo -e "${GREEN}✓ Cloudflare Tunnel ya está instalado${NC}"
fi

# 5. Instalar dependencias del proyecto
echo ""
echo -e "${YELLOW}[5/6] Instalando dependencias del proyecto...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
npm install
echo -e "${GREEN}✓ Dependencias instaladas${NC}"

# 6. Verificar .env.local
echo ""
echo -e "${YELLOW}[6/6] Verificando configuración...${NC}"
if [ ! -f ".env.local" ]; then
  cp .env.example .env.local
  echo -e "${RED}⚠️  IMPORTANTE: Edita el archivo .env.local con tus claves API${NC}"
  echo ""
  echo "Abre el archivo con:"
  echo "  open -e .env.local"
  echo ""
  echo "Necesitas:"
  echo "  1. ANTHROPIC_API_KEY  → console.anthropic.com"
  echo "  2. TELEGRAM_BOT_TOKEN → ya lo tienes"
  echo ""
else
  echo -e "${GREEN}✓ .env.local encontrado${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}  ✓ Instalación completada${NC}"
echo "=============================================="
echo ""
echo "Próximos pasos:"
echo ""
echo "  1. Edita .env.local con tu ANTHROPIC_API_KEY"
echo "     → open -e .env.local"
echo ""
echo "  2. Inicia el bot:"
echo "     → npm run start:bot"
echo ""
echo "  3. En otra terminal, abre el túnel:"
echo "     → npm run tunnel"
echo ""
echo "  4. Copia la URL del túnel (algo como https://xxx.trycloudflare.com)"
echo "     y configura el webhook de Telegram:"
echo "     → npm run setup:telegram"
echo ""
