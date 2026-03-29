@echo off
echo ========================================
echo CauseAI Backend - Quick Start
echo ========================================
echo.

cd backend

echo Checking if dependencies are installed...
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

echo Checking environment configuration...
if not exist ".env" (
    echo WARNING: .env file not found!
    echo Please copy .env.example to .env and configure your settings.
    echo.
    pause
    exit /b 1
)

echo Starting backend server...
echo.
call npm start
