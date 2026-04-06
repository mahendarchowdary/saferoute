@echo off
echo ==========================================
echo    🔍 SafeRoute - Health Check
echo ==========================================
echo.

echo 📡 Checking API Server (:3001)...
curl -s http://localhost:3001/health > nul
if %errorlevel% == 0 (
    echo    ✅ API Server: HEALTHY
    curl -s http://localhost:3001/health
) else (
    echo    ❌ API Server: NOT RUNNING
)

echo.
echo 📍 Checking GPS Service (:3002)...
curl -s http://localhost:3002/health > nul
if %errorlevel% == 0 (
    echo    ✅ GPS Service: HEALTHY
    curl -s http://localhost:3002/health
) else (
    echo    ❌ GPS Service: NOT RUNNING
)

echo.
echo 🎛️  Checking Admin Panel (:3000)...
curl -s -o nul -w "%%{http_code}" http://localhost:3000 | findstr "200" > nul
if %errorlevel% == 0 (
    echo    ✅ Admin Panel: HEALTHY
) else (
    echo    ⚪ Admin Panel: Check manually at http://localhost:3000
)

echo.
echo ==========================================
echo    Health check complete!
echo ==========================================
echo.
pause
