"""Focus Cofre: coach financeiro pessoal com banco de dados local.

A interface é servida só em 127.0.0.1. Modos de abertura:
  (padrão)    janela do pywebview, se instalado; senão janela de aplicativo do Edge/Chrome; senão o navegador
  --janela    janela de aplicativo do Edge/Chrome (sem barra de endereço)
  --browser   navegador padrão
O app encerra sozinho depois que a janela é fechada.
"""
import json
import os
import secrets
import subprocess
import sys
import threading
import time
import traceback
import urllib.parse
import urllib.request
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import db
import llm

APP_NOME = "Focus Cofre"
MAX_BODY = 20 * 1024 * 1024
BYE_TOLERANCIA = int(os.environ.get("COFRE_BYE_TOLERANCIA", "60"))   # segundos entre fechar a janela e encerrar (aguenta recarregar a página)
SEM_PING_LIMITE = 300    # segundos sem sinal de vida da página (abas em segundo plano ficam lentas)


class Vida:
    """Sinal de vida da página aberta: quando ela fecha, o servidor encerra."""

    def __init__(self):
        self.ultimo_ping = time.time()
        self.visto = False
        self.bye_em = None
        self.fim = threading.Event()

    def ping(self):
        self.ultimo_ping = time.time(); self.visto = True; self.bye_em = None

    def bye(self):
        self.bye_em = time.time() + BYE_TOLERANCIA

    def verificar(self, agora=None, ultima_checagem=None):
        """Chamado a cada poucos segundos. Devolve True quando é hora de encerrar."""
        agora = agora or time.time()
        if ultima_checagem is not None and agora - ultima_checagem > 60:
            self.ultimo_ping = agora  # o computador dormiu: não conta como janela fechada
            return False
        if self.bye_em and agora >= self.bye_em:
            return True
        if self.visto and agora - self.ultimo_ping > SEM_PING_LIMITE:
            return True
        return False


def web_dir() -> Path:
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).parent))
    return base / "web"


