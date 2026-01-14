@echo off
echo Starting IDX Dashboard...

echo Installing backend dependencies...
start "IDX Backend" cmd /k "cd backend && pip install -r requirements.txt && uvicorn main:app --reload"

echo Starting frontend...
start "IDX Frontend" cmd /k "cd frontend && npm run dev"

echo ===================================================
echo   IDX Dashboard is running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8000/docs
echo ===================================================
