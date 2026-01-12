#!/bin/bash

# Colores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Iniciando proceso de despliegue automatizado ===${NC}"

# 1. Verificar estado de Git
echo -e "\n${BLUE}1. Verificando estado del repositorio...${NC}"
if [ -z "$(git status --porcelain)" ]; then 
  echo -e "${GREEN}Nada que commitear, el directorio de trabajo está limpio.${NC}"
else
  git status
  echo -e "\n${BLUE}¿Deseas continuar con el commit de estos cambios? (s/n)${NC}"
  read -r response
  if [[ "$response" =~ ^([sS][iI]|[sS])$ ]]; then
    
    # 2. Pedir mensaje de commit
    echo -e "\n${BLUE}Introduce el mensaje del commit:${NC}"
  read -r commit_message
    
  if [ -z "$commit_message" ]; then
    commit_message="update: cambios generales y mejoras"
    echo -e "${BLUE}Usando mensaje por defecto: '${commit_message}'${NC}"
  fi

    # 3. Git Add, Commit, Push
  echo -e "\n${BLUE}2. Subiendo a GitHub...${NC}"
  git add .
  git commit -m "$commit_message"
    
  if git push origin main; then
    echo -e "${GREEN}✅ Cambios subidos a GitHub correctamente.${NC}"
  else
    echo -e "${RED}❌ Error al subir a GitHub. Verifica tu conexión o conflictos.${NC}"
    exit 1
  fi

  else
    echo -e "${BLUE}Saltando commit de Git...${NC}"
  fi
fi

# 4. Despliegue a Cloudflare
echo -e "\n${BLUE}3. Desplegando a Cloudflare Pages...${NC}"
# Asumimos que el proyecto se llama 'pod-cast' basado en la carpeta actual
PROJECT_NAME="pod-cast"

if npx wrangler pages deploy . --project-name "$PROJECT_NAME"; then
  echo -e "\n${GREEN}✨ ¡Despliegue completado con éxito!${NC}"
  echo -e "${GREEN}Tu aplicación debería estar disponible en breve.${NC}"
else
  echo -e "\n${RED}❌ Error en el despliegue a Cloudflare.${NC}"
  exit 1
fi

echo -e "\n${BLUE}=== Proceso finalizado ===${NC}"
