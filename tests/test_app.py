import json, os, sys, tempfile, threading, time, unittest, urllib.request, urllib.error
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ["COFRE_DATA_DIR"] = tempfile.mkdtemp()
import db, app

STATE = {
    "renda": [{"id": "r1", "nome": "Salário", "cat": "Salário", "valor": 2400.10, "moeda": "EUR"}],
    "lanc": [{"id": "l1", "data": "2026-11-05", "desc": "Mercado", "cat": "Mercado", "valor": 19.99, "tipo": "d", "rec": False},
             {"id": "l2", "data": "2026-11-02", "desc": "DAS", "cat": "Impostos e taxas", "valor": 80, "tipo": "d", "rec": True, "moeda": "BRL"}],
    "subs": [{"id": "s1", "nome": "IA", "valor": 20, "dia": 5, "ativa": True, "cat": "IA e APIs", "desde": "2026-10", "horas": 7.5}],
    "projetos": [{"id": "p1", "cliente": "Alfa", "desc": "Site", "valor": 900, "status": "entregue", "previsto": "2026-11-20", "pago": ""}],
    "metas": [{"id": "m1", "nome": "PC", "alvo": 1500, "guardado": 400, "prazo": "2027-09"}],
    "carteira": [{"id": "c1", "nome": "ETF", "classe": "Ações e ETFs", "aplicado": 900, "atual": 985.5}],
    "contas": [{"id": "k1", "nome": "Conta corrente", "tipo": "caixa", "moeda": "EUR", "saldo": 900.5, "atualizado": "2026-11-20"}],
    "movs": [{"id": "v1", "data": "2026-11-20", "de": "k1", "para": "", "valor": 50, "obs": "teste"}],
    "dividas": [{"id": "d1", "nome": "Cartão", "saldo": 1400, "inicial": 1800, "juros": 19.9, "minimo": 80}],
    "checkins": [{"id": "ck1", "data": "2026-11-20"}],
    "limites": {"Mercado": 300}, "cfg": {"taxa": 5, "perfil": "moderado"}}


