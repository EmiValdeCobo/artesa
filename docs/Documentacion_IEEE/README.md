# Documentación IEEE — Sistema artesa

Este directorio contiene la documentación formal en formato **IEEE** (conferencia / paper técnico) del proyecto **artesa**, elaborada conforme a los requerimientos de la cátedra de Programación Web (Ciclo 02-2026).

---

## Estructura de Archivos

```text
docs/Documentacion_IEEE/
├── main.tex                       # Archivo maestro LaTeX principal
├── referencias.bib                # Referencias bibliográficas en formato BibTeX
├── compilar.ps1                   # Script de compilación automática para Windows (PowerShell)
├── compilar.sh                    # Script de compilación para Linux / macOS / WSL (Bash)
├── actualizar_ia.js               # Sincronizador automático del registro de IA con docs/USO_IA.md
├── artesa_documentacion_ieee.pdf  # PDF compilado final
├── bin/                           # Binario autónomo del motor LaTeX Tectonic (local, sin dependencias)
├── secciones/                     # Capítulos modulares del documento
│   ├── 01_justificacion_nombre.tex
│   ├── 02_introduccion_objetivos.tex
│   ├── 03_requisitos.tex
│   ├── 04_arquitectura.tex
│   ├── 05_modelo_bd.tex
│   ├── 06_descripcion_modulos.tex
│   ├── 07_pruebas_resultados.tex
│   ├── 08_conclusiones_referencias.tex
│   ├── 09_legalidad_uso_ia.tex
│   └── ia_tabla_autogenerada.tex  # Tabla viva autogenerada desde docs/USO_IA.md
└── visualizador_html/             # Visualizador interactivo web en dos columnas estilo IEEE
    └── index.html                 # Abre directamente en cualquier navegador sin instalar nada
```

---

## Cómo Visualizar y Compilar

### Opción 1: Visualización Inmediata en Navegador Web (Recomendada)
No requiere instalar ningún programa ni compilador. Simplemente abre en tu navegador (doble clic):
```text
docs/Documentacion_IEEE/visualizador_html/index.html
```
- Maquetación en 2 columnas estilo IEEE.
- Botón para alternar a 1 columna o imprimir/guardar directamente como PDF.
- Enlace directo al PDF compilado.

---

### Opción 2: Compilación Automática a PDF (1 Clic con PowerShell o pnpm)

Desde la terminal en la raíz del proyecto:
```powershell
pnpm doc:ieee
```
o directamente con PowerShell:
```powershell
powershell -ExecutionPolicy Bypass -File docs/Documentacion_IEEE/compilar.ps1
```

Este script:
1. Sincroniza automáticamente la tabla de uso de IA con las últimas entradas de `docs/USO_IA.md`.
2. Utiliza el motor autónomo de compilación `tectonic` ubicado en `bin/` (o lo descarga si no existiese).
3. Resuelve citas BibTeX y paquetes en milisegundos.
4. Genera `docs/Documentacion_IEEE/artesa_documentacion_ieee.pdf`.

---

### Opción 3: Compilación en Linux / macOS / WSL
```bash
./docs/Documentacion_IEEE/compilar.sh
```

---

### Opción 4: Compilación en Overleaf o VS Code (LaTeX Workshop)
- **Overleaf:** Comprime la carpeta `docs/Documentacion_IEEE/` en un archivo `.zip` e impórtala como nuevo proyecto en [Overleaf](https://www.overleaf.com/). Selecciona `main.tex` como archivo principal y compila con el motor *XeLaTeX* o *pdfLaTeX*.
- **VS Code:** Instala la extensión `LaTeX Workshop`. Abre `main.tex` y presiona `Ctrl + Alt + B` (Build LaTeX project).

---

## Actualización del Registro de Inteligencia Artificial

Para mantener viva la sección de **Legalidad en el uso de la IA** conforme el equipo registre nuevas intervenciones en `docs/USO_IA.md`, solo debes ejecutar:

```powershell
pnpm doc:ia:sync
```
o bien:
```powershell
node docs/Documentacion_IEEE/actualizar_ia.js
```

Esto refrescará automáticamente la tabla en `secciones/ia_tabla_autogenerada.tex`, lista para la próxima compilación del PDF sin necesidad de editar código LaTeX manualmente.
