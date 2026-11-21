@echo off
title Push Maatram Unity Hub to GitHub
echo =======================================================
echo Pushing Maatram-Unity-Hub to GitHub...
echo Repository: https://github.com/Shanmuganathan18/Maatram-Unity-Hub.git
echo Branch: main
echo =======================================================
cd /d "%~dp0"

echo.
echo Running git push...
.\.tools\git\cmd\git.exe push -u origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo =======================================================
    echo [SUCCESS] Project successfully pushed to GitHub!
    echo =======================================================
) else (
    echo.
    echo =======================================================
    echo [NOTICE] If authentication failed, please sign in via
    echo the browser prompt or provide a GitHub Personal Access
    echo Token (PAT) with 'repo' scope.
    echo =======================================================
)

echo.
pause

