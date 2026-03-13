import json
from pathlib import Path

TOKEN_FILE = Path("/data/tokens.json")


def load_tokens() -> dict:
    if TOKEN_FILE.exists():
        return json.loads(TOKEN_FILE.read_text())
    return {}


def save_token(account_id: str, data: dict):
    tokens = load_tokens()
    tokens[account_id] = data
    TOKEN_FILE.parent.mkdir(parents=True, exist_ok=True)
    TOKEN_FILE.write_text(json.dumps(tokens))


def get_token(account_id: str) -> dict | None:
    return load_tokens().get(account_id)


def delete_token(account_id: str):
    tokens = load_tokens()
    tokens.pop(account_id, None)
    TOKEN_FILE.write_text(json.dumps(tokens))
