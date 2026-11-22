@echo off
setlocal
cd /d "%~dp0"
echo =====================================
echo       CalEst Full-Stack Setup
echo =====================================
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install the LTS version from https://nodejs.org/ and reopen this file.
  pause
  exit /b 1
)
where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js LTS and try again.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Installing root dependencies...
  call npm install
  if errorlevel 1 goto failed
)
if not exist backend\node_modules (
  echo Installing backend dependencies...
  call npm --prefix backend install
  if errorlevel 1 goto failed
)
if not exist frontend\node_modules (
  echo Installing frontend dependencies...
  call npm --prefix frontend install
  if errorlevel 1 goto failed
)
echo Starting frontend and backend. Keep this window open.
call npm run dev
pause
exit /b 0
:failed
echo Setup failed. Check your internet connection and the error shown above.
pause
exit /b 1
