# Run the AI on your own hardware

NullKode talks to any server that speaks the OpenAI chat API. That includes
Ollama, llama.cpp's server, LM Studio and vLLM, so you can build apps with a
model on your own computer or server and pay nothing per request.

## 1. Start a model server

| Server | Start it | API address to enter |
|---|---|---|
| Ollama | `ollama run qwen3:8b` (or any model you like) | `http://host.docker.internal:11434/v1` |
| LM Studio | Load a model, then turn on the local server | `http://host.docker.internal:1234/v1` |
| vLLM | `vllm serve Qwen/Qwen3.8-27B` | `http://host.docker.internal:8000/v1` |
| llama.cpp | `llama-server -m model.gguf -c 16384` | `http://host.docker.internal:8080/v1` |

Use `host.docker.internal` when the model runs on the same computer as
NullKode's Docker containers. Use the server's own address when it runs on
another machine.

## 2. Connect it

Administration → Settings → AI:

1. **API base URL:** the address from the table.
2. **API key:** leave empty unless your server needs one.
3. **Model:** the exact model name the server uses (for Ollama, the name you
   ran, e.g. `qwen3:8b`).
4. **Model context size:** leave empty. NullKode asks vLLM, LM Studio and
   Ollama how much the model can read at once. Models under 24K tokens get
   shorter instructions automatically.
5. **Model thinking:** leave on *Automatic* (it's turned off for local
   servers, because reasoning models such as Qwen3 can think for many
   minutes before writing anything).
6. **Maximum output tokens:** leave empty (no limit).

Press **Test connection**. It saves your settings, sends a tiny request and
tells you the context size it found.

## 3. What to expect

Speed depends on your hardware far more than on NullKode:

- A hosted model (e.g. `gpt-6-luna`) plans an app in about 15 seconds and
  builds it in 1–2 minutes.
- A mid-size model on a recent graphics card (24 GB or more) takes a few
  minutes per app.
- A small model on a busy CPU-only server can take 30 minutes or more. Builds
  keep going as long as the model keeps writing, and the screen shows
  progress, so you can leave it running.

Bigger models write better pages. For customers, start with a model of about
27B parameters or larger, or a hosted model, and try a sample app before
inviting people. Standard parts of an app (lists, forms, saving, deleting)
are built by NullKode itself rather than the model, so even small models get
those right.

## Troubleshooting

- **"The AI returned an unreadable answer":** switch *JSON mode* to *Prompt
  only* (some servers don't support JSON mode), or use a larger model.
- **Builds stop after exactly 5 minutes:** you're on an old version; update.
- **Ollama only uses 2048 tokens of context:** set `OLLAMA_CONTEXT_LENGTH=16384`
  (or more) before starting Ollama.
