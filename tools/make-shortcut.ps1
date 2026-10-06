# Puts "Deine Roehre" (with the o-umlaut) on the desktop and in the Start menu: a double click starts the app
# without a PowerShell window (start.ps1, hidden). The icon is the Fraktur "DR" (app\icon.ico).
# Run once:  powershell -ExecutionPolicy Bypass -File .\tools\make-shortcut.ps1
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$name = "Deine R$([char]0x00F6)hre"   # written this way: Windows PowerShell reads scripts as ANSI, not UTF-8
$powershell = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shell = New-Object -ComObject WScript.Shell
$places = @(
    [Environment]::GetFolderPath('Desktop'),
    (Join-Path ([Environment]::GetFolderPath('StartMenu')) 'Programs')
)
foreach ($place in $places) {
    $path = Join-Path $place "$name.lnk"
    $link = $shell.CreateShortcut($path)
    $link.TargetPath = $powershell
    $link.Arguments = "-WindowStyle Hidden -ExecutionPolicy Bypass -File `"$(Join-Path $repo 'start.ps1')`""
    $link.WorkingDirectory = $repo
    $link.IconLocation = Join-Path $repo 'app\icon.ico'
    $link.Description = 'Your YouTube lists without recommendations'
    $link.WindowStyle = 7   # minimized: no window flashes up before the app
    $link.Save()
    Write-Host "Shortcut created: $path" -ForegroundColor Green
}
Write-Host 'Tip: right-click the desktop icon, "Show more options", "Pin to taskbar".' -ForegroundColor Cyan
