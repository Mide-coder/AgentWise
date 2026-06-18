# AgentWise Dev Launcher
# Run this from the repo root in a PowerShell terminal that already has Node on PATH.
# If node isn't found, it adds C:\Program Files\nodejs automatically.

param(
  [switch]$ApiOnly,
  [switch]$WebOnly
)

$nodePath = "C:\Program Files\nodejs"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  $env:Path += ";$nodePath"
  Write-Host "Added $nodePath to PATH"
}

Write-Host "Node: $(node --version)  npm: $(npm --version)"
Write-Host ""

$pnpm = "C:\Users\Admin\AppData\Roaming\npm\pnpm.cmd"

if (-not $WebOnly) {
  Write-Host "Starting API on http://localhost:4000 ..."
  $api = Start-Process -FilePath "powershell" -ArgumentList `
    "-NoProfile -Command `$env:Path += ';C:\Program Files\nodejs'; `$env:NEXT_PUBLIC_NETWORK='testnet'; `$env:YELLOW_SDK_API_KEY='dev-key'; `$env:PORT='4000'; & '$nodePath\node.exe' 'C:\Users\Admin\Agentwise\apps\api\dist\server.js'" `
    -PassThru -WindowStyle Normal
  Write-Host "  API PID: $($api.Id)"
}

if (-not $ApiOnly) {
  Start-Sleep -Seconds 2
  Write-Host "Starting Web on http://localhost:3000 ..."
  $web = Start-Process -FilePath "powershell" -ArgumentList `
    "-NoProfile -Command `$env:Path += ';C:\Program Files\nodejs'; Set-Location 'C:\Users\Admin\Agentwise\apps\web'; & '$pnpm' dev" `
    -PassThru -WindowStyle Normal
  Write-Host "  Web PID: $($web.Id)"
}

Write-Host ""
Write-Host "AgentWise is starting up."
Write-Host "  API  -> http://localhost:4000/health"
Write-Host "  Web  -> http://localhost:3000"
Write-Host ""
Write-Host "Press Ctrl+C or close the spawned windows to stop."
