"""Wrapper para OpenRouter API."""
import os, json, httpx
from dotenv import load_dotenv
load_dotenv()

API_KEY = os.getenv("OPENROUTER_API_KEY")
MODEL   = os.getenv("OPENROUTER_MODEL", "anthropic/claude-sonnet-4-5")
API_URL = "https://openrouter.ai/api/v1/chat/completions"

async def call_llm(system_prompt: str, user_prompt: str) -> dict:
    headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": MODEL,
        "messages": [{"role": "system", "content": system_prompt},
                     {"role": "user",   "content": user_prompt}],
        "temperature": 0.1,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(API_URL, headers=headers, json=payload)
        r.raise_for_status()
    return json.loads(r.json()["choices"][0]["message"]["content"])