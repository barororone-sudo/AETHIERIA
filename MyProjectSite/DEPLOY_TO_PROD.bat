@echo off
echo ==========================================
echo   NEXUS DEPLOYMENT SEQUENCE
echo ==========================================
echo.
echo [1/3] Installing Dependencies & Building...
call npm install
call npm run build
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
call npx vercel --prod --name nexus-social-grid
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deployment failed.
    echo Please run CONNECT_ACCOUNT.bat FIRST to log in.
    pause
    exit /b
)

echo.
echo [3/3] Deployment Request Sent.
echo Your site is LIVE! Check the link above.
echo ==========================================
pause
