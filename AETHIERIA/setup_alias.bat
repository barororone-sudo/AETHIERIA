@echo off
:: Check for permissions
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"

:: If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%CD%"
    CD /D "%~dp0"

:: Actual Logic
echo.
echo ==========================================
echo   AETHIERIA: CONFIGURATION DU DOMAINE
echo ==========================================
echo.

:: Check if entry exists
findstr /C:"127.0.0.1 Aethieria" "%WINDIR%\System32\drivers\etc\hosts" >nul
if %errorlevel% neq 0 (
    echo Adding 'Aethieria' to hosts file...
    echo. >> "%WINDIR%\System32\drivers\etc\hosts"
    echo 127.0.0.1 Aethieria >> "%WINDIR%\System32\drivers\etc\hosts"
    echo SUCCESS: Aethieria has been added.
) else (
    echo ALREADY EXISTS: Aethieria is already setup.
)

echo.
echo ==========================================
echo   TERMINE !
echo   Acces : http://Aethieria:3002
echo ==========================================
echo.
pause
