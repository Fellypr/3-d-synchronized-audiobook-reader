@echo off
echo ========================================================
echo   Iniciando API Local do Gerador de Audio (FastAPI/TTS)
echo   Servidor: http://127.0.0.1:8000
echo ========================================================
cd /d "C:\Users\Gal\Documents\gerador-de-audio"
uv run --with-requirements requirements.txt uvicorn app:app --host 127.0.0.1 --port 8000 --reload
