# Add Windows Firewall rule to allow Node.js backend on port 3000
# This script must be run as Administrator

Write-Host "🔥 Adding Windows Firewall Rule for Node.js Backend..." -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Navigate to this directory and run the script again" -ForegroundColor White
    Write-Host ""
    pause
    exit 1
}

# Check if rule already exists
$existingRule = Get-NetFirewallRule -DisplayName "Node.js Backend Dev Server" -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "⚠️  Firewall rule already exists. Removing old rule..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName "Node.js Backend Dev Server"
}

# Add new firewall rule
try {
    New-NetFirewallRule `
        -DisplayName "Node.js Backend Dev Server" `
        -Description "Allow incoming connections to Node.js backend on port 3000 for development" `
        -Direction Inbound `
        -LocalPort 3000 `
        -Protocol TCP `
        -Action Allow `
        -Profile Any `
        -Enabled True | Out-Null
    
    Write-Host "✅ Firewall rule added successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Rule Details:" -ForegroundColor Cyan
    Write-Host "  Name: Node.js Backend Dev Server" -ForegroundColor White
    Write-Host "  Port: 3000" -ForegroundColor White
    Write-Host "  Protocol: TCP" -ForegroundColor White
    Write-Host "  Direction: Inbound" -ForegroundColor White
    Write-Host "  Action: Allow" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. The firewall rule is now active" -ForegroundColor White
    Write-Host "2. Try the broadcast email from the Android app again" -ForegroundColor White
    Write-Host "3. Check the backend logs for incoming requests" -ForegroundColor White
    Write-Host ""
    
} catch {
    Write-Host "❌ ERROR: Failed to add firewall rule" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    pause
    exit 1
}

pause