def make_server(token: str, db_file=None, port=0) -> ThreadingHTTPServer:
    index_html = (web_dir() / "index.html").read_text(encoding="utf-8")
    root = web_dir().resolve()
    types = {".js": "application/javascript", ".css": "text/css", ".ico": "image/x-icon", ".png": "image/png"}
    lock = threading.Lock()

    class Handler(BaseHTTPRequestHandler):
        server_version = "FocusCofre"

        def log_message(self, *a):  # silencioso
            pass

        def _host_ok(self):
            host = self.headers.get("Host", "")
            return host.split(":")[0] in ("127.0.0.1", "localhost")

        def _send(self, code, body: bytes, ctype="application/json"):
            try:
                self.send_response(code)
                self.send_header("Content-Type", ctype + ("; charset=utf-8" if ctype.startswith("text") or "json" in ctype else ""))
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.send_header("X-Content-Type-Options", "nosniff")
                self.end_headers()
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass  # o navegador fechou a conexão (ex.: recarregou a página)

        def _json(self, code, obj):
            self._send(code, json.dumps(obj, ensure_ascii=False).encode("utf-8"))

        def _auth(self):
            if not self._host_ok():
                self._json(403, {"erro": "host não permitido"})
                return False
            if not secrets.compare_digest(self.headers.get("X-Cofre-Token", ""), token):
                self._json(401, {"erro": "token inválido"})
                return False
            return True

        def _token_na_url(self):
            if not self._host_ok():
                self._json(403, {"erro": "host não permitido"})
                return False
            t = self.path.partition("?t=")[2]
            if not secrets.compare_digest(urllib.parse.unquote(t), token):
                self._json(401, {"erro": "token inválido"})
                return False
            return True

        def do_GET(self):
            if not self._host_ok():
                return self._json(403, {"erro": "host não permitido"})
            if self.path.startswith(("/js/", "/style.css")):
                f = (root / self.path.split("?")[0].lstrip("/")).resolve()
                if root in f.parents and f.is_file() and f.suffix in types:
                    return self._send(200, f.read_bytes(), types[f.suffix])
                return self._json(404, {"erro": "não encontrado"})
            if self.path.partition("?")[0] == "/api/ping":
                if not self._token_na_url():
                    return
                self.server.vida.ping()
                return self._json(200, {"ok": True})
            if self.path in ("/", "/index.html"):
                html = index_html.replace("__COFRE_TOKEN__", token)
                return self._send(200, html.encode("utf-8"), "text/html")
            if self.path == "/api/state":
                if not self._auth():
                    return
                with lock, db.connect(db_file) as con:
                    return self._json(200, db.load_state(con))
            if self.path == "/api/settings":
                if not self._auth():
                    return
                return self._json(200, db.public_settings())
            if self.path == "/api/backups":
                if not self._auth():
                    return
                return self._json(200, db.list_backups())
            if self.path == "/api/health":
                return self._json(200, {"ok": True, "app": "focus-cofre"})
            self._json(404, {"erro": "não encontrado"})

        def do_POST(self):
            if self.path.partition("?")[0] == "/api/bye":
                if not self._token_na_url():
                    return
                self.server.vida.bye()
                return self._json(200, {"ok": True})
            if self.path not in ("/api/restore", "/api/llm"):
                return self._json(404, {"erro": "não encontrado"})
            if not self._auth():
                return
            if self.path == "/api/llm":
                try:
                    n = int(self.headers.get("Content-Length", "0"))
                    if n <= 0 or n > 2_000_000:
                        return self._json(413, {"erro": "conversa grande demais: comece uma nova"})
                    return self._json(200, llm.chamar(json.loads(self.rfile.read(n).decode("utf-8"))))
                except llm.LLMError as e:
                    return self._json(e.status, {"erro": str(e)})
                except json.JSONDecodeError:
                    return self._json(400, {"erro": "pedido inválido"})
                except Exception as e:
                    return self._json(500, {"erro": f"falha inesperada: {e}"})
            try:
                n = int(self.headers.get("Content-Length", "0"))
                if n <= 0 or n > 10_000:
                    return self._json(413, {"erro": "tamanho inválido"})
                body = json.loads(self.rfile.read(n).decode("utf-8"))
                with lock:
                    seguranca = db.restore_backup(body.get("name"))
                return self._json(200, {"ok": True, "copia_de_seguranca": seguranca})
            except (db.ValidationError, json.JSONDecodeError) as e:
                return self._json(400, {"erro": str(e)})
            except Exception as e:
                return self._json(500, {"erro": f"falha ao restaurar: {e}"})

        def do_PUT(self):
            if self.path not in ("/api/state", "/api/settings"):
                return self._json(404, {"erro": "não encontrado"})
            if not self._auth():
                return
            try:
                n = int(self.headers.get("Content-Length", "0"))
                if n <= 0 or n > MAX_BODY:
                    return self._json(413, {"erro": "tamanho inválido"})
                state = json.loads(self.rfile.read(n).decode("utf-8"))
                if self.path == "/api/settings":
                    db.save_settings(state)
                    try:
                        db.daily_backup()
                    except Exception:
                        pass
                    return self._json(200, db.public_settings())
                with lock:
                    con = db.connect(db_file)
                    try:
                        db.save_state(con, state)
                    finally:
                        con.close()
                self._json(200, {"ok": True})
            except (db.ValidationError, json.JSONDecodeError, UnicodeDecodeError) as e:
                self._json(400, {"erro": str(e)})
            except Exception as e:  # erro inesperado de banco
                self._json(500, {"erro": f"falha ao gravar: {e}"})

    srv = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    srv.vida = Vida()
    return srv


