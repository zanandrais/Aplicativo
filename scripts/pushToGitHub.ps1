param(
  [Parameter(Mandatory = $true)]
  [string]$RemoteUrl,

  [string]$Branch = 'main',

  [string]$CommitMessage = 'Atualiza projeto Flex Counter'
)

function Invoke-GitCommand {
  param(
    [Parameter(Mandatory = $true, ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  $display = $Args -join ' '
  Write-Host "git $display" -ForegroundColor Cyan
  git @Args | Out-Null
  if ($LASTEXITCODE -ne 0) {
    throw "Falha ao executar git $display"
  }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw 'Git não está instalado ou não está no PATH.'
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

if (-not (Test-Path "$repoRoot/.git")) {
  Invoke-GitCommand init
}

Invoke-GitCommand add .

try {
  Invoke-GitCommand commit -m $CommitMessage
} catch {
  Write-Warning 'Nada para commitar (talvez nenhuma alteração nova).'
}

$remoteExists = git remote | Select-String -SimpleMatch 'origin'
if (-not $remoteExists) {
  Invoke-GitCommand remote add origin $RemoteUrl
} else {
  Invoke-GitCommand remote set-url origin $RemoteUrl
}

Invoke-GitCommand push -u origin $Branch
