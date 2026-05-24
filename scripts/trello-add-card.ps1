<#
.SYNOPSIS
  Cria (ou atualiza, idempotente) um card específico do trello-import.json no board Trello.

.DESCRIPTION
  Diferente do trello-update.ps1 (que itera TODOS os cards existentes), este script
  pega UM card do JSON pelo -CardId e:
    1. Se NÃO existe no board: cria com labels + descrição + 5 checklists (Backend/Frontend/Regra/Testes/Deploy).
    2. Se já existe: atualiza descrição se mudou + adiciona checklists que estão faltando.

  Idempotente: rodar N vezes resulta no mesmo estado.

.PARAMETER ApiKey
  Trello API key (32 hex). Gerar em https://trello.com/app-key.

.PARAMETER Token
  Trello user token (64 hex). Gerar em https://trello.com/1/authorize?expiration=30days&scope=read,write&response_type=token&key=<KEY>&name=Barbearia.

.PARAMETER BoardId
  ID curto (8 chars, ex: hYZHvqGV) ou URL completa.

.PARAMETER CardId
  ID do card no JSON (ex: "PBI-16"). Deve existir em cards[].id.

.PARAMETER JsonPath
  Caminho do trello-import.json. Default: ../docs/trello-import.json.

.EXAMPLE
  ./scripts/trello-add-card.ps1 -ApiKey ff69... -Token ATTA... -BoardId hYZHvqGV -CardId PBI-16
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $ApiKey,
    [Parameter(Mandatory = $true)] [string] $Token,
    [Parameter(Mandatory = $true)] [string] $BoardId,
    [Parameter(Mandatory = $true)] [string] $CardId,
    [string] $JsonPath = (Join-Path $PSScriptRoot '..\docs\trello-import.json'),
    [string] $TargetListName = ''
)

$ErrorActionPreference = 'Stop'
$base = 'https://api.trello.com/1'
$auth = "key=$ApiKey&token=$Token"

