@echo off
echo ==========================================
echo    🚌 SafeRoute - Service Manager
echo ==========================================
echo.
echo Starting ALL services... (3 windows will open)
echo.

REM Kill any existing processes first
echo 🧹 Cleaning up old processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM go.exe 2>nul
timeout /t 2 /nobreak >nul

REM Open API server
echo [1/3] 🟢 Starting API Server on http://localhost:3001
start "SafeRoute API" cmd /k "cd /d d:\BusTrack\saferoute\apps\api && echo Starting API... && npm run dev"

timeout /t 3 /nobreak >nul

REM Open GPS service
echo [2/3] 🟢 Starting GPS Service on http://localhost:3002
start "SafeRoute GPS" cmd /k "cd /d d:\BusTrack\saferoute\apps\gps-service && echo Starting GPS... && go run main.go"

timeout /t 3 /nobreak >nul

REM Open Admin panel
echo [3/3] 🟢 Starting Admin Panel on http://localhost:3000
start "SafeRoute Admin" cmd /k "cd /d d:\BusTrack\saferoute\apps\admin && echo Starting Admin... && npm run dev"

echo.
echo ==========================================
echo    ✅ All servers starting!
echo ==========================================
echo.
echo 📡 Services:
echo    API:      http://localhost:3001/health
echo    GPS:      http://localhost:3002/health
echo    Admin:    http://localhost:3000
echo.
echo ⏳ Wait 5 seconds for services to start...
timeout /t 5 /nobreak >nul

echo.
echo 🔍 Quick Health Check:
curl -s http://localhost:3001/health | findstr "ok" >nul && echo    ✅ API: HEALTHY || echo    ❌ API: Not ready
curl -s http://localhost:3002/health | findstr "healthy" >nul && echo    ✅ GPS: HEALTHY || echo    ❌ GPS: Not ready
echo.
echo ==========================================
echo    🎉 SafeRoute is running!
echo ==========================================
echo.
pause
