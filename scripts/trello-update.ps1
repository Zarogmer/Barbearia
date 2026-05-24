<#
.SYNOPSIS
  Atualiza cards existentes no board Trello — adiciona checklist 🚀 Deploy
  e bloco "📚 Recursos" no desc. Idempotente.

.DESCRIPTION
  Para cada card cujo nome começa com "PBI-":
    1. Verifica se já existe checklist "🚀 Deploy" — se sim, pula.
       Se não, cria com os items de defaultChecklists.deploy do JSON.
    2. Verifica se o desc já contém "## 📚 Recursos" — se sim, pula.
       Se não, anexa defaultDescriptionFooter ao desc.

  Pode ser rodado N vezes sem efeitos colaterais. Útil quando o JSON
  ganha novos checklists default e queremos propagar pros cards existentes.

.PARAMETER ApiKey
  Trello API key (32 hex chars).

.PARAMETER Token
  Trello user token (64 hex chars).

.PARAMETER BoardId
  ID curto do board (8 chars, ex: hYZHvqGV) ou URL completa.

.PARAMETER JsonPath
  Caminho do trello-import.json. Default: ../docs/trello-import.json.

.PARAMETER RepoUrl
  URL base do repositório (substitui <repo> no defaultDescriptionFooter).
  Ex: https://github.com/sevenreders/barbearia
  Se omitido, mantém placeholder <repo>.

.EXAMPLE
  ./scripts/trello-update.ps1 -ApiKey ff69... -Token ATTA... -BoardId hYZHvqGV
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $ApiKey,
    [Parameter(Mandatory = $true)] [string] $Token,
    [Parameter(Mandatory = $true)] [string] $BoardId,
    [string] $JsonPath = (Join-Path $PSScriptRoot '..\docs\trello-import.json'),
    [string] $RepoUrl = ''
)

$ErrorActionPreference = 'Stop'
$base = 'https://api.trello.com/1'
$auth = "key=$ApiKey&token=$Token"

if ($BoardId -match '/b/([A-Za-z0-9]+)') {
    $BoardId = $Matches[1]
    Write-Host "→ ID extraído da URL: $BoardId"
}

function Invoke-Trello {
    param([string]$Method, [string]$Path, [hashtable]$Body)
    $uri = "$base$Path"
    if ($uri.Contains('?')) { $uri += "&$auth" } else { $uri += "?$auth" }
    try {
        if ($Body) {
            Invoke-RestMethod -Method $Method -Uri $uri -Body $Body -ContentType 'application/x-www-form-urlencoded'
        } else {
            Invoke-RestMethod -Method $Method -Uri $uri
        }
    } catch {
        $msg = $_.Exception.Message
        if ($_.ErrorDetails -and $_.ErrorDetails.Message) { $msg += " | $($_.ErrorDetails.Message)" }
        throw "Trello $Method $Path falhou: $msg"
    }
}

Write-Host ""
Write-Host "=== Update de cards (board $BoardId) ===" -ForegroundColor Cyan

# Carrega JSON (UTF-8)
if (-not (Test-Path $JsonPath)) { throw "Arquivo não encontrado: $JsonPath" }
$jsonText = [System.IO.File]::ReadAllText((Resolve-Path $JsonPath).Path, [System.Text.Encoding]::UTF8)
$data = $jsonText | ConvertFrom-Json

$deployChecklist = $data.defaultChecklists.deploy
if (-not $deployChecklist) { throw "JSON não tem defaultChecklists.deploy" }
Write-Host "Deploy checklist com $($deployChecklist.items.Count) itens"

$footer = $data.defaultDescriptionFooter
if ($RepoUrl) {
    # Normaliza: aceita URL completa OU só "owner/repo".
    # Placeholder <repo> sempre representa "owner/repo" (sem domínio).
    $RepoUrl = $RepoUrl.TrimEnd('/')
    if ($RepoUrl -match 'github\.com/([^/]+/[^/]+)') {
        $RepoSlug = $Matches[1]
    } else {
        $RepoSlug = $RepoUrl
    }
    Write-Host "RepoSlug normalizado: $RepoSlug"
    $footer = $footer.Replace('<repo>', $RepoSlug)
    # guarda pra usar no Replace dos cards existentes também
    $RepoUrl = $RepoSlug
}

