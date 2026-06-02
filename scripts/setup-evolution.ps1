# Setup Evolution API: cria instancia "barbearia", mostra QR code,
# atualiza .env local. Roda 1 vez apos deploy da Evolution no Railway.
#
# Uso:
#   .\scripts\setup-evolution.ps1 -Url "https://evolution-xxx.up.railway.app" -ApiKey "SUA-KEY"

param(
  [Parameter(Mandatory = $true)]
  [string]$Url,

  [Parameter(Mandatory = $true)]
  [string]$ApiKey,

  [string]$Instance = "barbearia"
)

$ErrorActionPreference = "Stop"

# Normaliza URL (remove trailing slash + garante https)
$Url = $Url.TrimEnd("/")
if ($Url -notmatch "^https?://") { $Url = "https://$Url" }

Write-Host ""
Write-Host "==== Setup Evolution API ====" -ForegroundColor Cyan
Write-Host "URL:      $Url"
Write-Host "Instance: $Instance"
Write-Host ""

# Passo 1: cria instancia (idempotente — se ja existe, ignora 4xx)
Write-Host "[1/3] Criando instancia '$Instance'..." -ForegroundColor Yellow
$body = @{
  instanceName = $Instance
  qrcode = $true
  integration = "WHATSAPP-BAILEYS"
} | ConvertTo-Json

try {
  $createResp = Invoke-RestMethod -Method Post `
    -Uri "$Url/instance/create" `
    -Headers @{ apikey = $ApiKey; "Content-Type" = "application/json" } `
    -Body $body
  Write-Host "      Criada." -ForegroundColor Green
}
catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -eq 403 -or $code -eq 409) {
    Write-Host "      Ja existia. Continuando." -ForegroundColor Yellow
  }
  else {
    throw
  }
}

# Passo 2: busca QR code
Write-Host ""
Write-Host "[2/3] Buscando QR code..." -ForegroundColor Yellow
$qrResp = Invoke-RestMethod -Method Get `
  -Uri "$Url/instance/connect/$Instance" `
  -Headers @{ apikey = $ApiKey }

$qrBase64 = $null
if ($qrResp.base64) { $qrBase64 = $qrResp.base64 }
elseif ($qrResp.qrcode -and $qrResp.qrcode.base64) { $qrBase64 = $qrResp.qrcode.base64 }

if ($qrBase64) {
  # Salva o QR como PNG e abre no Windows
  $qrPath = Join-Path $PSScriptRoot "..\.evolution-qr.png"
  $b64 = $qrBase64 -replace "^data:image/[^;]+;base64,", ""
  $resolved = Resolve-Path $qrPath -ErrorAction SilentlyContinue
  $absPath = if ($resolved) { $resolved.Path } else { $qrPath }
  [System.IO.File]::WriteAllBytes($absPath, [Convert]::FromBase64String($b64))
  Write-Host "      QR salvo em: .evolution-qr.png"
  Write-Host "      Abrindo no visualizador..."
  Start-Process $absPath

  Write-Host ""
  Write-Host "      No celular: WhatsApp -> Config -> Aparelhos conectados" -ForegroundColor Cyan
  Write-Host "      -> Conectar aparelho -> escaneia o QR" -ForegroundColor Cyan
}
else {
  Write-Host "      Sem QR no response. Abre manualmente:" -ForegroundColor Yellow
  Write-Host "      $Url/manager (login com a API key)" -ForegroundColor Cyan
}

# Passo 3: atualiza .env
Write-Host ""
Write-Host "[3/3] Atualizando .env..." -ForegroundColor Yellow
$envPath = Join-Path $PSScriptRoot "..\.env"
$envContent = Get-Content $envPath -Raw

# Substitui ou anexa cada var
function Set-EnvVar([string]$content, [string]$name, [string]$value) {
  $pattern = "^$name=.*$"
  $replacement = "$name=`"$value`""
  if ($content -match $pattern -or $content -match "(?m)^$name=") {
    return [regex]::Replace($content, "(?m)^$name=.*$", $replacement)
  }
  else {
    return $content.TrimEnd() + "`n$replacement`n"
  }
}

$envContent = Set-EnvVar $envContent "EVOLUTION_API_URL" $Url
$envContent = Set-EnvVar $envContent "EVOLUTION_API_KEY" $ApiKey
$envContent = Set-EnvVar $envContent "EVOLUTION_INSTANCE" $Instance

Set-Content -Path $envPath -Value $envContent -Encoding UTF8 -NoNewline
Write-Host "      .env atualizado." -ForegroundColor Green

Write-Host ""
Write-Host "==== Proximo passo ====" -ForegroundColor Cyan
Write-Host "1. Escaneia o QR (janela que abriu)"
Write-Host "2. Aguarda confirmar conexao (~5s)"
Write-Host "3. Reinicia o dev (Ctrl+C no terminal do pnpm dev, depois pnpm dev)"
Write-Host "4. Testa: localhost:3000/viking/agendar"
Write-Host ""
Write-Host "Verificar status da conexao a qualquer momento:" -ForegroundColor Gray
Write-Host "  Invoke-RestMethod -Uri `"$Url/instance/connectionState/$Instance`" -Headers @{ apikey = `"$ApiKey`" }" -ForegroundColor Gray
Write-Host ""
