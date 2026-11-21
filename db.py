"""Banco de dados local (SQLite) do Focus Cofre.

Valores em dinheiro são guardados em centavos (inteiros) para evitar erros de
arredondamento. O front-end troca o estado inteiro em JSON; aqui ele é
validado e gravado em tabelas de verdade, dentro de uma transação.
"""
import json
import os
import shutil
import sqlite3
import sys
from datetime import date
from pathlib import Path

SCHEMA_VERSION = 7
LLM_MODELOS = {"claude-opus-5-5": "Claude Opus 5.5", "claude-sonnet-5-5": "Claude Sonnet 5.5",
               "claude-haiku-5-5": "Claude Haiku 5.5", "claude-fable-5-2": "Claude Fable 5.2"}
LLM_PADRAO = "claude-opus-5-5"
STATUS_PROJETO = ("proposta", "andamento", "entregue", "pago", "perdido")
TIPOS_CONTA = ("caixa", "reserva", "mei", "outra")


def data_dir() -> Path:
    env = os.environ.get("COFRE_DATA_DIR")
    if env:
        base = Path(env)
    else:
        if sys.platform == "win32":
            raiz = Path(os.environ.get("APPDATA", Path.home()))
            novo, antigo = raiz / "FocusCofre", raiz / "CronoCofre"
        else:
            raiz = Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share"))
            novo, antigo = raiz / "focuscofre", raiz / "cronocofre"
        base = antigo if (not novo.exists() and antigo.exists()) else novo  # mantém quem já usava o nome antigo
    base.mkdir(parents=True, exist_ok=True)
    return base


def db_path() -> Path:
    return data_dir() / "cofre.db"


SCHEMA = """
CREATE TABLE IF NOT EXISTS meta (chave TEXT PRIMARY KEY, valor TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS renda (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, cat TEXT NOT NULL, cents INTEGER NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'EUR', cambio REAL NOT NULL DEFAULT 0, pagas INTEGER NOT NULL DEFAULT 12);
CREATE TABLE IF NOT EXISTS lanc (
  id TEXT PRIMARY KEY, data TEXT NOT NULL, descr TEXT NOT NULL, cat TEXT NOT NULL,
  cents INTEGER NOT NULL, tipo TEXT NOT NULL CHECK (tipo IN ('d','r')), rec INTEGER NOT NULL DEFAULT 0,
  moeda TEXT NOT NULL DEFAULT 'EUR', cambio REAL NOT NULL DEFAULT 0, fim TEXT NOT NULL DEFAULT '',
  conta TEXT NOT NULL DEFAULT '');
CREATE INDEX IF NOT EXISTS idx_lanc_data ON lanc(data);
CREATE TABLE IF NOT EXISTS subs (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, cents INTEGER NOT NULL, dia INTEGER NOT NULL,
  ativa INTEGER NOT NULL, cat TEXT NOT NULL, desde TEXT NOT NULL, horas_x10 INTEGER NOT NULL DEFAULT 0,
  moeda TEXT NOT NULL DEFAULT 'EUR', cambio REAL NOT NULL DEFAULT 0, pausada_desde TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS metas (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, alvo_cents INTEGER NOT NULL,
  guardado_cents INTEGER NOT NULL, prazo TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS carteira (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, classe TEXT NOT NULL,
  aplicado_cents INTEGER NOT NULL, atual_cents INTEGER NOT NULL, moeda TEXT NOT NULL DEFAULT 'EUR');
CREATE TABLE IF NOT EXISTS projetos (
  id TEXT PRIMARY KEY, cliente TEXT NOT NULL, descr TEXT NOT NULL, cents INTEGER NOT NULL,
  status TEXT NOT NULL, previsto TEXT NOT NULL DEFAULT '', pago TEXT NOT NULL DEFAULT '',
  moeda TEXT NOT NULL DEFAULT 'EUR', cambio REAL NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS limites (cat TEXT PRIMARY KEY, cents INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS contas (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, tipo TEXT NOT NULL, moeda TEXT NOT NULL DEFAULT 'EUR',
  saldo_cents INTEGER NOT NULL, atualizado TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS movs (
  id TEXT PRIMARY KEY, data TEXT NOT NULL, de TEXT NOT NULL DEFAULT '', para TEXT NOT NULL DEFAULT '',
  cents INTEGER NOT NULL, obs TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS dividas (
  id TEXT PRIMARY KEY, nome TEXT NOT NULL, saldo_cents INTEGER NOT NULL, inicial_cents INTEGER NOT NULL,
  juros REAL NOT NULL DEFAULT 0, minimo_cents INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS canais (id TEXT PRIMARY KEY, nome TEXT NOT NULL, plataforma TEXT NOT NULL, url TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS metricas (id TEXT PRIMARY KEY, canal TEXT NOT NULL, data TEXT NOT NULL, dados TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS receitas_canal (
  id TEXT PRIMARY KEY, canal TEXT NOT NULL, data TEXT NOT NULL, fonte TEXT NOT NULL, cents INTEGER NOT NULL,
  moeda TEXT NOT NULL DEFAULT 'EUR', cambio REAL NOT NULL DEFAULT 0, obs TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS checkins (id TEXT PRIMARY KEY, data TEXT NOT NULL, snap TEXT NOT NULL DEFAULT '');
"""

