<#
.SYNOPSIS
  Calls the credit reset cron endpoint manually.
.DESCRIPTION
  Sends a POST request to /api/cron/reset-credits with the CRON_SECRET
  for testing or manual invocation. Requires the CRON_SECRET to be set
  in the web app's environment.
.EXAMPLE
  .\scripts\call-cron.ps1
  .\scripts\call-cron.ps1 -Secret "my-secret" -Url "http://localhost:3000"
#>

param(
  [string]$Secret = $env:CRON_SECRET,
  [string]$Url = $env:APP_URL ?? "http://localhost:3000"
)

if (-not $Secret) {
  Write-Error "CRON_SECRET is required. Provide via -Secret param or `$env:CRON_SECRET"
  exit 1
}

$endpoint = "$Url/api/cron/reset-credits"

Write-Host "Calling cron endpoint: $endpoint" -ForegroundColor Cyan

try {
  $response = Invoke-RestMethod -Uri $endpoint -Method POST -Headers @{
    "Authorization" = "Bearer $Secret"
    "Content-Type" = "application/json"
  } -ErrorAction Stop

  Write-Host "Response:" -ForegroundColor Green
  $response | ConvertTo-Json -Depth 3
}
catch {
  Write-Host "Error: $_" -ForegroundColor Red
  if ($_.Exception.Response) {
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    $body = $reader.ReadToEnd() | ConvertFrom-Json
    Write-Host "Body: $body" -ForegroundColor Red
  }
  exit 1
}
