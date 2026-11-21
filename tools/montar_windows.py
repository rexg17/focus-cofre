"""Monta a versão portátil para Windows (pasta + .zip), a partir de qualquer sistema com Go, curl e pip.

Resultado: dist/FocusCofre-Windows.zip, com
    FocusCofre.exe           launcher (Go, sem console)
    python/                  Python 3.12 para Windows (pacote oficial do NuGet)
    site-packages/           bibliotecas (anthropic e dependências) já compiladas para Windows
    app/                     o código do Focus Cofre (app.py, db.py, llm.py, web/)
Não precisa instalar nada no Windows. O app abre numa janela do Edge/Chrome.
"""
import hashlib, os, shutil, subprocess, sys, zipfile
from pathlib import Path

R = Path(__file__).resolve().parent.parent
CACHE = R / "build_cache"
SAIDA = R / "dist" / "FocusCofre-Windows"
PY_VERSAO = "3.12.8"
NUGET = f"https://api.nuget.org/v3-flatcontainer/python/{PY_VERSAO}/python.{PY_VERSAO}.nupkg"
PODAR = ["Lib/test", "Lib/idlelib", "Lib/turtledemo", "Lib/tkinter", "Lib/ensurepip", "Lib/venv", "Lib/pydoc_data", "include"]


def rodar(cmd, **kw):
    print("$", " ".join(map(str, cmd)))
    subprocess.run(cmd, check=True, **kw)


def baixar_python():
    CACHE.mkdir(exist_ok=True)
    nupkg = CACHE / f"python-{PY_VERSAO}.nupkg"
    if not nupkg.exists():
        rodar(["curl", "-sSL", "--fail", "-m", "600", "-o", str(nupkg), NUGET])
    destino = SAIDA / "python"
    with zipfile.ZipFile(nupkg) as z:
        for i in z.infolist():
            if i.filename.startswith("tools/") and not i.is_dir():
                alvo = destino / i.filename[len("tools/"):]
                alvo.parent.mkdir(parents=True, exist_ok=True)
                alvo.write_bytes(z.read(i))
    for rel in PODAR:
        shutil.rmtree(destino / rel, ignore_errors=True)
    sp = destino / "Lib" / "site-packages"          # o pip do Python embutido não é necessário
    shutil.rmtree(sp, ignore_errors=True); sp.mkdir()
    for pyc in destino.rglob("__pycache__"):
        shutil.rmtree(pyc, ignore_errors=True)


def instalar_bibliotecas():
    rodas = CACHE / "wheels"
    rodar([sys.executable, "-m", "pip", "download", "--platform", "win_amd64", "--python-version", "3.12",
           "--implementation", "cp", "--abi", "cp312", "--only-binary=:all:", "-d", str(rodas), "anthropic"])
    destino = SAIDA / "site-packages"
    destino.mkdir(parents=True)
    for roda in sorted(rodas.glob("*.whl")):
        with zipfile.ZipFile(roda) as z:
            z.extractall(destino)


def copiar_app():
    destino = SAIDA / "app"
    for nome in ("app.py", "db.py", "llm.py"):
        shutil.copy2(R / nome, destino / nome) if destino.exists() else (destino.mkdir(), shutil.copy2(R / nome, destino / nome))
    shutil.copytree(R / "web", destino / "web", ignore=shutil.ignore_patterns("__pycache__"))


def compilar_launcher():
    env = dict(os.environ, GOOS="windows", GOARCH="amd64", CGO_ENABLED="0", GOFLAGS="-mod=mod")
    rodar(["go", "build", "-ldflags", "-H=windowsgui -s -w", "-o", str(SAIDA / "FocusCofre.exe"), "."], cwd=R / "windows" / "launcher", env=env)


def escrever_textos():
    (SAIDA / "LEIA-ME.txt").write_text("""FOCUS COFRE (versão portátil para Windows)

COMO USAR
1. Extraia a pasta inteira do .zip (clique direito > Extrair tudo). Não abra o programa de dentro do .zip.
2. Dê dois cliques em FocusCofre.exe. O app abre numa janela própria (usa o Microsoft Edge ou o Chrome, que o
   Windows 10 e 11 já têm).
3. Se o Windows mostrar "O Windows protegeu o computador" (SmartScreen), clique em "Mais informações" e depois em
   "Executar assim mesmo". Isso acontece porque o programa não tem assinatura digital paga.
4. Opcional: dê dois cliques em "Criar atalho.bat" para colocar o Focus Cofre na área de trabalho.

ONDE FICAM OS DADOS
  %APPDATA%\\FocusCofre\\cofre.db   (copie e cole essa linha na barra de endereço do Explorador)
  Backup automático diário em %APPDATA%\\FocusCofre\\backups. Dá para restaurar pela aba "ajustes".
  Para desinstalar, apague esta pasta. Seus dados continuam em %APPDATA%\\FocusCofre.

SE ALGO DER ERRADO
  - Abra "Abrir com console (diagnóstico).bat": mostra as mensagens de erro.
  - O arquivo %APPDATA%\\FocusCofre\\erro.log guarda os erros.
  - Antivírus pode bloquear programas sem assinatura: se isso acontecer, adicione esta pasta às exceções.

COACH COM IA (opcional)
  Na aba "ajustes" cole a sua chave da API da Anthropic. Sem chave, o app funciona normalmente.
""", encoding="utf-8")
    (SAIDA / "Criar atalho.bat").write_text(r"""@echo off
powershell -NoProfile -Command "$s=(New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop')+'\Focus Cofre.lnk');$s.TargetPath='%~dp0FocusCofre.exe';$s.WorkingDirectory='%~dp0';$s.IconLocation='%~dp0app\web\icon.ico';$s.Save()"
echo Atalho criado na area de trabalho.
pause
""", encoding="utf-8")
    (SAIDA / "Abrir com console (diagnóstico).bat").write_text(r"""@echo off
set PYTHONPATH=%~dp0site-packages
set PYTHONNOUSERSITE=1
set PYTHONUTF8=1
"%~dp0python\python.exe" "%~dp0app\app.py" --browser --novo
pause
""", encoding="utf-8")


def compactar():
    destino = SAIDA.parent / "FocusCofre-Windows.zip"
    destino.unlink(missing_ok=True)
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for f in sorted(SAIDA.rglob("*")):
            if f.is_file():
                z.write(f, Path("FocusCofre") / f.relative_to(SAIDA))
    h = hashlib.sha256(destino.read_bytes()).hexdigest()
    (SAIDA.parent / "FocusCofre-Windows.sha256").write_text(f"{h}  FocusCofre-Windows.zip\n")
    print(f"\n{destino}  {destino.stat().st_size/1e6:.1f} MB\nsha256 {h}")


if __name__ == "__main__":
    shutil.rmtree(SAIDA, ignore_errors=True)
    SAIDA.mkdir(parents=True)
    baixar_python(); instalar_bibliotecas(); copiar_app(); compilar_launcher(); escrever_textos(); compactar()