# colunas adicionadas depois da primeira versão: (tabela, coluna, definição)
EXTRA_COLS = [
    ("subs", "horas_x10", "INTEGER NOT NULL DEFAULT 0"),
    ("renda", "moeda", "TEXT NOT NULL DEFAULT 'EUR'"),
    ("lanc", "moeda", "TEXT NOT NULL DEFAULT 'EUR'"),
    ("subs", "moeda", "TEXT NOT NULL DEFAULT 'EUR'"),
    ("projetos", "moeda", "TEXT NOT NULL DEFAULT 'EUR'"),
    ("renda", "cambio", "REAL NOT NULL DEFAULT 0"),
    ("renda", "pagas", "INTEGER NOT NULL DEFAULT 12"),
    ("lanc", "cambio", "REAL NOT NULL DEFAULT 0"),
    ("lanc", "fim", "TEXT NOT NULL DEFAULT ''"),
    ("subs", "cambio", "REAL NOT NULL DEFAULT 0"),
    ("subs", "pausada_desde", "TEXT NOT NULL DEFAULT ''"),
    ("projetos", "cambio", "REAL NOT NULL DEFAULT 0"),
    ("carteira", "moeda", "TEXT NOT NULL DEFAULT 'EUR'"),
    ("checkins", "snap", "TEXT NOT NULL DEFAULT ''"),
    ("lanc", "conta", "TEXT NOT NULL DEFAULT ''"),
]


class ValidationError(ValueError):
    pass


def _cols(con, t):
    return [r["name"] for r in con.execute(f"PRAGMA table_info({t})")]


def migrate(con) -> None:
    """Atualiza bancos criados por versões anteriores sem perder dados."""
    # projetos antigos tinham CHECK no status; refaz a tabela para aceitar 'perdido'
    row = con.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='projetos'").fetchone()
    if row and "CHECK" in (row["sql"] or "").upper():
        old = _cols(con, "projetos")
        con.execute("ALTER TABLE projetos RENAME TO projetos_old")
        con.execute("""CREATE TABLE projetos (
          id TEXT PRIMARY KEY, cliente TEXT NOT NULL, descr TEXT NOT NULL, cents INTEGER NOT NULL,
          status TEXT NOT NULL, previsto TEXT NOT NULL DEFAULT '', pago TEXT NOT NULL DEFAULT '',
          moeda TEXT NOT NULL DEFAULT 'EUR', cambio REAL NOT NULL DEFAULT 0)""")
        keep = [c for c in ("id", "cliente", "descr", "cents", "status", "previsto", "pago", "moeda") if c in old]
        cl = ",".join(keep)
        con.execute(f"INSERT INTO projetos ({cl}) SELECT {cl} FROM projetos_old")
        con.execute("DROP TABLE projetos_old")
    for t, c, ddl in EXTRA_COLS:
        if c not in _cols(con, t):
            con.execute(f"ALTER TABLE {t} ADD COLUMN {c} {ddl}")
    con.execute("INSERT OR REPLACE INTO meta VALUES ('schema_version', ?)", (str(SCHEMA_VERSION),))


def connect(path=None) -> sqlite3.Connection:
    con = sqlite3.connect(str(path or db_path()), timeout=10)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("PRAGMA foreign_keys=ON")
    con.executescript(SCHEMA)
    migrate(con)
    con.commit()
    return con


def moeda(v) -> str:
    m = str(v or "EUR").upper()
    if m not in ("EUR", "BRL", "USD"):
        raise ValidationError("moeda inválida")
    return m


def cents(v) -> int:
    try:
        f = float(v)
    except (TypeError, ValueError):
        raise ValidationError(f"valor inválido: {v!r}")
    if f != f or abs(f) > 1e12:
        raise ValidationError("valor fora do limite")
    return round(f * 100)


