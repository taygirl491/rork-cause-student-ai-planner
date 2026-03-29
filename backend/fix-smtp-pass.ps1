# Fix SMTP_PASS by removing spaces
# This script will update the .env file to remove spaces from SMTP_PASS

$envFile = "c:\Users\Administrator\Documents\REACTNATIVE\rork-cause-student-ai-planner\backend\.env"

Write-Host "🔧 Fixing SMTP_PASS in .env file..." -ForegroundColor Cyan

# Read the file
$content = Get-Content $envFile -Raw

# Show current SMTP_PASS (masked)
if ($content -match 'SMTP_PASS=([^\r\n]+)') {
    $currentPass = $matches[1]
    $passLength = $currentPass.Length
    $passWithoutSpaces = $currentPass -replace '\s', ''
    $newLength = $passWithoutSpaces.Length
    
    Write-Host "`nCurrent SMTP_PASS:" -ForegroundColor Yellow
    Write-Host "  Length with spaces: $passLength characters" -ForegroundColor Yellow
    Write-Host "  Length without spaces: $newLength characters" -ForegroundColor Yellow
    
    if ($currentPass -match '\s') {
        Write-Host "`n⚠️  Spaces detected! Removing them..." -ForegroundColor Red
        
        # Replace SMTP_PASS line
        $content = $content -replace 'SMTP_PASS=[^\r\n]+', "SMTP_PASS=$passWithoutSpaces"
        
        # Write back to file
        $content | Set-Content $envFile -NoNewline
        
        Write-Host "✅ Fixed! SMTP_PASS now has $newLength characters (no spaces)" -ForegroundColor Green
        Write-Host "`nNext steps:" -ForegroundColor Cyan
        Write-Host "1. Restart the backend server (Ctrl+C and run 'node server.js' again)" -ForegroundColor White
        Write-Host "2. Check for 'SMTP server is ready to send emails' message" -ForegroundColor White
        Write-Host "3. Try the broadcast email feature from the admin panel" -ForegroundColor White
    } else {
        Write-Host "`n✅ No spaces found in SMTP_PASS. Configuration looks good!" -ForegroundColor Green
    }
} else {
    Write-Host "❌ Could not find SMTP_PASS in .env file" -ForegroundColor Red
}
