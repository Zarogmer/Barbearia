<#
.SYNOPSIS
  Importa docs/trello-import.json no board Trello indicado.

.DESCRIPTION
  - Lê docs/trello-import.json (15 cards + 4 listas conceituais + 9 labels).
  - No board destino:
      * Cria listas "Doing" e "Review" (se não existirem). Mapeia "Task" -> backlog
        e "Concluído" -> done conforme o board atual do usuário.
      * Cria as labels que faltarem (mantém as existentes).
      * Para cada card: POST /cards com nome+desc+labels, depois cria
        os 4 checklists nativos (🔧 Backend / 🎨 Frontend / 📜 Regra / 🧪 Testes)
        e os itens de cada um.
  - Idempotente em listas e labels (não duplica).
  - Cards NÃO são idempotentes — rodar 2x cria 30. Se errar, apague os cards
    de "Task" no Trello e rode de novo.

.PARAMETER ApiKey
  Trello API key (32 hex chars).

.PARAMETER Token
  Trello user token (64 hex chars). Gere em:
  https://trello.com/1/authorize?expiration=30days&scope=read,write&response_type=token&key=<APIKEY>&name=Barbearia%20Import

.PARAMETER BoardId
  ID curto do board (ex: AbCd1234) ou URL completa (ex: https://trello.com/b/AbCd1234/barbearia).

.PARAMETER JsonPath
  Caminho do trello-import.json. Default: ../docs/trello-import.json relativo ao script.

.EXAMPLE
  ./scripts/trello-import.ps1 -ApiKey ff69... -Token abc123... -BoardId https://trello.com/b/AbCd1234/barbearia
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $ApiKey,
    [Parameter(Mandatory = $true)] [string] $Token,
    [Parameter(Mandatory = $true)] [string] $BoardId,
    [string] $JsonPath = (Join-Path $PSScriptRoot '..\docs\trello-import.json')
)

$ErrorActionPreference = 'Stop'
$base = 'https://api.trello.com/1'
$auth = "key=$ApiKey&token=$Token"

# Extrai ID do board se vier URL
if ($BoardId -match '/b/([A-Za-z0-9]+)') {
    $BoardId = $Matches[1]
    Write-Host "→ ID do board extraído da URL: $BoardId"
}

# Mapeamento label name → cor Trello
$labelColors = @{
    'backend'   = 'blue'
    'frontend'  = 'purple'
    'infra'     = 'sky'
    'seguranca' = 'red'
    'testes'    = 'green'
    'docs'      = 'lime'
    'p0'        = 'pink'
    'p1'        = 'orange'
    'p2'        = 'yellow'
}

# Como mapear listas conceituais do JSON → listas reais do board.
# Usuário escolheu: manter "Task" (=Backlog) e "Concluído" (=Done),
# criar "Doing" e "Review", "Ideias" fica como parking lot.
# Strings são ASCII para evitar drama com encoding no Windows PowerShell 5.1.
# O matching no board é por SLUG normalizado, então "concluido" bate "Concluído".
$listMap = @{
    'backlog' = @{ trelloName = 'Task';       create = $false; matchSlug = 'task' }
    'doing'   = @{ trelloName = 'Doing';      create = $true;  matchSlug = 'doing' }
    'review'  = @{ trelloName = 'Review';     create = $true;  matchSlug = 'review' }
    'done'    = @{ trelloName = 'Concluido';  create = $false; matchSlug = 'concluido' }
}

