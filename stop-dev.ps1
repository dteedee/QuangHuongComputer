# ========================================
# STOP DEVELOPMENT SERVICES
# ========================================

Write-Host "🛑 Stopping Quang Huong Computer Development Environment..." -ForegroundColor Yellow

# Stop background jobs
Write-Host "`n📋 Stopping background jobs..." -ForegroundColor Cyan

$jobs = Get-Job
foreach ($job in $jobs) {
    Write-Host "  • Stopping $($job.Name)..." -ForegroundColor Cyan
    Stop-Job -Name $job.Name
    Remove-Job -Name $job.Name
}

Write-Host "✅ Background jobs stopped" -ForegroundColor Green

# Stop processes
Write-Host "`n📋 Stopping processes..." -ForegroundColor Cyan

# Stop dotnet processes
$dotnetProcesses = Get-Process -Name "dotnet" -ErrorAction SilentlyContinue
if ($dotnetProcesses) {
    Write-Host "  • Stopping dotnet processes..." -ForegroundColor Cyan
    Stop-Process -Name "dotnet" -Force
    Write-Host "  ✅ Dotnet processes stopped" -ForegroundColor Green
}

# Stop node processes
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "  • Stopping node processes..." -ForegroundColor Cyan
    Stop-Process -Name "node" -Force
    Write-Host "  ✅ Node processes stopped" -ForegroundColor Green
}

Write-Host "`n✅ All services stopped!" -ForegroundColor Green