def num(v, default=0.0) -> float:
    try:
        f = float(v if v not in (None, "") else default)
    except (TypeError, ValueError):
        raise ValidationError(f"número inválido: {v!r}")
    if f != f or abs(f) > 1e9:
        raise ValidationError("número fora do limite")
    return f


def euros(c: int) -> float:
    return c / 100


def text(v, field, maxlen=200) -> str:
    if not isinstance(v, (str, int, float)):
        raise ValidationError(f"{field} inválido")
    s = str(v).strip()
    if not s:
        raise ValidationError(f"{field} vazio")
    return s[:maxlen]


def opt_text(v, maxlen=200) -> str:
    return str(v or "").strip()[:maxlen]


def month(v, field) -> str:
    s = str(v)
    if len(s) < 7 or s[4] != "-":
        raise ValidationError(f"{field} inválido")
    return s


def load_state(con) -> dict:
    cfg = {}
    row = con.execute("SELECT valor FROM meta WHERE chave='cfg'").fetchone()
    if row:
        cfg = json.loads(row["valor"])
    q = lambda sql: con.execute(sql)
    return {
        "renda": [dict(id=r["id"], nome=r["nome"], cat=r["cat"], valor=euros(r["cents"]), moeda=r["moeda"],
                       cambio=r["cambio"], pagas=r["pagas"]) for r in q("SELECT * FROM renda ORDER BY rowid")],
        "lanc": [dict(id=r["id"], data=r["data"], desc=r["descr"], cat=r["cat"], valor=euros(r["cents"]),
                      tipo=r["tipo"], rec=bool(r["rec"]), moeda=r["moeda"], cambio=r["cambio"], fim=r["fim"],
                      conta=r["conta"])
                 for r in q("SELECT * FROM lanc ORDER BY data, rowid")],
        "subs": [dict(id=r["id"], nome=r["nome"], valor=euros(r["cents"]), dia=r["dia"], ativa=bool(r["ativa"]),
                      cat=r["cat"], desde=r["desde"], horas=r["horas_x10"] / 10, moeda=r["moeda"],
                      cambio=r["cambio"], pausadaDesde=r["pausada_desde"]) for r in q("SELECT * FROM subs ORDER BY rowid")],
        "projetos": [dict(id=r["id"], cliente=r["cliente"], desc=r["descr"], valor=euros(r["cents"]),
                          status=r["status"], previsto=r["previsto"], pago=r["pago"], moeda=r["moeda"],
                          cambio=r["cambio"]) for r in q("SELECT * FROM projetos ORDER BY rowid")],
        "metas": [dict(id=r["id"], nome=r["nome"], alvo=euros(r["alvo_cents"]), guardado=euros(r["guardado_cents"]),
                       prazo=r["prazo"]) for r in q("SELECT * FROM metas ORDER BY rowid")],
        "carteira": [dict(id=r["id"], nome=r["nome"], classe=r["classe"], aplicado=euros(r["aplicado_cents"]),
                          atual=euros(r["atual_cents"]), moeda=r["moeda"]) for r in q("SELECT * FROM carteira ORDER BY rowid")],
        "contas": [dict(id=r["id"], nome=r["nome"], tipo=r["tipo"], moeda=r["moeda"], saldo=euros(r["saldo_cents"]),
                        atualizado=r["atualizado"]) for r in q("SELECT * FROM contas ORDER BY rowid")],
        "movs": [dict(id=r["id"], data=r["data"], de=r["de"], para=r["para"], valor=euros(r["cents"]), obs=r["obs"])
                 for r in q("SELECT * FROM movs ORDER BY data, rowid")],
        "dividas": [dict(id=r["id"], nome=r["nome"], saldo=euros(r["saldo_cents"]), inicial=euros(r["inicial_cents"]),
                         juros=r["juros"], minimo=euros(r["minimo_cents"])) for r in q("SELECT * FROM dividas ORDER BY rowid")],
        "canais": [dict(id=r["id"], nome=r["nome"], plataforma=r["plataforma"], url=r["url"])
                   for r in q("SELECT * FROM canais ORDER BY rowid")],
        "metricas": [dict(id=r["id"], canal=r["canal"], data=r["data"], dados=json.loads(r["dados"]))
                     for r in q("SELECT * FROM metricas ORDER BY data, rowid")],
        "receitasCanal": [dict(id=r["id"], canal=r["canal"], data=r["data"], fonte=r["fonte"], valor=euros(r["cents"]),
                               moeda=r["moeda"], cambio=r["cambio"], obs=r["obs"])
                          for r in q("SELECT * FROM receitas_canal ORDER BY data, rowid")],
        "checkins": [dict(id=r["id"], data=r["data"], snap=json.loads(r["snap"]) if r["snap"] else None)
                     for r in q("SELECT * FROM checkins ORDER BY data")],
        "limites": {r["cat"]: euros(r["cents"]) for r in q("SELECT * FROM limites")},
        "cfg": cfg,
        "demo": False,
    }