class DbTests(unittest.TestCase):
    def test_roundtrip_and_cents(self):
        con = db.connect(os.path.join(os.environ["COFRE_DATA_DIR"], "t1.db"))
        db.save_state(con, STATE)
        out = db.load_state(con)
        self.assertEqual(out["renda"][0]["valor"], 2400.10)
        self.assertEqual(out["lanc"][0]["valor"] in (19.99, 80), True)
        self.assertEqual(out["limites"], {"Mercado": 300.0})
        self.assertTrue(any(x["rec"] for x in out["lanc"]))
        self.assertEqual(out["cfg"]["perfil"], "moderado")

    def test_invalid_rolls_back(self):
        con = db.connect(os.path.join(os.environ["COFRE_DATA_DIR"], "t2.db"))
        db.save_state(con, STATE)
        bad = json.loads(json.dumps(STATE)); bad["lanc"][0]["tipo"] = "x"
        with self.assertRaises(db.ValidationError):
            db.save_state(con, bad)
        self.assertEqual(len(db.load_state(con)["lanc"]), 2)

    def test_projetos_horas_and_migration(self):
        import sqlite3
        path = os.path.join(os.environ["COFRE_DATA_DIR"], "old.db")
        old = sqlite3.connect(path)
        old.execute("CREATE TABLE subs (id TEXT PRIMARY KEY, nome TEXT NOT NULL, cents INTEGER NOT NULL, dia INTEGER NOT NULL, ativa INTEGER NOT NULL, cat TEXT NOT NULL, desde TEXT NOT NULL)")
        old.execute("INSERT INTO subs VALUES ('x','Antiga',1000,5,1,'Contas','2026-01')")
        old.commit(); old.close()
        con = db.connect(path)  # migra sem perder dados
        self.assertEqual(db.load_state(con)["subs"][0]["horas"], 0.0)
        db.save_state(con, STATE)
        out = db.load_state(con)
        self.assertEqual(out["subs"][0]["horas"], 7.5)
        self.assertEqual(out["projetos"][0]["valor"], 900.0)
        self.assertEqual(out["projetos"][0]["moeda"], "EUR")
        self.assertEqual(sorted(l["moeda"] for l in out["lanc"]), ["BRL", "EUR"])
        bad2 = json.loads(json.dumps(STATE)); bad2["renda"][0]["moeda"] = "GBP"
        with self.assertRaises(db.ValidationError):
            db.save_state(con, bad2)
        bad = json.loads(json.dumps(STATE)); bad["projetos"][0]["status"] = "xx"
        with self.assertRaises(db.ValidationError):
            db.save_state(con, bad)

    def test_novas_entidades_e_campos(self):
        con = db.connect(os.path.join(os.environ["COFRE_DATA_DIR"], "t3.db"))
        st = json.loads(json.dumps(STATE))
        st["renda"][0].update(pagas=14, cambio=0)
        st["lanc"][1].update(cambio=5.9, fim="2026-12")
        st["subs"][0].update(pausadaDesde="2026-11")
        st["carteira"][0]["moeda"] = "BRL"
        st["projetos"][0]["status"] = "perdido"
        db.save_state(con, st)
        out = db.load_state(con)
        self.assertEqual(out["renda"][0]["pagas"], 14)
        self.assertEqual(sorted(l["fim"] for l in out["lanc"]), ["", "2026-12"])
        self.assertEqual(out["subs"][0]["pausadaDesde"], "2026-11")
        self.assertEqual(out["carteira"][0]["moeda"], "BRL")
        self.assertEqual(out["projetos"][0]["status"], "perdido")
        self.assertEqual(out["contas"][0]["saldo"], 900.5)
        self.assertEqual(out["dividas"][0]["inicial"], 1800.0)
        self.assertEqual(out["checkins"][0]["data"], "2026-11-20")
        st["checkins"][0]["snap"] = {"pat": 5410.5, "caixa": 900}
        db.save_state(con, st)
        self.assertEqual(db.load_state(con)["checkins"][0]["snap"]["pat"], 5410.5)
        bad3 = json.loads(json.dumps(st)); bad3["checkins"][0]["snap"] = {"pat": "abc"}
        with self.assertRaises(db.ValidationError):
            db.save_state(con, bad3)
        bad = json.loads(json.dumps(st)); bad["contas"][0]["tipo"] = "xx"
        with self.assertRaises(db.ValidationError):
            db.save_state(con, bad)

    def test_migra_projetos_com_check(self):
        import sqlite3
        path = os.path.join(os.environ["COFRE_DATA_DIR"], "old2.db")
        o = sqlite3.connect(path)
        o.execute("CREATE TABLE projetos (id TEXT PRIMARY KEY, cliente TEXT NOT NULL, descr TEXT NOT NULL, cents INTEGER NOT NULL, status TEXT NOT NULL CHECK (status IN ('proposta','andamento','entregue','pago')), previsto TEXT NOT NULL DEFAULT '', pago TEXT NOT NULL DEFAULT '')")
        o.execute("INSERT INTO projetos VALUES ('p','Alfa','Site',90000,'pago','','2026-10-01')")
        o.commit(); o.close()
        con = db.connect(path)
        con.execute("INSERT INTO projetos (id,cliente,descr,cents,status) VALUES ('q','B','x',100,'perdido')")
        self.assertEqual(con.execute("SELECT COUNT(*) FROM projetos").fetchone()[0], 2)
        self.assertEqual(db.load_state(con)["projetos"][0]["moeda"], "EUR")

    def test_settings_backup_dir(self):
        d = tempfile.mkdtemp()
        db.save_settings({"backup_dir": d})
        db.connect().close()
        dest = db.daily_backup()
        self.assertTrue((__import__("pathlib").Path(d) / dest.name).exists())
        with self.assertRaises(db.ValidationError):
            db.save_settings({"backup_dir": "/pasta/que/nao/existe"})

    def test_usd_e_conta_vinculada(self):
        con = db.connect(os.path.join(os.environ["COFRE_DATA_DIR"], "t5.db"))
        st = json.loads(json.dumps(STATE))
        st["lanc"][0].update(moeda="USD", cambio=1.1, conta="k1")
        db.save_state(con, st)
        out = db.load_state(con)
        l = [z for z in out["lanc"] if z["id"] == "l1"][0]
        self.assertEqual((l["moeda"], l["conta"], l["cambio"]), ("USD", "k1", 1.1))
        st["lanc"][0]["moeda"] = "GBP"
        with self.assertRaises(db.ValidationError):
            db.save_state(con, st)

    def test_restaurar_backup(self):
        d = tempfile.mkdtemp()
        old = os.environ["COFRE_DATA_DIR"]
        os.environ["COFRE_DATA_DIR"] = d
        try:
            con = db.connect()
            db.save_state(con, STATE)
            con.close()
            bk = db.daily_backup()
            con = db.connect()
            alterado = json.loads(json.dumps(STATE)); alterado["contas"][0]["saldo"] = 1.0
            db.save_state(con, alterado)
            con.close()
            self.assertEqual(db.list_backups()[0]["name"], bk.name)
            seguranca = db.restore_backup(bk.name)
            con = db.connect()
            self.assertEqual(db.load_state(con)["contas"][0]["saldo"], 900.5)
            con.close()
            self.assertTrue((db.data_dir() / "backups" / seguranca).exists())
            for ruim in ("../cofre.db", "cofre-2020-01-01.db", "x.db", ""):
                with self.assertRaises(db.ValidationError):
                    db.restore_backup(ruim)
        finally:
            os.environ["COFRE_DATA_DIR"] = old

    def test_canal(self):
        con = db.connect(os.path.join(os.environ["COFRE_DATA_DIR"], "t6.db"))
        st = json.loads(json.dumps(STATE))
        st["canais"] = [{"id": "cv1", "nome": "XP Joga", "plataforma": "YouTube", "url": ""}]
        st["metricas"] = [{"id": "m1", "canal": "cv1", "data": "2026-11-14", "dados": {"subs": 196, "horas": 590.5}}]
        st["receitasCanal"] = [{"id": "r1", "canal": "cv1", "data": "2026-11-20", "fonte": "AdSense (anúncios)",
                                "valor": 12.34, "moeda": "USD", "cambio": 1.08, "obs": ""}]
        db.save_state(con, st)
        out = db.load_state(con)
        self.assertEqual(out["canais"][0]["nome"], "XP Joga")
        self.assertEqual(out["metricas"][0]["dados"]["horas"], 590.5)
        self.assertEqual((out["receitasCanal"][0]["valor"], out["receitasCanal"][0]["moeda"]), (12.34, "USD"))
        bad = json.loads(json.dumps(st)); bad["metricas"][0]["dados"] = {"subs": "abc"}
        with self.assertRaises(db.ValidationError):
            db.save_state(con, bad)

    def test_backup(self):
        db.connect().close()
        self.assertTrue(db.daily_backup().exists())


