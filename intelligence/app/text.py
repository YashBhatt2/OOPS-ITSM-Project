"""Text normalisation shared by all rankers."""

import re
import unicodedata

_MAX_CHARS = 5_000
_PATTERNS = [
    (re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b"), " uuidtoken "),
    (re.compile(r"https?://\S+|www\.\S+"), " urltoken "),
    (re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b"), " emailtoken "),
    (re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b"), " iptoken "),
    (re.compile(r"\b\d{5,}\b"), " numtoken "),
]
_SYNONYMS = {
    "pwd": "password",
    "passwd": "password",
    "wi-fi": "wifi",
    "o365": "email",
    "outlook": "email",
    "e-mail": "email",
    "mail": "email",
    "pc": "laptop",
    "computer": "laptop",
    "log-in": "login",
    "logon": "login",
    "signin": "login",
}
_TOKEN = re.compile(r"[a-z0-9][a-z0-9-]*")
STOP_WORDS = frozenset(
    "a an and are as at be but by can cannot could did do does for from has have i if in is "
    "it its me my no not of on or our please so that the their them then there this to too "
    "was we were when which while with you your again also any just since still get getting "
    "got after before".split()
)


def normalise(text: str) -> str:
    text = unicodedata.normalize("NFKC", text or "").lower()[:_MAX_CHARS]
    for pattern, replacement in _PATTERNS:
        text = pattern.sub(replacement, text)
    return " ".join(_SYNONYMS.get(word, word) for word in text.split())


def tokens(text: str) -> list[str]:
    """Normalised content words, stop words removed."""
    return [t for t in _TOKEN.findall(normalise(text)) if t not in STOP_WORDS and len(t) > 1]