LIST_KEYS = ("renda", "lanc", "subs", "metas", "carteira", "projetos", "contas", "movs", "dividas", "checkins",
             "canais", "metricas", "receitasCanal")


def save_state(con, st: dict) -> None:
    """Valida tudo antes de gravar; grava numa única transação (tudo ou nada)."""
    if not isinstance(st, dict):
        raise ValidationError("estado inválido")
    L = {}
    for k in LIST_KEYS:
        v = st.get(k, [])
        if not isinstance(v, list) or len(v) > 200000 or not all(isinstance(x, dict) for x in v):
            raise ValidationError(f"{k} inválido")
        L[k] = v
    ident = lambda x: text(x.get("id"), "id", 40)

    renda = [(ident(x), text(x.get("nome"), "nome"), text(x.get("cat", "Salário"), "cat"), cents(x.get("valor")),
              moeda(x.get("moeda")), num(x.get("cambio")), 14 if int(num(x.get("pagas"), 12)) == 14 else 12)
             for x in L["renda"]]
    lanc = []
    for x in L["lanc"]:
        if x.get("tipo") not in ("d", "r"):
            raise ValidationError("tipo de lançamento inválido")
        lanc.append((ident(x), month(x.get("data"), "data")[:10], text(x.get("desc"), "descrição"),
                     text(x.get("cat"), "categoria"), cents(x.get("valor")), x["tipo"], 1 if x.get("rec") else 0,
                     moeda(x.get("moeda")), num(x.get("cambio")), opt_text(x.get("fim"), 7), opt_text(x.get("conta"), 40)))
    subs = [(ident(x), text(x.get("nome"), "nome"), cents(x.get("valor")), int(num(x.get("dia"), 1)),
             1 if x.get("ativa") else 0, text(x.get("cat", "Assinaturas pessoais"), "cat"),
             str(x.get("desde") or "0000-00"), round(num(x.get("horas")) * 10), moeda(x.get("moeda")),
             num(x.get("cambio")), opt_text(x.get("pausadaDesde"), 7)) for x in L["subs"]]
    projetos = []
    for x in L["projetos"]:
        if x.get("status") not in STATUS_PROJETO:
            raise ValidationError("status de projeto inválido")
        projetos.append((ident(x), text(x.get("cliente"), "cliente"), text(x.get("desc"), "projeto"),
                         cents(x.get("valor")), x["status"], opt_text(x.get("previsto"), 10), opt_text(x.get("pago"), 10),
                         moeda(x.get("moeda")), num(x.get("cambio"))))
    metas = [(ident(x), text(x.get("nome"), "nome"), cents(x.get("alvo")), cents(x.get("guardado", 0)),
              month(x.get("prazo"), "prazo")) for x in L["metas"]]
    carteira = [(ident(x), text(x.get("nome"), "nome"), text(x.get("classe"), "classe"), cents(x.get("aplicado")),
                 cents(x.get("atual")), moeda(x.get("moeda"))) for x in L["carteira"]]
    contas = []
    for x in L["contas"]:
        if x.get("tipo") not in TIPOS_CONTA:
            raise ValidationError("tipo de conta inválido")
        contas.append((ident(x), text(x.get("nome"), "nome"), x["tipo"], moeda(x.get("moeda")),
                       cents(x.get("saldo")), opt_text(x.get("atualizado"), 10)))
    movs = [(ident(x), month(x.get("data"), "data")[:10], opt_text(x.get("de"), 40), opt_text(x.get("para"), 40),
             cents(x.get("valor")), opt_text(x.get("obs"))) for x in L["movs"]]
    dividas = [(ident(x), text(x.get("nome"), "nome"), cents(x.get("saldo")), cents(x.get("inicial", x.get("saldo"))),
                num(x.get("juros")), cents(x.get("minimo", 0))) for x in L["dividas"]]
    checkins = []
    for x in L["checkins"]:
        snap = x.get("snap")
        if snap is not None:
            if not isinstance(snap, dict) or len(snap) > 12:
                raise ValidationError("foto do check-in inválida")
            snap = {str(k)[:20]: num(v) for k, v in snap.items()}
        checkins.append((ident(x), month(x.get("data"), "data")[:10], json.dumps(snap) if snap else ""))
    canais = [(ident(x), text(x.get("nome"), "nome"), text(x.get("plataforma"), "plataforma", 30), opt_text(x.get("url"))) for x in L["canais"]]
    metricas = []
    for x in L["metricas"]:
        dados = x.get("dados")
        if not isinstance(dados, dict) or len(dados) > 20:
            raise ValidationError("métricas inválidas")
        metricas.append((ident(x), text(x.get("canal"), "canal", 40), month(x.get("data"), "data")[:10],
                         json.dumps({str(k)[:20]: num(v) for k, v in dados.items()})))
    receitas = [(ident(x), text(x.get("canal"), "canal", 40), month(x.get("data"), "data")[:10], text(x.get("fonte"), "fonte"),
                 cents(x.get("valor")), moeda(x.get("moeda")), num(x.get("cambio")), opt_text(x.get("obs"))) for x in L["receitasCanal"]]
    lim = st.get("limites", {})
    if not isinstance(lim, dict):
        raise ValidationError("limites inválido")
    limites = [(text(k, "categoria"), cents(v)) for k, v in lim.items() if v]
    cfg = st.get("cfg", {})
    if not isinstance(cfg, dict):
        raise ValidationError("cfg inválido")
    cfg_json = json.dumps(cfg, ensure_ascii=False)

    con.execute("BEGIN IMMEDIATE")
    try:
        for t in ("renda", "lanc", "subs", "metas", "carteira", "projetos", "contas", "movs", "dividas",
                  "checkins", "canais", "metricas", "receitas_canal", "limites"):
            con.execute(f"DELETE FROM {t}")
        con.executemany("INSERT INTO renda (id,nome,cat,cents,moeda,cambio,pagas) VALUES (?,?,?,?,?,?,?)", renda)
        con.executemany("INSERT INTO lanc (id,data,descr,cat,cents,tipo,rec,moeda,cambio,fim,conta) VALUES (?,?,?,?,?,?,?,?,?,?,?)", lanc)
        con.executemany("INSERT INTO subs (id,nome,cents,dia,ativa,cat,desde,horas_x10,moeda,cambio,pausada_desde) VALUES (?,?,?,?,?,?,?,?,?,?,?)", subs)
        con.executemany("INSERT INTO projetos (id,cliente,descr,cents,status,previsto,pago,moeda,cambio) VALUES (?,?,?,?,?,?,?,?,?)", projetos)
        con.executemany("INSERT INTO metas VALUES (?,?,?,?,?)", metas)
        con.executemany("INSERT INTO carteira (id,nome,classe,aplicado_cents,atual_cents,moeda) VALUES (?,?,?,?,?,?)", carteira)
        con.executemany("INSERT INTO contas (id,nome,tipo,moeda,saldo_cents,atualizado) VALUES (?,?,?,?,?,?)", contas)
        con.executemany("INSERT INTO movs (id,data,de,para,cents,obs) VALUES (?,?,?,?,?,?)", movs)
        con.executemany("INSERT INTO dividas (id,nome,saldo_cents,inicial_cents,juros,minimo_cents) VALUES (?,?,?,?,?,?)", dividas)
        con.executemany("INSERT INTO checkins (id,data,snap) VALUES (?,?,?)", checkins)
        con.executemany("INSERT INTO canais (id,nome,plataforma,url) VALUES (?,?,?,?)", canais)
        con.executemany("INSERT INTO metricas (id,canal,data,dados) VALUES (?,?,?,?)", metricas)
        con.executemany("INSERT INTO receitas_canal (id,canal,data,fonte,cents,moeda,cambio,obs) VALUES (?,?,?,?,?,?,?,?)", receitas)
        con.executemany("INSERT INTO limites VALUES (?,?)", limites)
        con.execute("INSERT OR REPLACE INTO meta VALUES ('cfg', ?)", (cfg_json,))
        con.execute("COMMIT")
    except Exception:
        con.execute("ROLLBACK")
        raise


