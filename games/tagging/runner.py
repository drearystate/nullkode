"""One AI call for the tagging pass (tag.py, cards.py), through any OpenAI-compatible
chat completions API: OpenAI, or a local server such as vLLM, llama.cpp or Ollama.

Settings (environment):
  NK_TAG_BASE_URL  API base, e.g. http://127.0.0.1:11434/v1 (default: OPENAI_BASE_URL, then OpenAI)
  NK_TAG_API_KEY   API key (default: OPENAI_API_KEY; local servers usually need none)
  NK_TAG_MODEL     model id; it must accept images (default: the --model argument)
  NK_TAG_EFFORT=1  also send reasoning_effort (only for models that accept it)

The key is read from the environment, sent only to the API and never printed.
"""
from __future__ import annotations

import base64
import json
import os
import time
import urllib.error
import urllib.request


class AIError(Exception):
    pass


def _base() -> str:
    return (os.environ.get("NK_TAG_BASE_URL") or os.environ.get("OPENAI_BASE_URL") or "https://api.openai.com/v1").rstrip("/")


def _key() -> str:
    return os.environ.get("NK_TAG_API_KEY") or os.environ.get("OPENAI_API_KEY") or ""


def run(system_prompt: str, text: str, images: list[tuple[str, bytes]] | None = None,
        model: str = "", effort: str | None = None, timeout: float = 600.0) -> dict:
    """One call. images: [(media_type, bytes)]. Returns
    {text, usage, cost_usd, duration_ms, api_ms, rate_limit, model_usage}."""
    model = os.environ.get("NK_TAG_MODEL") or model
    if not model:
        raise AIError("no model: set NK_TAG_MODEL or pass --model")
    content: list | str = text
    if images:
        content = [{"type": "text", "text": text}]
        for mt, data in images:
            content.append({"type": "image_url",
                            "image_url": {"url": "data:%s;base64,%s" % (mt, base64.b64encode(data).decode("ascii"))}})
    body = {"model": model, "messages": [{"role": "system", "content": system_prompt},
                                          {"role": "user", "content": content}]}
    if effort and os.environ.get("NK_TAG_EFFORT") == "1":
        body["reasoning_effort"] = effort
    headers = {"content-type": "application/json"}
    key = _key()
    if key:
        headers["authorization"] = "Bearer " + key
    req = urllib.request.Request(_base() + "/chat/completions", data=json.dumps(body).encode("utf-8"),
                                 headers=headers, method="POST")
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            out = json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", "replace")[:300]
        if key:
            detail = detail.replace(key, "***")
        raise AIError("HTTP %s: %s" % (e.code, detail))
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise AIError("request failed: %s" % e)
    except ValueError:
        raise AIError("the API did not return JSON")
    choice = (out.get("choices") or [{}])[0]
    msg = choice.get("message") or {}
    reply = msg.get("content") or ""
    if isinstance(reply, list):
        reply = "".join(p.get("text", "") for p in reply if isinstance(p, dict))
    if not reply:
        raise AIError("empty reply (finish_reason %s)" % choice.get("finish_reason"))
    u = out.get("usage") or {}
    return {
        "text": reply,
        "usage": {"input_tokens": u.get("prompt_tokens"), "output_tokens": u.get("completion_tokens")},
        "cost_usd": 0.0,
        "duration_ms": int((time.time() - t0) * 1000),
        "api_ms": None,
        # No usage windows: the quota guard in tag.py / cards.py stays idle.
        "rate_limit": None,
        "model_usage": out.get("model"),
    }


if __name__ == "__main__":
    import sys
    r = run("You are a health check. Reply with the single word: pong", "ping",
            model=sys.argv[1] if len(sys.argv) > 1 else "")
    print(json.dumps({k: r[k] for k in ("text", "usage", "duration_ms", "model_usage")}, indent=1))
