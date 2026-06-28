@echo off
setlocal

echo Starting IDX Monitor...
echo.

if not exist backend\requirements.txt (
  echo Backend folder not found. Run this file from the project root.
  pause
  exit /b 1
)

if not exist frontend\package.json (
  echo Frontend folder not found. Run this file from the project root.
  pause
  exit /b 1
)

echo Starting backend on http://localhost:8000 ...
start "IDX Backend" cmd /k "cd /d %~dp0backend && python -m pip install -r requirements.txt && uvicorn main:app --reload --host 127.0.0.1 --port 8000"

echo Starting frontend on http://localhost:5173 ...
start "IDX Frontend" cmd /k "cd /d %~dp0frontend && npm install && npm run dev -- --host 127.0.0.1"

echo ===================================================
echo   IDX Monitor is starting!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ===================================================
echo Keep both terminal windows open while developing.
echo.

endlocal
