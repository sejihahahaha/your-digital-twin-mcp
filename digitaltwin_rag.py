"""
Digital Twin RAG Application
Customized for Krystel's Digital Twin
- Upstash Vector: Embeddings & semantic search
- Groq: AI inference for natural responses
"""

import os
import json
import argparse
from dotenv import load_dotenv
from upstash_vector import Index
from groq import Groq

def sanitize_and_load_env():
    """Safely load `.env.local` or `.env`. If loading fails due to bad encoding or embedded nulls,
    create a cleaned copy and load that instead.
    """
    base_dir = os.path.dirname(__file__)
    env_local = os.path.join(base_dir, ".env.local")
    env_path = os.path.join(base_dir, ".env")
    
    # Try .env.local first
    if os.path.exists(env_local):
        try:
            load_dotenv(dotenv_path=env_local, encoding="utf-8")
            print(f"✅ Loaded environment from: {os.path.basename(env_local)}")
            return
        except Exception as e:
            print(f"⚠️  Failed to load {os.path.basename(env_local)}: {e}")

    # Fall back to .env
    if not os.path.exists(env_path):
        return

    # Try normal load first
    try:
        load_dotenv(encoding="utf-8")
        return
    except Exception:
        pass

    # Try latin-1 as a fallback
    try:
        load_dotenv(encoding="latin-1")
        print("⚠️  Loaded .env using latin-1 encoding due to decode errors.")
        return
    except Exception:
        pass

    # Manual sanitize: remove NUL bytes and write a cleaned file
    try:
        with open(env_path, "rb") as bf:
            raw = bf.read()

        cleaned = raw.replace(b"\x00", b"")
        text = cleaned.decode("utf-8", errors="replace")
        lines = [l.rstrip() for l in text.splitlines()]
        cleaned_text = "\n".join(lines) + "\n"

        cleaned_path = env_path + ".cleaned"
        with open(cleaned_path, "w", encoding="utf-8") as cf:
            cf.write(cleaned_text)

        load_dotenv(dotenv_path=cleaned_path, encoding="utf-8")
        print(f"✅ Loaded cleaned .env from {os.path.basename(cleaned_path)}")
    except Exception as e:
        print(f"⚠️  Failed to sanitize/load .env: {e}")


# Run the safe loader
sanitize_and_load_env()

# Constants
# Prefer data/digitaltwin.json if present, otherwise fall back to project root digitaltwin.json
possible_path = os.path.join(os.path.dirname(__file__), "data", "digitaltwin.json")
root_path = os.path.join(os.path.dirname(__file__), "digitaltwin.json")
if os.path.exists(possible_path):
    JSON_FILE = possible_path
else:
    JSON_FILE = root_path
# Read the GROQ API key from the environment variable named `GROQ_API_KEY`.
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEFAULT_MODEL = "llama-3.1-8b-instant"

# ---------- Setup Clients ----------

def setup_groq_client():
    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not found in .env file")
        return None
    try:
        client = Groq(api_key=GROQ_API_KEY)
        print("✅ Groq client initialized successfully!")
        return client
    except Exception as e:
        print(f"❌ Error initializing Groq client: {str(e)}")
        return None