function ConvertTo-Slug {
    param([string]$s)
    # Remove acentos via normalização Unicode (FormD remove diacríticos)
    $normalized = $s.Normalize([System.Text.NormalizationForm]::FormD)
    $sb = New-Object System.Text.StringBuilder
    foreach ($ch in $normalized.ToCharArray()) {
        if ([System.Globalization.CharUnicodeInfo]::GetUnicodeCategory($ch) -ne [System.Globalization.UnicodeCategory]::NonSpacingMark) {
            [void]$sb.Append($ch)
        }
    }
    return ($sb.ToString() -replace '[^a-zA-Z0-9]', '').ToLower()
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
Write-Host "=== Importando $JsonPath para board $BoardId ===" -ForegroundColor Cyan
Write-Host ""

# Carrega JSON (força UTF-8 — Get-Content em PS 5.1 default = ANSI)
if (-not (Test-Path $JsonPath)) { throw "Arquivo não encontrado: $JsonPath" }
$jsonText = [System.IO.File]::ReadAllText((Resolve-Path $JsonPath).Path, [System.Text.Encoding]::UTF8)
$data = $jsonText | ConvertFrom-Json
Write-Host "Cards no JSON: $($data.cards.Count)"

# 1) Verifica board, resolve ID completo (shortLink → 24-hex id)
Write-Host ""
Write-Host "[1/4] Resolvendo board e listando listas..." -ForegroundColor Yellow
$boardInfo = Invoke-Trello -Method 'GET' -Path "/boards/$BoardId"
if ($boardInfo.id -and $boardInfo.id -ne $BoardId) {
    Write-Host "      → shortLink '$BoardId' resolvido para id '$($boardInfo.id)'"
    $BoardId = $boardInfo.id
}
Write-Host "      board: $($boardInfo.name)"

$existingLists = Invoke-Trello -Method 'GET' -Path "/boards/$BoardId/lists"
foreach ($l in $existingLists) { Write-Host "      - $($l.name) ($($l.id))" }

# Indexa existentes por slug (sem acento, alfanumerico, lowercase)
$listIdBySlug = @{}
foreach ($l in $existingLists) {
    $slug = ConvertTo-Slug $l.name
    $listIdBySlug[$slug] = $l.id
}

# Resolve JSON list id → Trello list id; cria as listas marcadas com create=$true se faltarem
$jsonListToTrello = @{}
foreach ($k in $listMap.Keys) {
    $cfg = $listMap[$k]
    $existingId = $listIdBySlug[$cfg.matchSlug]

    if (-not $existingId) {
        if ($cfg.create) {
            Write-Host "      + criando lista '$($cfg.trelloName)'..." -ForegroundColor Green
            # idBoard como BODY param resolve alguns 400 do endpoint /lists
            $body = @{ name = $cfg.trelloName; idBoard = $BoardId; pos = 'bottom' }
            $newList = Invoke-Trello -Method 'POST' -Path "/lists" -Body $body
            $existingId = $newList.id
            $listIdBySlug[$cfg.matchSlug] = $existingId
        } else {
            throw "Lista '$($cfg.trelloName)' (slug=$($cfg.matchSlug)) não encontrada no board e marcada como create=false. Crie manualmente ou ajuste o `$listMap."
        }
    } else {
        Write-Host "      = lista '$($cfg.trelloName)' já existe ($existingId)"
    }
    $jsonListToTrello[$k] = $existingId
}

# 2) Labels — cria as que faltam
Write-Host ""
Write-Host "[2/4] Verificando labels..." -ForegroundColor Yellow
$existingLabels = Invoke-Trello -Method 'GET' -Path "/boards/$BoardId/labels"
$labelIdByName = @{}
foreach ($lbl in $existingLabels) {
    if ($lbl.name) { $labelIdByName[$lbl.name] = $lbl.id }
}

foreach ($jsonLabel in $data.labels) {
    if (-not $labelIdByName.ContainsKey($jsonLabel.name)) {
        $color = $labelColors[$jsonLabel.id]
        if (-not $color) { $color = 'null' }
        Write-Host "      + criando label '$($jsonLabel.name)' ($color)..." -ForegroundColor Green
        $newLabel = Invoke-Trello -Method 'POST' -Path "/labels?name=$([uri]::EscapeDataString($jsonLabel.name))&color=$color&idBoard=$BoardId"
        $labelIdByName[$jsonLabel.name] = $newLabel.id
    }
}

# Map JSON label id → Trello label id (via label.name no JSON)
$jsonLabelToTrello = @{}
foreach ($jsonLabel in $data.labels) {
    $jsonLabelToTrello[$jsonLabel.id] = $labelIdByName[$jsonLabel.name]
}

# 3) Criar cards
Write-Host ""
Write-Host "[3/4] Criando $($data.cards.Count) cards..." -ForegroundColor Yellow

$createdCards = @()
$cardNum = 0
foreach ($card in $data.cards) {
    $cardNum++
    $idList = $jsonListToTrello[$card.idList]
    $labelIds = @()
    foreach ($lblId in $card.idLabels) {
        if ($jsonLabelToTrello.ContainsKey($lblId)) { $labelIds += $jsonLabelToTrello[$lblId] }
    }

    $body = @{
        name       = $card.name
        desc       = $card.desc
        idList     = $idList
        pos        = $card.pos * 1000
        idLabels   = ($labelIds -join ',')
    }

    Write-Host "      [$cardNum/$($data.cards.Count)] $($card.name)" -ForegroundColor Cyan
    $created = Invoke-Trello -Method 'POST' -Path "/cards" -Body $body
    $createdCards += @{ jsonId = $card.id; trelloId = $created.id; checklists = $card.checklists }
}

# 4) Checklists em cada card
Write-Host ""
Write-Host "[4/4] Criando checklists ($(($data.cards | ForEach-Object { $_.checklists.Count } | Measure-Object -Sum).Sum) listas no total)..." -ForegroundColor Yellow

foreach ($entry in $createdCards) {
    Write-Host "      → $($entry.jsonId)" -ForegroundColor DarkCyan
    foreach ($cl in $entry.checklists) {
        $newCl = Invoke-Trello -Method 'POST' -Path "/checklists?idCard=$($entry.trelloId)&name=$([uri]::EscapeDataString($cl.name))"
        foreach ($item in $cl.items) {
            Invoke-Trello -Method 'POST' -Path "/checklists/$($newCl.id)/checkItems?name=$([uri]::EscapeDataString($item))&checked=false" | Out-Null
        }
    }
}

Write-Host ""
Write-Host "=== ✅ Pronto: $($createdCards.Count) cards criados em 'Task' do board Barbearia ===" -ForegroundColor Green
Write-Host "    Listas criadas/garantidas: Task, Doing, Review, Concluído"
Write-Host "    Labels criadas/garantidas: $($data.labels.Count)"
Write-Host ""
Write-Host "Abra o board: https://trello.com/b/$BoardId"