class LlmTests(unittest.TestCase):
    def setUp(self):
        from fake_anthropic import Fake
        self.Fake = Fake
        self.dir = tempfile.mkdtemp()
        self.old = os.environ.get("COFRE_DATA_DIR")
        os.environ["COFRE_DATA_DIR"] = self.dir
        db.connect().close()

    def tearDown(self):
        os.environ["COFRE_DATA_DIR"] = self.old
        os.environ.pop("COFRE_LLM_BASE_URL", None)

    def _servidor(self, fake):
        os.environ["COFRE_LLM_BASE_URL"] = fake.url
        srv = app.make_server("t", os.path.join(self.dir, "cofre.db"))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        self.addCleanup(srv.shutdown)
        self.addCleanup(fake.parar)
        return f"http://127.0.0.1:{srv.server_address[1]}"

    def _req(self, base, path, metodo="GET", corpo=None):
        r = urllib.request.Request(base + path, method=metodo, data=None if corpo is None else json.dumps(corpo).encode())
        r.add_header("X-Cofre-Token", "t"); r.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(r) as f: return f.status, json.loads(f.read())
        except urllib.error.HTTPError as e:
            return e.code, json.loads(e.read())

    def test_sem_chave(self):
        base = self._servidor(self.Fake())
        c, j = self._req(base, "/api/llm", "POST", {"messages": [{"role": "user", "content": "oi"}]})
        self.assertEqual(c, 400); self.assertIn("chave", j["erro"])

    def test_chave_nunca_volta_para_o_navegador(self):
        base = self._servidor(self.Fake())
        c, j = self._req(base, "/api/settings", "PUT", {"llm_key": "sk-ant-segredo-123456", "llm_model": "claude-sonnet-5-5"})
        self.assertEqual(c, 200); self.assertTrue(j["llm_key_set"]); self.assertNotIn("segredo", json.dumps(j))
        c, j = self._req(base, "/api/settings")
        self.assertNotIn("segredo", json.dumps(j)); self.assertEqual(j["llm_model"], "claude-sonnet-5-5")
        c, j = self._req(base, "/api/settings", "PUT", {"llm_model": "gpt-4"})
        self.assertEqual(c, 400)
        c, j = self._req(base, "/api/settings", "PUT", {"llm_key": ""})
        self.assertFalse(j["llm_key_set"])

    def test_chamada_com_sdk_oficial(self):
        fake = self.Fake()
        base = self._servidor(fake)
        db.save_settings({"llm_key": "sk-ant-teste-123456"})
        tools = [{"name": "visao_geral", "description": "d", "input_schema": {"type": "object", "properties": {}}}]
        c, j = self._req(base, "/api/llm", "POST", {"system": "sistema", "tools": tools, "effort": "medium",
                                                     "messages": [{"role": "user", "content": "como estou?"}]})
        self.assertEqual(c, 200)
        self.assertEqual(j["stop_reason"], "tool_use")
        tipos = [b["type"] for b in j["content"]]
        self.assertEqual(tipos, ["thinking", "tool_use"])
        self.assertEqual(j["content"][0]["signature"], "assinatura-xyz")  # bloco de raciocínio volta intacto
        req = fake.requisicoes[0]
        self.assertTrue(req["path"].startswith("/v1/messages"))
        self.assertEqual(req["headers"]["authorization"], "Bearer sk-ant-teste-123456")
        self.assertIn("server-side-fallback-2026-07-01", req["headers"].get("anthropic-beta", ""))
        b = req["corpo"]
        self.assertEqual(b["model"], "claude-opus-5-5")
        self.assertEqual(b["fallbacks"], "default")
        self.assertEqual(b["output_config"]["effort"], "medium")
        self.assertEqual(b["system"], "sistema")
        self.assertEqual(b["tools"][0]["name"], "visao_geral")
        self.assertNotIn("temperature", b); self.assertNotIn("thinking", b)
        self.assertGreaterEqual(b["max_tokens"], 16000)

    def test_haiku_sem_fallback_e_erro_401(self):
        fake = self.Fake(modo="texto")
        base = self._servidor(fake)
        db.save_settings({"llm_key": "sk-ant-teste-123456", "llm_model": "claude-haiku-5-5"})
        c, j = self._req(base, "/api/llm", "POST", {"messages": [{"role": "user", "content": "oi"}]})
        self.assertEqual(c, 200)
        self.assertNotIn("fallbacks", fake.requisicoes[0]["corpo"])
        fake.modo = "401"
        c, j = self._req(base, "/api/llm", "POST", {"messages": [{"role": "user", "content": "oi"}]})
        self.assertEqual(c, 401); self.assertIn("recusada", j["erro"])

    def test_validacao_do_pedido(self):
        base = self._servidor(self.Fake())
        db.save_settings({"llm_key": "sk-ant-teste-123456"})
        for ruim in ({"messages": []}, {"messages": [{"role": "system", "content": "x"}]},
                     {"messages": [{"role": "user", "content": "x"}], "effort": "ultra"},
                     {"messages": [{"role": "user", "content": "x"}], "tools": [{"name": 1}]}):
            c, j = self._req(base, "/api/llm", "POST", ruim)
            self.assertEqual(c, 400, ruim)


