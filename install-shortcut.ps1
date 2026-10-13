$appDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktop = [Environment]::GetFolderPath('Desktop')
$vbs = Join-Path $appDir 'start_app.vbs'
$ico = Join-Path $appDir 'src/assets/pomodoro.ico'
$lnk = Join-Path $desktop 'Pomodoro Cute.lnk'

$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($lnk)
$sc.TargetPath = "$env:WINDIR\System32\wscript.exe"
$sc.Arguments = '"' + $vbs + '"'
$sc.IconLocation = "$ico,0"
$sc.WorkingDirectory = $appDir
$sc.Description = 'Pomodoro Cute - a simple, cute focus timer'
$sc.Save()

Write-Host "Shortcut created at: $lnk"