# Resolve board ID completo (shortLink → 24-hex)
$boardInfo = Invoke-Trello -Method 'GET' -Path "/boards/$BoardId"
if ($boardInfo.id -and $boardInfo.id -ne $BoardId) {
    Write-Host "→ shortLink resolvido para id $($boardInfo.id)"
    $BoardId = $boardInfo.id
}

# Lista todos cards do board (com checklists embutidos)
Write-Host ""
Write-Host "[1/2] Listando cards do board..." -ForegroundColor Yellow
$cards = Invoke-Trello -Method 'GET' -Path "/boards/$BoardId/cards?checklists=all&fields=name,desc"
$pbiCards = @($cards | Where-Object { $_.name -match '^PBI-\d' })
Write-Host "      → $($pbiCards.Count) cards PBI encontrados"

# Stats
$addedChecklist = 0
$skippedChecklist = 0
$updatedDesc = 0
$skippedDesc = 0

# Processa cada card
Write-Host ""
Write-Host "[2/2] Atualizando cards..." -ForegroundColor Yellow
foreach ($card in $pbiCards) {
    Write-Host ""
    Write-Host "  $($card.name)" -ForegroundColor Cyan

    # === 1. Checklist 🚀 Deploy ===
    $hasDeploy = $false
    foreach ($cl in $card.checklists) {
        if ($cl.name -eq $deployChecklist.name) { $hasDeploy = $true; break }
    }

    if ($hasDeploy) {
        Write-Host "      = checklist '$($deployChecklist.name)' já existe"
        $skippedChecklist++
    } else {
        Write-Host "      + adicionando checklist '$($deployChecklist.name)'..."
        $newCl = Invoke-Trello -Method 'POST' -Path "/checklists?idCard=$($card.id)&name=$([uri]::EscapeDataString($deployChecklist.name))"
        foreach ($item in $deployChecklist.items) {
            Invoke-Trello -Method 'POST' -Path "/checklists/$($newCl.id)/checkItems?name=$([uri]::EscapeDataString($item))&checked=false" | Out-Null
        }
        $addedChecklist++
    }

    # === 2. Bloco "Recursos" no desc ===
    # 3 cenários:
    #   (a) desc não tem "Recursos" → append footer
    #   (b) desc tem "Recursos" mas com placeholder "<repo>" e RepoUrl foi passado → substitui
    #   (c) desc tem "Recursos" sem placeholder ou sem RepoUrl → skip
    $hasResources = $card.desc -and ($card.desc.IndexOf("Recursos") -ge 0) -and ($card.desc.IndexOf("##") -ge 0)
    $hasPlaceholder = $card.desc -and ($card.desc.IndexOf("<repo>") -ge 0)

    if (-not $hasResources) {
        Write-Host "      + anexando bloco 'Recursos' no desc..."
        $newDesc = $card.desc + $footer
        $body = @{ desc = $newDesc }
        Invoke-Trello -Method 'PUT' -Path "/cards/$($card.id)" -Body $body | Out-Null
        $updatedDesc++
    } elseif ($hasPlaceholder -and $RepoUrl) {
        Write-Host "      ~ substituindo '<repo>' por '$RepoUrl' no desc..."
        $newDesc = $card.desc.Replace('<repo>', $RepoUrl)
        $body = @{ desc = $newDesc }
        Invoke-Trello -Method 'PUT' -Path "/cards/$($card.id)" -Body $body | Out-Null
        $updatedDesc++
    } else {
        Write-Host "      = bloco 'Recursos' ja presente sem placeholders a resolver"
        $skippedDesc++
    }
}

Write-Host ""
Write-Host "=== ✅ Update concluído ===" -ForegroundColor Green
Write-Host "    Checklists Deploy: +$addedChecklist novos · $skippedChecklist já existiam"
Write-Host "    Desc Recursos:     +$updatedDesc atualizados · $skippedDesc já tinham"
Write-Host ""
Write-Host "Veja: https://trello.com/b/$BoardId"
