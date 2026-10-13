param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('launch', 'build')]
    [string]$Action,
    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
$appDirectory = Split-Path -Parent $PSScriptRoot
$electronPath = Join-Path $appDirectory 'node_modules\electron\dist\electron.exe'
$builderPath = Join-Path $appDirectory 'node_modules\electron-builder\package.json'

function Find-Node {
    $nodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($nodeCommand) { return $nodeCommand.Source }
    # Also support this computer's bundled Codex runtime, without requiring npm.
    $bundledNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    if (Test-Path -LiteralPath $bundledNode) { return $bundledNode }
    throw 'Node.js was not found. Install the LTS version from https://nodejs.org/en/download, then try again.'
}

try {
    if (!(Test-Path -LiteralPath (Join-Path $appDirectory 'package.json'))) {
        throw 'Keep this script and the scripts folder inside the complete Pomodoro-work tracker folder.'
    }
    $needsSetup = !(Test-Path -LiteralPath $electronPath) -or ($Action -eq 'build' -and !(Test-Path -LiteralPath $builderPath))
    if ($needsSetup) {
        if ($CheckOnly) { throw 'Dependencies need installation before this action can run.' }
        $npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
        if (!$npmCommand) { throw 'First setup needs Node.js with npm. Install Node.js LTS from https://nodejs.org/en/download, then double-click this script again.' }
        Write-Host 'Setting up your little focus helper... (internet needed)' -ForegroundColor Yellow
        Push-Location -LiteralPath $appDirectory
        try {
            & $npmCommand.Source install
            if ($LASTEXITCODE -ne 0) { throw 'Setup failed. Check the message above and your internet connection, then retry.' }
        } finally { Pop-Location }
    }

    if ($Action -eq 'launch') {
        if (!(Test-Path -LiteralPath $electronPath)) { throw 'The Electron app runtime is missing. Run npm.cmd install in the app folder.' }
        if ($CheckOnly) { Write-Host "Launch ready: $electronPath"; exit 0 }
        Start-Process -FilePath $electronPath -ArgumentList '.' -WorkingDirectory $appDirectory -WindowStyle Hidden
    } else {
        $nodePath = Find-Node
        $buildScript = Join-Path $PSScriptRoot 'build-portable.cjs'
        if ($CheckOnly) { Write-Host "Build ready: $nodePath -> $buildScript"; exit 0 }
        Write-Host 'Packing a fresh Pomodoro Cute portable app...' -ForegroundColor Magenta
        Write-Host 'This includes your latest saved source changes. Your tasks and journal are not bundled.'
        Write-Host 'The previous portable copy is kept until the new build succeeds.'
        Push-Location -LiteralPath $appDirectory
        try {
            & $nodePath $buildScript
            if ($LASTEXITCODE -ne 0) { throw 'Build failed. Read the message above, fix the issue, and try again. Your previous portable app is still available.' }
        } finally { Pop-Location }
        Write-Host 'Your fresh portable app is ready!' -ForegroundColor Green
        Write-Host (Join-Path $appDirectory 'dist\portable\Pomodoro Cute.exe')
        Start-Process -FilePath explorer.exe -ArgumentList ('"' + (Join-Path $appDirectory 'dist\portable') + '"') -WindowStyle Hidden
    }
} catch {
    Write-Host ''
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
