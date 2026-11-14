#!/usr/bin/env bash
# Script de compilación para entornos Unix/Linux/macOS
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================================="
echo "   Compilador de Documentación IEEE — Proyecto artesa   "
echo "=========================================================="

echo -e "\n[1/3] Sincronizando registro de IA..."
if command -v node >/dev/null 2>&1; then
    node "$SCRIPT_DIR/actualizar_ia.js" || echo "Advertencia: No se pudo actualizar la tabla de IA."
fi

echo -e "\n[2/3] Verificando compilador LaTeX..."
if command -v tectonic >/dev/null 2>&1; then
    echo "Usando tectonic del sistema..."
    tectonic "$SCRIPT_DIR/main.tex" -o "$SCRIPT_DIR"
    if [ -f "$SCRIPT_DIR/main.pdf" ]; then
        mv "$SCRIPT_DIR/main.pdf" "$SCRIPT_DIR/artesa_documentacion_ieee.pdf"
    fi
elif command -v pdflatex >/dev/null 2>&1; then
    echo "Usando pdflatex del sistema..."
    pdflatex -interaction=nonstopmode -output-directory="$SCRIPT_DIR" "$SCRIPT_DIR/main.tex"
    if command -v bibtex >/dev/null 2>&1; then
        bibtex "$SCRIPT_DIR/main"
        pdflatex -interaction=nonstopmode -output-directory="$SCRIPT_DIR" "$SCRIPT_DIR/main.tex"
        pdflatex -interaction=nonstopmode -output-directory="$SCRIPT_DIR" "$SCRIPT_DIR/main.tex"
    fi
    if [ -f "$SCRIPT_DIR/main.pdf" ]; then
        mv "$SCRIPT_DIR/main.pdf" "$SCRIPT_DIR/artesa_documentacion_ieee.pdf"
    fi
else
    echo "Error: No se encontró tectonic ni pdflatex en el sistema."
    echo "Instala tectonic (ej. cargo install tectonic o brew install tectonic) o texlive."
    exit 1
fi

if [ -f "$SCRIPT_DIR/artesa_documentacion_ieee.pdf" ]; then
    echo -e "\n[EXITO] Documento compilado en: $SCRIPT_DIR/artesa_documentacion_ieee.pdf"
fi
