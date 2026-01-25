@echo off
echo ==========================================
echo   NEXUS CLOUD CONNECTION
echo ==========================================
echo.
echo We need to verify your account once.
echo A browser window will open. Please click "Log In" or "Sign Up".
echo.
pause
call npx vercel login
echo.
echo ==========================================
echo   SUCCESS! 
echo   Now you can run DEPLOY_TO_PROD.bat
echo ==========================================
pause
