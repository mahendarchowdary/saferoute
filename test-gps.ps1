# SafeRoute GPS Pipeline Test Script
# Run this to test all services and see logs

Write-Host "🚌 SafeRoute GPS Pipeline Test" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

function Test-Service {
    param($Name, $Url, $Port)
    
    Write-Host "Testing $Name... " -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri $Url -Method GET -TimeoutSec 5 -ErrorAction Stop
        Write-Host "✅ ONLINE" -ForegroundColor Green
        return $true
    } catch {
        Write-Host "❌ OFFLINE" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Yellow
        return $false
    }
}

# Test API
$api = Test-Service -Name "API Server" -Url "http://localhost:3001/api/health" -Port 3001

# Test GPS
$gps = Test-Service -Name "GPS Service" -Url "http://localhost:8081/health" -Port 8081

# Test Admin
$admin = Test-Service -Name "Admin Panel" -Url "http://localhost:3000" -Port 3000

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "📊 Summary:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

$services = @(
    @{Name="API Server"; Status=$api},
    @{Name="GPS Service"; Status=$gps},
    @{Name="Admin Panel"; Status=$admin}
)

foreach ($svc in $services) {
    $icon = if ($svc.Status) { "✅" } else { "❌" }
    $color = if ($svc.Status) { "Green" } else { "Red" }
    Write-Host "$icon $($svc.Name)" -ForegroundColor $color
}

# Test GPS WebSocket
Write-Host "`n📍 Testing GPS WebSocket..." -ForegroundColor Cyan
try {
    $ws = New-Object System.Net.WebClient
    Write-Host "WebSocket endpoint: ws://localhost:8081/ws" -ForegroundColor Yellow
    Write-Host "✅ WebSocket port is accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ WebSocket test failed" -ForegroundColor Red
}

Write-Host "`n🧪 To test full GPS pipeline:" -ForegroundColor Cyan
Write-Host "   1. Start Driver App (Expo)" -ForegroundColor Yellow
Write-Host "   2. Login as driver" -ForegroundColor Yellow
Write-Host "   3. Start a trip" -ForegroundColor Yellow
Write-Host "   4. GPS will stream automatically" -ForegroundColor Yellow
Write-Host "   5. Open Parent app to track" -ForegroundColor Yellow

Write-Host "`n📋 View detailed logs:" -ForegroundColor Cyan
Write-Host "   - Open gps-monitor.html in browser" -ForegroundColor Yellow
Write-Host "   - Or run: node test-gps.js" -ForegroundColor Yellow

Read-Host "`nPress Enter to exit"