if ($BoardId -match '/b/([A-Za-z0-9]+)') {
    $BoardId = $Matches[1]
    Write-Host "-> ID extraido da URL: $BoardId"
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
Write-Host "=== Sync card '$CardId' (board $BoardId) ===" -ForegroundColor Cyan

# Carrega JSON (UTF-8)
if (-not (Test-Path $JsonPath)) { throw "Arquivo nao encontrado: $JsonPath" }
$jsonText = [System.IO.File]::ReadAllText((Resolve-Path $JsonPath).Path, [System.Text.Encoding]::UTF8)
$data = $jsonText | ConvertFrom-Json

$cardSpec = $data.cards | Where-Object { $_.id -eq $CardId } | Select-Object -First 1
if (-not $cardSpec) { throw "Card '$CardId' nao encontrado em cards[] do JSON" }
Write-Host "JSON spec: $($cardSpec.name) (estimativa $($cardSpec.estimateHours)h, $($cardSpec.checklists.Count) checklists)"

# Resolve board ID completo
$boardInfo = Invoke-Trello -Method 'GET' -Path "/boards/$BoardId"
if ($boardInfo.id -and $boardInfo.id -ne $BoardId) {
    Write-Host "-> shortLink resolvido para id $($boardInfo.id)"
    $BoardId = $boardInfo.id
}

# Mapeia labels do board: nome -> id
$boardLabels = Invoke-Trello -Method 'GET' -Path "/boards/$BoardId/labels?fields=name"
$labelByName = @{}
foreach ($l in $boardLabels) {
    if ($l.name) { $labelByName[$l.name] = $l.id }
}

# Mapeia listas: id JSON -> id Trello
$jsonLists = $data.lists
$boardLists = Invoke-Trello -Method 'GET' -Path "/boards/$BoardId/lists?fields=name"

if ($TargetListName) {
    # Override por parametro (quando o board foi renomeado vs JSON)
    $targetList = $boardLists | Where-Object { $_.name -eq $TargetListName } | Select-Object -First 1
    if (-not $targetList) { throw "Lista override '$TargetListName' nao encontrada no board. Listas disponiveis: $($boardLists.name -join ', ')" }
} else {
    $targetListName = ($jsonLists | Where-Object { $_.id -eq $cardSpec.idList } | Select-Object -First 1).name
    if (-not $targetListName) { throw "List '$($cardSpec.idList)' nao encontrada em lists[] do JSON" }

    $targetList = $boardLists | Where-Object { $_.name -eq $targetListName } | Select-Object -First 1
    if (-not $targetList -and $targetListName.Length -gt 2) {
        # Fallback: tenta match parcial (emoji-aware)
        $needle = $targetListName.Substring(2)
        $targetList = $boardLists | Where-Object { $_.name.Contains($needle) -or $needle.Contains($_.name) } | Select-Object -First 1
    }
    if (-not $targetList) { throw "Lista '$targetListName' nao encontrada no board. Use -TargetListName <nome>. Listas disponiveis: $($boardLists.name -join ', ')" }
}
Write-Host "Lista alvo: $($targetList.name) ($($targetList.id))"

# Resolve labelIds
$labelIds = @()
foreach ($lid in $cardSpec.idLabels) {
    $jsonLabel = $data.labels | Where-Object { $_.id -eq $lid } | Select-Object -First 1
    if (-not $jsonLabel) { Write-Warning "Label '$lid' nao em labels[] do JSON"; continue }
    $resolvedId = $labelByName[$jsonLabel.name]
    if (-not $resolvedId) { Write-Warning "Label '$($jsonLabel.name)' nao existe no board (rode trello-import.ps1 primeiro?)"; continue }
    $labelIds += $resolvedId
}
Write-Host "Labels resolvidos: $($labelIds.Count) de $($cardSpec.idLabels.Count)"

# Monta desc final (spec + footer Recursos se houver)
$finalDesc = $cardSpec.desc
if ($data.defaultDescriptionFooter -and ($finalDesc.IndexOf("Recursos") -lt 0)) {
    $finalDesc += $data.defaultDescriptionFooter
}

# Procura card existente
$existingCards = Invoke-Trello -Method 'GET' -Path "/boards/$BoardId/cards?checklists=all&fields=name,desc,idList"
$idPrefix = $cardSpec.id
$existing = $existingCards | Where-Object { $_.name -eq $idPrefix -or $_.name.StartsWith("$idPrefix ") -or $_.name.StartsWith("$idPrefix-") } | Select-Object -First 1

if ($existing) {
    Write-Host ""
    Write-Host "Card ja existe: $($existing.id)" -ForegroundColor Yellow
    $needsUpdate = $false
    if ($existing.desc -ne $finalDesc) {
        Write-Host "  ~ desc divergente -> atualizando"
        Invoke-Trello -Method 'PUT' -Path "/cards/$($existing.id)" -Body @{ desc = $finalDesc } | Out-Null
        $needsUpdate = $true
    } else {
        Write-Host "  = desc igual"
    }

    # Sincroniza checklists que faltam
    $existingClNames = @{}
    foreach ($cl in $existing.checklists) { $existingClNames[$cl.name] = $true }

    # Inclui deploy se nao estiver
    $allChecklists = @($cardSpec.checklists)
    if ($data.defaultChecklists.deploy) {
        $hasDeploySpec = $false
        foreach ($cl in $allChecklists) { if ($cl.name -eq $data.defaultChecklists.deploy.name) { $hasDeploySpec = $true; break } }
        if (-not $hasDeploySpec) { $allChecklists += $data.defaultChecklists.deploy }
    }

    foreach ($cl in $allChecklists) {
        if ($existingClNames.ContainsKey($cl.name)) {
            Write-Host "  = checklist '$($cl.name)' ja existe"
            continue
        }
        Write-Host "  + checklist '$($cl.name)' ($($cl.items.Count) itens)"
        $newCl = Invoke-Trello -Method 'POST' -Path "/checklists?idCard=$($existing.id)&name=$([uri]::EscapeDataString($cl.name))"
        foreach ($item in $cl.items) {
            Invoke-Trello -Method 'POST' -Path "/checklists/$($newCl.id)/checkItems?name=$([uri]::EscapeDataString($item))&checked=false" | Out-Null
        }
        $needsUpdate = $true
    }

    if (-not $needsUpdate) { Write-Host "  (nada a mudar)" -ForegroundColor Gray }
    Write-Host ""
    Write-Host "Card atualizado: https://trello.com/c/$($existing.id)" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Criando card novo..." -ForegroundColor Green

    $body = @{
        idList = $targetList.id
        name = $cardSpec.name
        desc = $finalDesc
        pos = if ($cardSpec.pos) { $cardSpec.pos * 1024 } else { 'bottom' }
    }
    if ($labelIds.Count -gt 0) {
        $body.idLabels = ($labelIds -join ',')
    }
    $newCard = Invoke-Trello -Method 'POST' -Path "/cards" -Body $body
    Write-Host "  Card criado: $($newCard.id)"

    # Adiciona checklists
    $allChecklists = @($cardSpec.checklists)
    if ($data.defaultChecklists.deploy) {
        $hasDeploySpec = $false
        foreach ($cl in $allChecklists) { if ($cl.name -eq $data.defaultChecklists.deploy.name) { $hasDeploySpec = $true; break } }
        if (-not $hasDeploySpec) { $allChecklists += $data.defaultChecklists.deploy }
    }

    foreach ($cl in $allChecklists) {
        Write-Host "  + checklist '$($cl.name)' ($($cl.items.Count) itens)"
        $newCl = Invoke-Trello -Method 'POST' -Path "/checklists?idCard=$($newCard.id)&name=$([uri]::EscapeDataString($cl.name))"
        foreach ($item in $cl.items) {
            Invoke-Trello -Method 'POST' -Path "/checklists/$($newCl.id)/checkItems?name=$([uri]::EscapeDataString($item))&checked=false" | Out-Null
        }
    }
    Write-Host ""
    Write-Host "Card criado: https://trello.com/c/$($newCard.id)" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Done ===" -ForegroundColor Cyan
Write-Host "Board: https://trello.com/b/$BoardId"
