"""Servidor de mentira da API do Claude, só para testes. Registra o que recebeu."""
import json, threading
from http.server import BaseHTTPRequestHandler, HTTPServer

class Fake:
    def __init__(self, modo="ferramenta"):
        self.modo = modo
        self.requisicoes = []
        fake = self

        class H(BaseHTTPRequestHandler):
            def log_message(self, *a): pass
            def do_POST(self):
                n = int(self.headers.get("Content-Length", "0"))
                corpo = json.loads(self.rfile.read(n))
                fake.requisicoes.append({"path": self.path, "headers": {k.lower(): v for k, v in self.headers.items()}, "corpo": corpo})
                if fake.modo == "401":
                    return self._out(401, {"type": "error", "error": {"type": "authentication_error", "message": "invalid x-api-key"}})
                ultimo = corpo["messages"][-1]
                tem_resultado = isinstance(ultimo["content"], list) and any(b.get("type") == "tool_result" for b in ultimo["content"])
                if fake.modo == "ferramenta" and not tem_resultado and corpo.get("tools"):
                    content = [{"type": "thinking", "thinking": "", "signature": "assinatura-xyz"},
                               {"type": "tool_use", "id": "tu_1", "name": "visao_geral", "input": {}}]
                    stop = "tool_use"
                else:
                    content = [{"type": "text", "text": "Resposta final do coach.\nSegunda linha."}]
                    stop = "end_turn"
                self._out(200, {"id": "msg_1", "type": "message", "role": "assistant", "model": corpo["model"], "content": content,
                                "stop_reason": stop, "stop_sequence": None,
                                "usage": {"input_tokens": 10, "output_tokens": 5}})
            def _out(self, code, obj):
                b = json.dumps(obj).encode()
                self.send_response(code); self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)

        self.srv = HTTPServer(("127.0.0.1", 0), H)
        self.url = f"http://127.0.0.1:{self.srv.server_address[1]}"
        threading.Thread(target=self.srv.serve_forever, daemon=True).start()

    def parar(self):
        self.srv.shutdown()
