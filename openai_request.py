"""The one small module that sends Quibly's study-game request to OpenAI."""

import json
import re
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


PROJECT_DIR = Path(__file__).resolve().parent


class OpenAIRequestError(Exception):
    """Raised when the local app cannot get a usable AI response."""


def _read_api_key():
    env_path = PROJECT_DIR / ".env"
    try:
        lines = env_path.read_text(encoding="utf-8").splitlines()
    except OSError as error:
        raise OpenAIRequestError("The local key file is missing.") from error

    for line in lines:
        if line.startswith("OPENAI_API_KEY="):
            value = line.split("=", 1)[1].strip()
            if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
                value = value[1:-1]
            if value and value != "paste-your-key-here":
                return value
    raise OpenAIRequestError("The local key file does not contain a usable key.")


def _read_model_name():
    notes = (PROJECT_DIR / "NOTES.md").read_text(encoding="utf-8")
    model_names = re.findall(r"gpt-[A-Za-z0-9.-]+", notes)
    for model_name in model_names:
        if "luna" in model_name.lower():
            return model_name.rstrip(".,:;)")
    raise OpenAIRequestError("The model name is missing from NOTES.md.")


def _read_brief():
    try:
        return (PROJECT_DIR / "BRIEF.md").read_text(encoding="utf-8")
    except OSError as error:
        raise OpenAIRequestError("The project brief is missing.") from error


def _extract_text(response_data):
    if response_data.get("output_text"):
        return response_data["output_text"].strip()

    text_parts = []
    for item in response_data.get("output", []):
        for content in item.get("content", []):
            if content.get("type") == "output_text" and content.get("text"):
                text_parts.append(content["text"])
    return "\n".join(text_parts).strip()


def _clean_json_text(text):
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _parse_game(text):
    cleaned = _clean_json_text(text)
    try:
        game = json.loads(cleaned)
    except json.JSONDecodeError:
        return {"title": "Your study game", "tagline": "A quick round made from your notes.", "questions": [], "raw": text}

    if not isinstance(game, dict):
        return {"title": "Your study game", "tagline": "A quick round made from your notes.", "questions": [], "raw": text}
    game.setdefault("title", "Your study game")
    game.setdefault("tagline", "A quick round made from your notes.")
    game.setdefault("questions", [])
    return game


def generate_study_game(notes, goal, game_style):
    api_key = _read_api_key()
    model_name = _read_model_name()
    brief = _read_brief()
    prompt = f"""Make one short, safe study game from the student's notes below.

Student goal: {goal or 'Review the notes'}
Game style: {game_style or 'Quick quiz'}

Notes:
{notes}

Return ONLY valid JSON with this shape:
{{
  "title": "short game title",
  "tagline": "one fun sentence",
  "questions": [
    {{
      "question": "a clear question based on the notes",
      "options": ["three short answer choices"],
      "answer": "exactly one option",
      "explanation": "one short explanation",
      "challenge": "a small bonus challenge or memory trick"
    }}
  ]
}}

Make 4 questions. Use the notes as the main source of truth. If a fact needs checking, use a trusted educational source, and do not invent details. Keep the language friendly for grades 6–8. Do not include personal data, harmful content, or anything unrelated to studying."""

    request_body = {
        "model": model_name,
        "instructions": brief,
        "input": prompt,
        "tools": [{"type": "web_search"}],
        "max_output_tokens": 1400,
    }
    request = Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(request_body).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=60) as response:
            response_data = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError) as error:
        raise OpenAIRequestError("OpenAI could not answer the request.") from error

    text = _extract_text(response_data)
    if not text:
        raise OpenAIRequestError("OpenAI returned an empty answer.")
    return _parse_game(text)