def achar_navegador(bases=None):
    """Edge ou Chrome (o Windows 10/11 já traz o Edge). Devolve o caminho do executável ou None."""
    if bases is None:
        bases = [os.environ.get(v) for v in ("ProgramFiles(x86)", "ProgramFiles", "LocalAppData")]
    rel = [r"Microsoft\Edge\Application\msedge.exe", r"Google\Chrome\Application\chrome.exe",
           r"BraveSoftware\Brave-Browser\Application\brave.exe"]
    for b in bases:
        if not b:
            continue
        for r in rel:
            p = Path(b) / Path(*r.split("\\"))
            if p.is_file():
                return str(p)
    return None


def abrir_janela(url, navegador=None):
    """Abre como aplicativo (sem barra de endereço). Sem Edge/Chrome, usa o navegador padrão."""
    exe = navegador if navegador is not None else achar_navegador()
    if exe:
        try:
            subprocess.Popen([exe, f"--app={url}", "--window-size=1180,820"])
            return True
        except OSError:
            pass
    webbrowser.open(url)
    return False


def _arquivo_instancia() -> Path:
    return db.data_dir() / "instancia.json"


def instancia_ativa():
    """Se já há um Focus Cofre aberto, devolve o endereço dele."""
    try:
        d = json.loads(_arquivo_instancia().read_text(encoding="utf-8"))
        url = f"http://127.0.0.1:{int(d['port'])}/"
        with urllib.request.urlopen(url + "api/health", timeout=1.5) as r:
            if json.loads(r.read()).get("app") == "focus-cofre":
                return url
    except Exception:
        pass
    return None


def mostrar_erro(texto):
    try:
        with open(db.data_dir() / "erro.log", "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S") + "\n" + texto + "\n\n")
    except Exception:
        pass
    if sys.platform == "win32":
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(0, texto[:900] + "\n\nDetalhes em: " + str(db.data_dir() / "erro.log"), APP_NOME, 0x10)
        except Exception:
            pass
    else:
        print(texto, file=sys.stderr)


def _vigiar(srv):
    ultima = time.time()
    while not srv.vida.fim.is_set():
        time.sleep(5)
        agora = time.time()
        if srv.vida.verificar(agora, ultima):
            srv.vida.fim.set()
        ultima = agora


def executar(args):
    forcar_browser = "--browser" in args
    if "--novo" not in args:
        url = instancia_ativa()
        if url:  # já está aberto: só traz uma janela
            return webbrowser.open(url) if forcar_browser else abrir_janela(url)
    token = secrets.token_urlsafe(24)
    try:
        db.daily_backup()
    except Exception as e:
        print("Aviso: backup diário falhou:", e)
    db.connect().close()
    srv = make_server(token)
    url = f"http://127.0.0.1:{srv.server_address[1]}/"
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    threading.Thread(target=_vigiar, args=(srv,), daemon=True).start()
    try:
        _arquivo_instancia().write_text(json.dumps({"port": srv.server_address[1], "pid": os.getpid()}), encoding="utf-8")
    except OSError:
        pass
    try:
        webview = None
        if not forcar_browser and "--janela" not in args:
            try:
                import webview
            except ImportError:
                webview = None
        if webview is not None:
            webview.create_window(APP_NOME, url, width=1180, height=820, min_size=(420, 600))
            webview.start()
        else:
            if forcar_browser:
                webbrowser.open(url)
            else:
                abrir_janela(url)
            print(f"{APP_NOME} aberto em {url}  (feche a janela ou use Ctrl+C para sair)")
            try:
                srv.vida.fim.wait()
            except KeyboardInterrupt:
                pass
    finally:
        try:
            _arquivo_instancia().unlink()
        except OSError:
            pass
        srv.shutdown()


def main():
    try:
        executar(sys.argv[1:])
    except Exception:
        mostrar_erro("O Focus Cofre não conseguiu abrir.\n\n" + traceback.format_exc())
        sys.exit(1)


if __name__ == "__main__":
    main()
