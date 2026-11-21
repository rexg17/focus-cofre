@echo off
REM Gera dist\FocusCofre.exe com PyInstaller (arquivo unico). Precisa de Python 3.10+ no Windows.
REM Alternativa sem instalar nada: python tools\montar_windows.py (pacote portatil, tambem funciona a partir do Linux).
python -m venv .venv || goto :erro
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip
pip install -r requirements.txt || goto :erro
pyinstaller --noconfirm --onefile --windowed --name FocusCofre --icon web\icon.ico --collect-submodules anthropic --add-data "web;web" app.py || goto :erro
echo.
echo Pronto: dist\FocusCofre.exe
echo Os dados ficam em %%APPDATA%%\FocusCofre\cofre.db
exit /b 0
:erro
echo Falhou. Veja a mensagem acima.
exit /b 1