# ---------- configurações do app (fora do banco financeiro) ----------
def settings_path() -> Path:
    return data_dir() / "settings.json"


def load_settings() -> dict:
    try:
        return json.loads(settings_path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def save_settings(new: dict) -> dict:
    cur = load_settings()
    if "backup_dir" in new:
        d = str(new["backup_dir"] or "").strip()
        if d:
            p = Path(d).expanduser()
            if not p.is_dir():
                raise ValidationError("a pasta de backup não existe")
            try:
                probe = p / ".focuscofre-teste"
                probe.write_text("ok")
                probe.unlink()
            except OSError:
                raise ValidationError("sem permissão para gravar nessa pasta")
            cur["backup_dir"] = str(p)
        else:
            cur.pop("backup_dir", None)
    if "llm_key" in new:
        k = str(new["llm_key"] or "").strip()
        if k:
            if len(k) < 8 or len(k) > 300 or any(c.isspace() for c in k):
                raise ValidationError("chave da API inválida")
            cur["llm_key"] = k
        else:
            cur.pop("llm_key", None)
    if "llm_model" in new:
        if new["llm_model"] not in LLM_MODELOS:
            raise ValidationError("modelo inválido")
        cur["llm_model"] = new["llm_model"]
    p = settings_path()
    p.write_text(json.dumps(cur, ensure_ascii=False), encoding="utf-8")
    try:
        os.chmod(p, 0o600)  # só o seu usuário lê (no Windows, vale a permissão da pasta do usuário)
    except OSError:
        pass
    return cur


def public_settings() -> dict:
    """Configurações que o navegador pode ver (nunca a chave da API)."""
    s = load_settings()
    return {"backup_dir": s.get("backup_dir", ""), "llm_key_set": bool(s.get("llm_key")),
            "llm_model": s.get("llm_model") if s.get("llm_model") in LLM_MODELOS else LLM_PADRAO,
            "llm_modelos": LLM_MODELOS}


def daily_backup(keep=14) -> Path | None:
    """Copia o banco uma vez por dia para a pasta backups (e para a pasta extra, se configurada)."""
    src = db_path()
    if not src.exists():
        return None
    bdir = data_dir() / "backups"
    bdir.mkdir(exist_ok=True)
    dest = bdir / f"cofre-{date.today().isoformat()}.db"
    if not dest.exists():
        s = sqlite3.connect(str(src))
        d = sqlite3.connect(str(dest))
        with d:
            s.backup(d)
        s.close()
        d.close()
    for old in sorted(bdir.glob("cofre-*.db"))[:-keep]:
        old.unlink(missing_ok=True)
    extra = load_settings().get("backup_dir")
    if extra and Path(extra).is_dir():
        try:
            shutil.copy2(dest, Path(extra) / dest.name)
        except OSError:
            pass
    return dest


# ---------- restaurar backup ----------
import re as _re
import time as _time
_BK = _re.compile(r"^cofre-\d{4}-\d{2}-\d{2}\.db$")


def list_backups() -> list:
    bdir = data_dir() / "backups"
    if not bdir.is_dir():
        return []
    out = []
    for f in sorted(bdir.glob("cofre-*.db"), reverse=True):
        if _BK.match(f.name):
            st = f.stat()
            out.append({"name": f.name, "size": st.st_size, "data": f.name[6:16]})
    return out


def restore_backup(name: str) -> str:
    """Restaura um backup diário. Antes, guarda uma cópia de segurança do banco atual."""
    if not _BK.match(str(name or "")):
        raise ValidationError("nome de backup inválido")
    bdir = data_dir() / "backups"
    src_path = bdir / name
    if not src_path.is_file():
        raise ValidationError("backup não encontrado")
    chk = sqlite3.connect(str(src_path))
    try:
        ok = chk.execute("PRAGMA integrity_check").fetchone()[0] == "ok"
        has = chk.execute("SELECT 1 FROM sqlite_master WHERE name='lanc'").fetchone() is not None
    finally:
        chk.close()
    if not ok or not has:
        raise ValidationError("o backup está corrompido ou não é do Focus Cofre")
    safety = bdir / f"antes-de-restaurar-{_time.strftime('%Y%m%d-%H%M%S')}.db"
    live = sqlite3.connect(str(db_path()))
    sc = sqlite3.connect(str(safety))
    try:
        with sc:
            live.backup(sc)
    finally:
        sc.close(); live.close()
    src = sqlite3.connect(str(src_path))
    dst = sqlite3.connect(str(db_path()))
    try:
        with dst:
            src.backup(dst)
    finally:
        src.close(); dst.close()
    connect().close()  # aplica migrações se o backup for de uma versão antiga
    return safety.name
