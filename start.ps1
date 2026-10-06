# Deine Roehre (README.md): your own YouTube lists in one window you can resize, no recommendations.
# Inbox (paste links), day lists that unlock at a set time (at most 3 videos a day), music in a loop, a mini player.
# The first start installs Node.js (if needed) and Electron into this folder (about 100 MB, once).
# Usage:  powershell -ExecutionPolicy Bypass -File .\start.ps1
$ErrorActionPreference = 'Stop'
$app = $PSScriptRoot
$host.UI.RawUI.WindowTitle = 'Deine Roehre'

# Node.js: the PC's own if it is new enough, else a private copy in %LOCALAPPDATA%\DeineRoehre\node (downloaded once
# from nodejs.org, checked against its SHA-256 list; no installer, no admin, no winget, no new window needed).
function Get-NodeVersion($exe) { try { [version]((& $exe --version).Trim().TrimStart('v')) } catch { $null } }
$need = [version]'22.12.0'
$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodeExe -or (Get-NodeVersion $nodeExe) -lt $need -or -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    $private = Join-Path $env:LOCALAPPDATA 'DeineRoehre\node'
    $nodeExe = Get-ChildItem $private -Filter node.exe -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if (-not $nodeExe -or (Get-NodeVersion $nodeExe) -lt $need) {
        Write-Host 'First start: downloading Node.js (about 30 MB, once)...' -ForegroundColor Cyan
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        $lts = (Invoke-RestMethod 'https://nodejs.org/dist/index.json') | Where-Object { $_.lts } | Select-Object -First 1
        $name = "node-$($lts.version)-win-x64.zip"
        $zip = Join-Path $env:TEMP $name
        Invoke-WebRequest "https://nodejs.org/dist/$($lts.version)/$name" -OutFile $zip -UseBasicParsing
        $sums = (Invoke-WebRequest "https://nodejs.org/dist/$($lts.version)/SHASUMS256.txt" -UseBasicParsing).Content
        $want = ($sums -split "`n" | Where-Object { $_ -match [regex]::Escape($name) + '$' }) -replace '\s.*$', ''
        if ((Get-FileHash $zip -Algorithm SHA256).Hash -ne $want.Trim().ToUpper()) { Remove-Item $zip; throw 'The Node.js download did not match its checksum; nothing was installed. Try again later.' }
        if (Test-Path $private) { Remove-Item $private -Recurse -Force }
        Expand-Archive $zip -DestinationPath $private
        Remove-Item $zip
        $nodeExe = Get-ChildItem $private -Filter node.exe -Recurse | Select-Object -First 1 -ExpandProperty FullName
        Write-Host "Node.js $($lts.version) is ready." -ForegroundColor Green
    }
    $env:PATH = (Split-Path $nodeExe) + ';' + $env:PATH   # for this window only: npm and Electron's installer find it
}
$electron = Join-Path $app 'node_modules\electron\dist\electron.exe'
# The packages again whenever their list (package-lock.json) changed since the last install (new parts, new versions).
$stamp = Join-Path $app 'node_modules\.roehre-lock'
$lock = (Get-FileHash (Join-Path $app 'package-lock.json') -Algorithm SHA256).Hash
if (-not (Test-Path $stamp) -or (Get-Content $stamp -Raw).Trim() -ne $lock) {
    Write-Host 'Installing the parts of Deine Roehre (once per update)...' -ForegroundColor Cyan
    Push-Location $app
    try { & npm.cmd install --no-audit --no-fund; if ($LASTEXITCODE -ne 0) { throw 'npm install failed (see above).' } } finally { Pop-Location }
    Set-Content $stamp (Get-FileHash (Join-Path $app 'package-lock.json') -Algorithm SHA256).Hash   # npm may tidy the file
}
# npm installs only Electron's small package; the program itself (about 100 MB) comes from its own installer, which npm
# does not always run. Run it here when the program is still missing.
if (-not (Test-Path $electron)) {
    Write-Host 'Downloading the Electron program (about 100 MB, once)...' -ForegroundColor Cyan
    Push-Location $app
    try { & node node_modules\electron\install.js; if ($LASTEXITCODE -ne 0) { throw 'The Electron download failed (see above).' } } finally { Pop-Location }
    if (-not (Test-Path $electron)) { throw "Electron is still missing: $electron" }
}
# A second start only brings the open window to the front (app/main.mjs keeps one at a time).
Start-Process -FilePath $electron -ArgumentList '.' -WorkingDirectory $app
Write-Host 'Deine Roehre is open. This window can close.' -ForegroundColor Green
