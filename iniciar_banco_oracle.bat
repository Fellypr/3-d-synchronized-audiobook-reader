@echo off
echo ========================================================
echo   Conectando ao PostgreSQL da Oracle Cloud (Tunel SSH)
echo   Local: 127.0.0.1:5433 -^> Oracle VPS: 5432
echo ========================================================
ssh -i "%USERPROFILE%\Documents\nineRouter.key" -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -N -L 5433:localhost:5432 ubuntu@147.15.108.122
