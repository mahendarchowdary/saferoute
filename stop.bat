@echo off
echo ==========================================
echo    🛑 SafeRoute - Stop All Services
echo ==========================================
echo.
echo Stopping all SafeRoute services...
echo.

taskkill /F /IM node.exe 2>nul && echo ✅ Node.js processes stopped
taskkill /F /IM go.exe 2>nul && echo ✅ Go processes stopped

echo.
echo ==========================================
echo    ✅ All services stopped!
echo ==========================================
echo.
pause
