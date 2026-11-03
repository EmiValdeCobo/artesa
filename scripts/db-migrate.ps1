$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

docker compose up -d db
if ($LASTEXITCODE -ne 0) { throw 'No se pudo iniciar el servicio db.' }

$files = Get-ChildItem -LiteralPath (Join-Path $repoRoot 'database/migrations') -Filter '*.sql' |
  Sort-Object Name

foreach ($file in $files) {
  Write-Host "Aplicando migración $($file.Name)..."
  Get-Content -LiteralPath $file.FullName -Raw |
    docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
  if ($LASTEXITCODE -ne 0) { throw "Falló la migración $($file.Name)." }
}

Write-Host 'Migraciones aplicadas correctamente.'
