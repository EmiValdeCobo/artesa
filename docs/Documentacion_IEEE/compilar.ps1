# Script de compilación automática para la Documentación IEEE de artesa
# Soporta Tectonic (motor autónomo sin dependencias), pdflatex y latexmk

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Compilador de Documentación IEEE — Proyecto artesa   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Sincronizar tabla de intervenciones de IA con docs/USO_IA.md
Write-Host "`n[1/3] Sincronizando registro de IA con docs/USO_IA.md..." -ForegroundColor Yellow
if (Get-Command node -ErrorAction SilentlyContinue) {
    try {
        node "$ScriptDir\actualizar_ia.js"
        Write-Host "   [OK] Tabla de IA sincronizada exitosamente." -ForegroundColor Green
    } catch {
        Write-Warning "   [!] No se pudo ejecutar actualizar_ia.js. Se utilizará la tabla existente."
    }
} else {
    Write-Host "   [-] Node.js no encontrado en PATH; omitiendo sincronización dinámica." -ForegroundColor Gray
}

# 2. Localizar o aprovisionar el motor de compilación LaTeX
Write-Host "`n[2/3] Verificando motor de compilación LaTeX..." -ForegroundColor Yellow
$LocalTectonic = "$ScriptDir\bin\tectonic.exe"
$TempTectonic = "$env:TEMP\tectonic\tectonic.exe"
$Compiler = ""

if (Test-Path $LocalTectonic) {
    $Compiler = $LocalTectonic
    Write-Host "   [OK] Usando Tectonic local ($Compiler)" -ForegroundColor Green
} elseif (Test-Path $TempTectonic) {
    $Compiler = $TempTectonic
    Write-Host "   [OK] Usando Tectonic temporal ($Compiler)" -ForegroundColor Green
} elseif (Get-Command tectonic -ErrorAction SilentlyContinue) {
    $Compiler = "tectonic"
    Write-Host "   [OK] Usando Tectonic instalado en el sistema." -ForegroundColor Green
} elseif (Get-Command pdflatex -ErrorAction SilentlyContinue) {
    $Compiler = "pdflatex"
    Write-Host "   [OK] Usando pdflatex del sistema." -ForegroundColor Green
} else {
    Write-Host "   [-] Descargando Tectonic portátil (motor liviano autónomo)..." -ForegroundColor Cyan
    $binDir = "$ScriptDir\bin"
    if (!(Test-Path $binDir)) { New-Item -ItemType Directory -Path $binDir | Out-Null }
    $zipPath = "$binDir\tectonic.zip"
    $downloadUrl = "https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.17.0/tectonic-0.17.0-x86_64-pc-windows-msvc.zip"
    Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath
    Expand-Archive -Path $zipPath -DestinationPath $binDir -Force
    Remove-Item $zipPath -Force
    $Compiler = $LocalTectonic
    Write-Host "   [OK] Tectonic descargado e instalado en: $Compiler" -ForegroundColor Green
}

# 3. Compilar el documento
Write-Host "`n[3/3] Compilando main.tex a PDF..." -ForegroundColor Yellow
$OutputFile = "$ScriptDir\artesa_documentacion_ieee.pdf"

if ($Compiler -match "tectonic") {
    & $Compiler "$ScriptDir\main.tex" -o "$ScriptDir"
    if (Test-Path "$ScriptDir\main.pdf") {
        Move-Item "$ScriptDir\main.pdf" $OutputFile -Force
    }
} elseif ($Compiler -eq "pdflatex") {
    & pdflatex -interaction=nonstopmode -output-directory="$ScriptDir" "$ScriptDir\main.tex"
    if (Get-Command bibtex -ErrorAction SilentlyContinue) {
        & bibtex "$ScriptDir\main"
        & pdflatex -interaction=nonstopmode -output-directory="$ScriptDir" "$ScriptDir\main.tex"
        & pdflatex -interaction=nonstopmode -output-directory="$ScriptDir" "$ScriptDir\main.tex"
    }
    if (Test-Path "$ScriptDir\main.pdf") {
        Move-Item "$ScriptDir\main.pdf" $OutputFile -Force
    }
}

if (Test-Path $OutputFile) {
    Write-Host "`n==========================================================" -ForegroundColor Green
    Write-Host " [EXITO] PDF compilado satisfactoriamente:" -ForegroundColor Green
    Write-Host "         $OutputFile" -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Green
} else {
    Write-Error "No se generó el archivo PDF. Revisa los mensajes de compilación anteriores."
}
