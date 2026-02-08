# ========================================
# QUICK START - QUANG HUONG COMPUTER
# ========================================
# Run this script to start all services for local development

Write-Host "🚀 Starting Quang Huong Computer Development Environment..." -ForegroundColor Green

# ========================================
# CHECK PREREQUISITES
# ========================================
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Yellow

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check .NET
try {
    $dotnetVersion = dotnet --version
    Write-Host "✅ .NET: $dotnetVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ .NET not found. Please install .NET 8 SDK." -ForegroundColor Red
    exit 1
}

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 18+." -ForegroundColor Red
    exit 1
}

# ========================================
# START DATABASE
# ========================================
Write-Host "`n🗄️  Starting PostgreSQL..." -ForegroundColor Yellow

$postgresContainer = docker ps -q -f name=quanghuong-postgres
if ($postgresContainer) {
    Write-Host "✅ PostgreSQL already running" -ForegroundColor Green
} else {
    Write-Host "📦 Starting PostgreSQL container..." -ForegroundColor Cyan
    docker run -d `
        --name quanghuong-postgres `
        -e POSTGRES_USER=postgres `
        -e POSTGRES_PASSWORD=12102004 `
        -e POSTGRES_DB=quanghuong `
        -e LC_COLLATE=en_US.UTF-8 `
        -e LC_CTYPE=en_US.UTF-8 `
        -p 5432:5432 `
        postgres:16-alpine

    Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Cyan
    Start-Sleep -Seconds 5

    # Check if PostgreSQL is ready
    $maxRetries = 10
    $retryCount = 0
    $ready = $false

    while ($retryCount -lt $maxRetries -and -not $ready) {
        try {
            docker exec quanghuong-postgres pg_isready -U postgres | Select-String "accepting connections"
            $ready = $true
            Write-Host "✅ PostgreSQL is ready!" -ForegroundColor Green
        } catch {
            $retryCount++
            Start-Sleep -Seconds 2
        }
    }

    if (-not $ready) {
        Write-Host "❌ PostgreSQL failed to start" -ForegroundColor Red
        exit 1
    }
}

# ========================================
# SET ENVIRONMENT VARIABLES
# ========================================
Write-Host "`n🔧 Setting environment variables..." -ForegroundColor Yellow

$env:ConnectionStrings__DefaultConnection = "Host=localhost;Port=5432;Database=quanghuong;Username=postgres;Password=12102004"
$env:ConnectionStrings__RabbitMQ = "amqp://guest:guest@localhost:5672"
$env:ConnectionStrings__Redis = "localhost:6379"
$env:Jwt__Key = "super_secret_key_for_development_only_32_chars_minimum"
$env:Jwt__Issuer = "QuangHuongComputer"
$env:Jwt__Audience = "QuangHuongComputerUsers"
$env:Jwt__ExpiryMinutes = "60"
$env:Frontend__Url = "http://localhost:5173"
$env:RateLimiting__PermitLimit = "1000"
$env:RateLimiting__WindowInSeconds = "60"

Write-Host "✅ Environment variables set" -ForegroundColor Green

# ========================================
# RUN DATABASE MIGRATIONS
# ========================================
Write-Host "`n🔄 Running database migrations..." -ForegroundColor Yellow

$backendPath = "f:\Project\QuangHuongComputer\backend"
$services = @("Catalog", "Sales", "Identity", "Content", "Inventory", "Repair", "Warranty", "Payments", "Accounting", "HR", "Communication", "Ai", "SystemConfig")

foreach ($service in $services) {
    $projectPath = Join-Path $backendPath "Services\$service"
    if (Test-Path $projectPath) {
        Write-Host "  📝 Migrating $service..." -ForegroundColor Cyan
        try {
            cd $backendPath
            dotnet ef database update --project "Services\$service" --quiet 2>$null
            Write-Host "  ✅ $service migrated" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️  $service migration failed (might be ok)" -ForegroundColor Yellow
        }
    }
}

# ========================================
# START BACKEND
# ========================================
Write-Host "`n🔧 Starting Backend API..." -ForegroundColor Yellow

$backendProcess = Get-Process -Name "ApiGateway" -ErrorAction SilentlyContinue
if ($backendProcess) {
    Write-Host "⚠️  Backend already running. Stopping it..." -ForegroundColor Yellow
    Stop-Process -Name "ApiGateway" -Force
    Start-Sleep -Seconds 2
}

Write-Host "📦 Starting API Gateway..." -ForegroundColor Cyan
$backendJob = Start-Job -ScriptBlock {
    cd "f:\Project\QuangHuongComputer\backend\ApiGateway"
    dotnet watch
} -Name "BackendAPI"

Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 5
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is running!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  Backend might not be ready yet. Check manually." -ForegroundColor Yellow
}

# ========================================
# START FRONTEND
# ========================================
Write-Host "`n🎨 Starting Frontend..." -ForegroundColor Yellow

$frontendProcess = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*vite*" }
if ($frontendProcess) {
    Write-Host "⚠️  Frontend already running. Stopping it..." -ForegroundColor Yellow
    Stop-Process -Name "node" -Force
    Start-Sleep -Seconds 2
}

Write-Host "📦 Starting Vite dev server..." -ForegroundColor Cyan
$frontendJob = Start-Job -ScriptBlock {
    cd "f:\Project\QuangHuongComputer\frontend"
    npm run dev
} -Name "Frontend"

Write-Host "⏳ Waiting for frontend to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

# ========================================
# OPEN BROWSER
# ========================================
Write-Host "`n🌐 Opening browser..." -ForegroundColor Yellow

Start-Process "http://localhost:5173"

# ========================================
# SUMMARY
# ========================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "✅ DEVELOPMENT ENVIRONMENT STARTED!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "📍 Access URLs:" -ForegroundColor White
Write-Host "  • Frontend:       http://localhost:5173" -ForegroundColor Cyan
Write-Host "  • Backend API:    http://localhost:5000" -ForegroundColor Cyan
Write-Host "  • Swagger UI:     http://localhost:5000/swagger" -ForegroundColor Cyan
Write-Host "  • Health Check:   http://localhost:5000/health" -ForegroundColor Cyan
Write-Host "  • PostgreSQL:     localhost:5432" -ForegroundColor Cyan
Write-Host "`n"

Write-Host "📝 To stop all services:" -ForegroundColor White
Write-Host "  • Press Ctrl+C in this terminal" -ForegroundColor Yellow
Write-Host "  • Or run: .\stop-dev.ps1" -ForegroundColor Yellow

Write-Host "`n📚 Useful commands:" -ForegroundColor White
Write-Host "  • View logs: Get-Job BackendAPI | Receive-Job" -ForegroundColor Yellow
Write-Host "  • Check DB:   docker exec quanghuong-postgres psql -U postgres -d quanghuong" -ForegroundColor Yellow
Write-Host "`n"

# Keep script running
Write-Host "✨ All services are running. Press Ctrl+C to stop.`n" -ForegroundColor Green

# Wait for Ctrl+C
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`n🛑 Stopping all services..." -ForegroundColor Yellow
    
    if (Get-Job -Name "BackendAPI" -ErrorAction SilentlyContinue) {
        Stop-Job -Name "BackendAPI"
        Remove-Job -Name "BackendAPI"
    }
    
    if (Get-Job -Name "Frontend" -ErrorAction SilentlyContinue) {
        Stop-Job -Name "Frontend"
        Remove-Job -Name "Frontend"
    }
    
    Write-Host "✅ All services stopped." -ForegroundColor Green
}
