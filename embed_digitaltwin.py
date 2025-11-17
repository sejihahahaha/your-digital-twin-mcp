import os
import json
from io import StringIO
from pathlib import Path
from dotenv import load_dotenv
from upstash_vector import Index
from groq import Groq


def load_dotenv_safely(dotenv_path: Path | str = None):
    """Load a .env file while trying common encodings to avoid UnicodeDecodeError.

    If the file is encoded in UTF-16 or contains a BOM, this will try
    `utf-8`, `utf-8-sig`, `utf-16`, then `latin-1` and pass the decoded
    contents to python-dotenv via `stream=`.
    """
    if dotenv_path is None:
        dotenv_path = Path(__file__).resolve().parent / ".env"
    else:
        dotenv_path = Path(dotenv_path)

    if not dotenv_path.exists():
        # fallback to default loader behaviour (will look for .env)
        load_dotenv()
        return

    encodings_to_try = ["utf-8", "utf-8-sig", "utf-16", "latin-1"]
    content = None
    for enc in encodings_to_try:
        try:
            with open(dotenv_path, "r", encoding=enc) as f:
                content = f.read()
            break
        except UnicodeDecodeError:
            continue

    if content is None:
        # As a last resort, read as binary and replace undecodable bytes
        with open(dotenv_path, "rb") as f:
            raw = f.read()
        content = raw.decode("latin-1", errors="replace")

    # Pass the decoded content to python-dotenv via a stream
    load_dotenv(stream=StringIO(content))


# Load .env (safe)
load_dotenv_safely()

# Use correct environment variable names when reading with os.getenv
UPSTASH_VECTOR_URL = os.getenv("https://curious-bunny-26606-us1-vector.upstash.io")
UPSTASH_VECTOR_TOKEN = os.getenv("ABcFMGN1cmlvdXMtYnVubnktMjY2MDYtdXMxYWRtaW5OMlkwT0RrME5UUXROakl5T1MwMFlXTTBMVGd6TVRrdFpqTXpNelppTXpsak5UVmw=")
GROQ_API_KEY = os.getenv("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")

# Create connection to your vector database
vector_index = Index(url=UPSTASH_VECTOR_URL, token=UPSTASH_VECTOR_TOKEN)

with open("digitaltwin.json", "r", encoding="utf-8") as f:
    digital_twin_data = json.load(f)

# Initialize Groq LLM client
llm = Groq(api_key=GROQ_API_KEY)