class VidaEJanelaTests(unittest.TestCase):
    def test_encerra_depois_que_a_janela_fecha(self):
        v = app.Vida()
        t0 = time.time()
        self.assertFalse(v.verificar(t0 + 10))
        v.bye()
        self.assertFalse(v.verificar(t0 + 10))                       # ainda na tolerância (aguenta recarregar)
        self.assertTrue(v.verificar(t0 + app.BYE_TOLERANCIA + 5))    # passou a tolerância sem novo sinal
        v.bye(); v.ping()                                             # a página recarregou e voltou
        self.assertFalse(v.verificar(t0 + app.BYE_TOLERANCIA + 5))

    def test_sem_sinal_de_vida_so_encerra_depois_de_ver_a_pagina(self):
        v = app.Vida()
        self.assertFalse(v.verificar(time.time() + app.SEM_PING_LIMITE + 10))  # nunca abriu: não encerra
        v.ping()
        self.assertTrue(v.verificar(time.time() + app.SEM_PING_LIMITE + 10))

    def test_computador_dormindo_nao_conta_como_janela_fechada(self):
        v = app.Vida(); v.ping()
        agora = time.time() + app.SEM_PING_LIMITE + 500
        self.assertFalse(v.verificar(agora, ultima_checagem=agora - 1000))  # salto grande de tempo = suspensão

    def test_achar_navegador(self):
        raiz = tempfile.mkdtemp()
        self.assertIsNone(app.achar_navegador([raiz]))
        exe = os.path.join(raiz, "Microsoft", "Edge", "Application", "msedge.exe")
        os.makedirs(os.path.dirname(exe)); open(exe, "w").close()
        self.assertEqual(app.achar_navegador([None, raiz]), exe)

    def test_ping_e_bye_exigem_token(self):
        srv = app.make_server("tk", os.path.join(tempfile.mkdtemp(), "x.db"))
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        self.addCleanup(srv.shutdown)
        base = f"http://127.0.0.1:{srv.server_address[1]}"
        def chamar(path, metodo="GET"):
            try:
                with urllib.request.urlopen(urllib.request.Request(base + path, method=metodo, data=b"" if metodo == "POST" else None)) as f:
                    return f.status
            except urllib.error.HTTPError as e:
                return e.code
        self.assertEqual(chamar("/api/ping"), 401)
        self.assertEqual(chamar("/api/ping?t=errado"), 401)
        self.assertEqual(chamar("/api/ping?t=tk"), 200)
        self.assertEqual(chamar("/api/bye?t=errado", "POST"), 401)
        self.assertIsNone(srv.vida.bye_em)
        self.assertEqual(chamar("/api/bye?t=tk", "POST"), 200)
        self.assertIsNotNone(srv.vida.bye_em)
        self.assertEqual(chamar("/api/ping?t=tk"), 200)
        self.assertIsNone(srv.vida.bye_em)                           # a página voltou: cancela o encerramento

    def test_instancia_unica(self):
        d = tempfile.mkdtemp(); antigo = os.environ["COFRE_DATA_DIR"]; os.environ["COFRE_DATA_DIR"] = d
        try:
            self.assertIsNone(app.instancia_ativa())
            srv = app.make_server("tk", os.path.join(d, "cofre.db"))
            threading.Thread(target=srv.serve_forever, daemon=True).start()
            self.addCleanup(srv.shutdown)
            app._arquivo_instancia().write_text(json.dumps({"port": srv.server_address[1]}))
            self.assertEqual(app.instancia_ativa(), f"http://127.0.0.1:{srv.server_address[1]}/")
            app._arquivo_instancia().write_text(json.dumps({"port": 1}))   # processo morto
            self.assertIsNone(app.instancia_ativa())
        finally:
            os.environ["COFRE_DATA_DIR"] = antigo

    def test_pasta_antiga_continua_valendo(self):
        raiz = tempfile.mkdtemp(); antigo = os.environ.pop("COFRE_DATA_DIR"); xdg = os.environ.get("XDG_DATA_HOME")
        os.environ["XDG_DATA_HOME"] = raiz
        try:
            self.assertTrue(str(db.data_dir()).endswith("focuscofre"))
            os.rmdir(db.data_dir()); os.makedirs(os.path.join(raiz, "cronocofre"))
            self.assertTrue(str(db.data_dir()).endswith("cronocofre"))   # quem já tinha dados não os perde
        finally:
            os.environ["COFRE_DATA_DIR"] = antigo
            if xdg is None: os.environ.pop("XDG_DATA_HOME", None)
            else: os.environ["XDG_DATA_HOME"] = xdg


class ApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.token = "tok123"
        cls.srv = app.make_server(cls.token, os.path.join(os.environ["COFRE_DATA_DIR"], "api.db"))
        cls.base = f"http://127.0.0.1:{cls.srv.server_address[1]}"
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()

    def req(self, path, method="GET", body=None, token=None, host=None):
        r = urllib.request.Request(self.base + path, method=method, data=None if body is None else json.dumps(body).encode())
        if token: r.add_header("X-Cofre-Token", token)
        if host: r.add_header("Host", host)
        try:
            with urllib.request.urlopen(r) as f: return f.status, f.read()
        except urllib.error.HTTPError as e:
            return e.code, e.read()

    def test_token_required(self):
        self.assertEqual(self.req("/api/state")[0], 401)
        self.assertEqual(self.req("/api/state", token="x")[0], 401)

    def test_foreign_host_blocked(self):
        self.assertEqual(self.req("/api/state", token=self.token, host="evil.com")[0], 403)

    def test_put_get(self):
        self.assertEqual(self.req("/api/state", "PUT", STATE, self.token)[0], 200)
        code, b = self.req("/api/state", token=self.token)
        self.assertEqual(json.loads(b)["metas"][0]["alvo"], 1500)
        bad = dict(STATE, lanc=[{"id": "z", "data": "2026-11-01", "desc": "a", "cat": "b", "valor": "abc", "tipo": "d"}])
        self.assertEqual(self.req("/api/state", "PUT", bad, self.token)[0], 400)

    def test_index_has_token(self):
        code, b = self.req("/")
        self.assertIn(b'content="tok123"', b)
        self.assertTrue(b.lower().startswith(b"<!doctype html>"))


if __name__ == "__main__":
    unittest.main()
