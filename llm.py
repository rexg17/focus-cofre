"""Ponte entre o Focus Cofre e a API do Claude.

A chave da API fica só neste servidor local (arquivo de configurações). O navegador
manda a conversa e as ferramentas; aqui montamos a chamada com o SDK oficial.
"""
import os

import db

COM_FALLBACK = {"claude-opus-5-5", "claude-sonnet-5-5", "claude-fable-5-2"}
EFFORTS = {"low", "medium", "high"}
MAX_TOKENS = 16000


class LLMError(Exception):
    def __init__(self, msg: str, status: int = 502):
        super().__init__(msg)
        self.status = status


def _validar(corpo: dict):
    if not isinstance(corpo, dict):
        raise LLMError("pedido inválido", 400)
    system = corpo.get("system", "")
    if not isinstance(system, str) or len(system) > 30000:
        raise LLMError("instruções inválidas", 400)
    msgs = corpo.get("messages")
    if not isinstance(msgs, list) or not 1 <= len(msgs) <= 200:
        raise LLMError("conversa inválida", 400)
    for m in msgs:
        if not isinstance(m, dict) or m.get("role") not in ("user", "assistant") or not isinstance(m.get("content"), (str, list)):
            raise LLMError("mensagem inválida", 400)
    tools = corpo.get("tools") or []
    if not isinstance(tools, list) or len(tools) > 20 or not all(
            isinstance(t, dict) and isinstance(t.get("name"), str) and isinstance(t.get("input_schema"), dict) for t in tools):
        raise LLMError("ferramentas inválidas", 400)
    effort = corpo.get("effort", "medium")
    if effort not in EFFORTS:
        raise LLMError("nível de esforço inválido", 400)
    return system, msgs, tools, effort


def chamar(corpo: dict) -> dict:
    cfg = db.load_settings()
    chave = cfg.get("llm_key") or os.environ.get("ANTHROPIC_API_KEY")
    if not chave:
        raise LLMError("Configure a sua chave da API na aba ajustes para usar o coach com IA.", 400)
    modelo = cfg.get("llm_model") if cfg.get("llm_model") in db.LLM_MODELOS else db.LLM_PADRAO
    system, msgs, tools, effort = _validar(corpo)

    import anthropic  # importado aqui para o app abrir mesmo sem o pacote instalado

    client = anthropic.Anthropic(api_key=chave, base_url=os.environ.get("COFRE_LLM_BASE_URL") or None,
                                 timeout=180.0, max_retries=2)
    kw = dict(model=modelo, max_tokens=MAX_TOKENS, messages=msgs, output_config={"effort": effort})
    if system:
        kw["system"] = system
    if tools:
        kw["tools"] = tools
    try:
        if modelo in COM_FALLBACK:
            # recurso de reserva da API: se a resposta for recusada por segurança, outro modelo continua
            resp = client.beta.messages.create(betas=["server-side-fallback-2026-07-01"], fallbacks="default", **kw)
        else:
            resp = client.messages.create(**kw)
    except anthropic.AuthenticationError:
        raise LLMError("A chave da API foi recusada. Confira se ela está correta.", 401)
    except anthropic.PermissionDeniedError:
        raise LLMError("A chave da API não tem permissão para esse modelo.", 403)
    except anthropic.NotFoundError:
        raise LLMError("Modelo não encontrado para essa chave.", 404)
    except anthropic.RateLimitError:
        raise LLMError("Limite de uso da API atingido. Tente de novo em instantes.", 429)
    except anthropic.BadRequestError as e:
        raise LLMError(f"A API recusou o pedido: {e.message}", 400)
    except anthropic.APIStatusError as e:
        raise LLMError(f"Erro da API ({e.status_code}). Tente de novo mais tarde.", 502 if e.status_code >= 500 else 400)
    except anthropic.APIConnectionError:
        raise LLMError("Sem conexão com a API do Claude. Confira a internet.", 502)
    detalhes = getattr(resp, "stop_details", None)
    uso = getattr(resp, "usage", None)
    return {
        "content": [b.to_dict() for b in resp.content],
        "stop_reason": resp.stop_reason,
        "stop_details": detalhes.to_dict() if detalhes is not None and hasattr(detalhes, "to_dict") else None,
        "model": resp.model,
        "usage": {"input": getattr(uso, "input_tokens", 0), "output": getattr(uso, "output_tokens", 0)},
    }