def setup_vector_database(debug=False):
    print("🔄 Setting up Upstash Vector database...")
    try:
        index = Index.from_env()
        print("✅ Connected to Upstash Vector successfully!")

        # Check vector count
        try:
            info = index.info()
            # `info` can be a dict or an object depending on the client implementation.
            if isinstance(info, dict):
                current_count = info.get("vector_count", 0)
            else:
                current_count = getattr(info, "vector_count", 0)
            print(f"📊 Current vectors in database: {current_count}")
        except Exception:
            current_count = 0

        # Load data if empty
        if current_count == 0:
            print("📝 Loading your professional profile...")
            try:
                with open(JSON_FILE, "r", encoding="utf-8") as f:
                    profile_data = json.load(f)
            except FileNotFoundError:
                print(f"❌ {JSON_FILE} not found!")
                return None

            # Flatten JSON into content chunks
            content_chunks = []
            # Personal
            personal = profile_data.get("personal", {})
            personal_text = f"{personal.get('name', '')}, {personal.get('title', '')}. {personal.get('summary', '')}"
            content_chunks.append({"id": "personal", "title": "Personal Info", "content": personal_text, "type": "personal", "metadata": {}})

            # Experience
            for i, exp in enumerate(profile_data.get("experience", [])):
                exp_text = f"{exp.get('title', '')} at {exp.get('company', '')} ({exp.get('duration', '')}). "
                for ach in exp.get("achievements_star", []):
                    exp_text += f"Situation: {ach.get('situation', '')}. Task: {ach.get('task', '')}. Action: {ach.get('action', '')}. Result: {ach.get('result', '')}. "
                content_chunks.append({"id": f"exp_{i}", "title": exp.get("title", ""), "content": exp_text, "type": "experience", "metadata": {}})

            # Skills
            skills = profile_data.get("skills", {})
            tech_skills = ", ".join([f"{k}: {v}" for k, v in skills.get("technical", {}).items()])
            soft_skills = ", ".join(skills.get("soft_skills", []))
            content_chunks.append({"id": "skills", "title": "Skills", "content": f"Technical skills: {tech_skills}. Soft skills: {soft_skills}", "type": "skills", "metadata": {}})

            # Projects
            for i, proj in enumerate(profile_data.get("projects_portfolio", [])):
                proj_text = f"{proj.get('name', '')}: {proj.get('description', '')}. Technologies: {', '.join(proj.get('technologies', []))}. Impact: {proj.get('impact', '')}."
                content_chunks.append({"id": f"proj_{i}", "title": proj.get("name", ""), "content": proj_text, "type": "project", "metadata": {}})

            # Upload to vector DB
            vectors = [(c["id"], c["content"], {"title": c["title"], "type": c["type"], "content": c["content"]}) for c in content_chunks]
            try:
                # In normal mode attempt to upsert into the index
                index.upsert(vectors=vectors)
                print(f"✅ Uploaded {len(vectors)} content chunks!")
            except Exception as e:
                print(f"⚠️  Could not upload to vector DB: {e}")
                # If in debug mode or index doesn't support embeddings, fallback to in-memory index
                if debug:
                    print("⚠️  Falling back to in-memory index for debug mode.")
                else:
                    print("⚠️  Falling back to in-memory index due to upload error.")

                # Build a simple in-memory mock index
                class MockDoc:
                    def __init__(self, metadata):
                        self.metadata = metadata

                class MockIndex:
                    def __init__(self, chunks):
                        # chunks: list of dicts with id, content, metadata
                        self.chunks = chunks

                    def query(self, data, top_k=3, include_metadata=True):
                        # naive scoring: count occurrences of query terms in content
                        q = data.lower()
                        scored = []
                        for c in self.chunks:
                            content = c["content"].lower()
                            score = sum(content.count(tok) for tok in q.split())
                            scored.append((score, c))
                        scored.sort(key=lambda x: x[0], reverse=True)
                        results = []
                        for s, c in scored[:top_k]:
                            results.append(MockDoc({"content": c["content"]}))
                        return results

                mock_index = MockIndex(content_chunks)
                print(f"✅ Created in-memory index with {len(content_chunks)} chunks.")
                return mock_index

        return index
    except Exception as e:
        print(f"❌ Error setting up database: {str(e)}")
        return None

# ---------- Query & Response ----------

def query_vectors(index, query_text, top_k=3):
    try:
        results = index.query(data=query_text, top_k=top_k, include_metadata=True)
        return results
    except Exception as e:
        print(f"❌ Error querying vectors: {str(e)}")
        return None

def generate_response_with_groq(client, prompt, model=DEFAULT_MODEL):
    try:
        # If no client provided (debug mode), return a safe local response
        if client is None:
            preview = prompt
            # Keep output concise for local testing
            return f"[DEBUG MODE] Generated response from local context.\n{preview[:2000]}"

        # Groq Python client uses the correct endpoint by default
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are an AI digital twin. Answer questions as if you are the person, speaking in first person about your background, skills, and experience."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        return f"❌ Error generating response: {str(e)}"

def rag_query(index, groq_client, question):
    results = query_vectors(index, question, top_k=3)
    if not results or len(results) == 0:
        return "I don't have specific information about that topic."
    
    top_docs = []
    for r in results:
        metadata = r.metadata or {}
        content = metadata.get("content", "")
        if content:
            top_docs.append(content)

    if not top_docs:
        return "I found some information but couldn't extract details."
    
    context = "\n".join(top_docs)
    prompt = f"""Based on the following information about yourself, answer the question.
Speak in first person as if you are describing your own background.

Your Information:
{context}

Question: {question}

Provide a helpful, professional response:"""
    
    return generate_response_with_groq(groq_client, prompt)

# ---------- Main Application ----------

def main():
    parser = argparse.ArgumentParser(description="Digital Twin RAG App")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode (skip Groq API calls)")
    args = parser.parse_args()

    print("🤖 Your Digital Twin - AI Profile Assistant")
    print("="*50)

    groq_client = None
    if not args.debug:
        groq_client = setup_groq_client()
        if not groq_client:
            return
    else:
        print("⚠️  Running in DEBUG mode: Groq API calls will be skipped.")

    index = setup_vector_database(debug=args.debug)
    if not index:
        return

    print("✅ Your Digital Twin is ready!")
    if args.debug:
        print("⚠️  Debug mode: responses will be generated locally (no external API used).")
    print("🤖 Chat with your AI Digital Twin!")
    print("Type 'exit' to quit.\n")

    while True:
        try:
            question = input("You: ")
        except (EOFError, KeyboardInterrupt):
            print("\n👋 Exiting.")
            break

        if question.lower() in ["exit", "quit"]:
            print("👋 Thanks for chatting with your Digital Twin!")
            break
        if question.strip():
            answer = rag_query(index, groq_client, question)
            print(f"🤖 Digital Twin: {answer}\n")

if __name__ == "__main__":
    main()
