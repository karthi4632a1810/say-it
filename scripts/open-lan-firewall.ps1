# Run as Administrator (pick ONE):
#
# Option A — Command Prompt (easiest, no execution-policy issues):
#   cd /d "C:\KARTHIKEYAN\myCode\Say IT"
#   scripts\open-lan-firewall.cmd
#
# Option B — PowerShell with bypass:
#   powershell -ExecutionPolicy Bypass -File ".\scripts\open-lan-firewall.ps1"

$ErrorActionPreference = 'Stop'

$rules = @(
  @{ Name = 'Say IT Vite 5173'; Port = 5173 },
  @{ Name = 'Say IT API 3000'; Port = 3000 }
)

foreach ($r in $rules) {
  $existing = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "Rule already exists: $($r.Name)"
    continue
  }
  New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $r.Port | Out-Null
  Write-Host "Added firewall rule: $($r.Name) (TCP $($r.Port))"
}

Write-Host ""
Write-Host "Done. On your phone/other laptop (same WiFi), open:"
Write-Host "  http://192.168.1.110:5173"
Write-Host ""
Write-Host "If it still fails, your WiFi may block device-to-device traffic (AP isolation)."
Write-Host "Try: phone hotspot -> connect both laptops to the hotspot."
