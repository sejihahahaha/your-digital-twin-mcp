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

# ---------- Environment Loader ----------
def sanitize_and_load_env():
    """Safely load `.env.local` or `.env` and handle encoding issues."""
    base_dir = os.path.dirname(__file__)
    env_local = os.path.join(base_dir, ".env.local")
    env_path = os.path.join(base_dir, ".env")
    
    try:
        if os.path.exists(env_local):
            load_dotenv(dotenv_path=env_local, encoding="utf-8")
            print(f"✅ Loaded environment from: {os.path.basename(env_local)}")
            return
        elif os.path.exists(env_path):
            load_dotenv(dotenv_path=env_path, encoding="utf-8")
            print(f"✅ Loaded environment from: {os.path.basename(env_path)}")
            return
    except Exception:
        # fallback: sanitize
        try:
            with open(env_path, "rb") as bf:
                raw = bf.read()
            cleaned = raw.replace(b"\x00", b"").decode("utf-8", errors="replace")
            cleaned_path = env_path + ".cleaned"
            with open(cleaned_path, "w", encoding="utf-8") as cf:
                cf.write(cleaned)
            load_dotenv(dotenv_path=cleaned_path, encoding="utf-8")
            print(f"✅ Loaded cleaned .env from {os.path.basename(cleaned_path)}")
        except Exception as e:
            print(f"❌ Failed to load .env: {e}")

sanitize_and_load_env()

# ---------- Constants ----------
JSON_FILE = os.path.join(os.path.dirname(__file__), "data", "digitaltwin.json")
if not os.path.exists(JSON_FILE):
    JSON_FILE = os.path.join(os.path.dirname(__file__), "digitaltwin.json")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
DEFAULT_MODEL = "llama-3.1-8b-instant"

# ---------- Setup Clients ----------
def setup_groq_client():
    if not GROQ_API_KEY:
        print("❌ GROQ_API_KEY not found in .env")
        return None
    try:
        client = Groq(api_key=GROQ_API_KEY)
        print("✅ Groq client initialized")
        return client
    except Exception as e:
        print(f"❌ Error initializing Groq client: {e}")
        return None

def setup_vector_database(debug=False):
    """Load digital twin data into Upstash or fallback to in-memory index."""
    try:
        index = Index.from_env()
        info = index.info()
        current_count = getattr(info, "vector_count", 0) if info else 0
        print(f"📊 Current vectors: {current_count}")

        if current_count == 0:
            print("📝 Loading digital twin JSON...")
            with open(JSON_FILE, "r", encoding="utf-8") as f:
                profile_data = json.load(f)

            content_chunks = []

            # --- Personal Info ---
            personal = profile_data.get("personal", {})
            personal_text = f"{personal.get('name','')}, {personal.get('title','')}. {personal.get('summary','')}"
            content_chunks.append({"id":"personal","title":"Personal Info","content":personal_text,"type":"personal"})

            # --- Experience ---
            for i, exp in enumerate(profile_data.get("experience", [])):
                exp_text = f"{exp.get('title','')} at {exp.get('company','')} ({exp.get('duration','')}). "
                for ach in exp.get("achievements_star", []):
                    exp_text += f"Situation: {ach.get('situation','')}. Task: {ach.get('task','')}. Action: {ach.get('action','')}. Result: {ach.get('result','')}. "
                content_chunks.append({"id":f"exp_{i}","title":exp.get("title",""),"content":exp_text,"type":"experience"})

            # --- Projects ---
            for i, proj in enumerate(profile_data.get("projects_star_format", [])):
                proj_text = f"{proj.get('project_name','')}: {proj.get('situation','')} Task: {proj.get('task','')} Action: {proj.get('action','')} Result: {proj.get('result','')}. Technologies: {', '.join(proj.get('technologies',[]))}."
                content_chunks.append({"id":f"proj_{i}","title":proj.get("project_name",""),"content":proj_text,"type":"project"})

            # --- Leadership Examples ---
            for i, lead in enumerate(profile_data.get("leadership_examples_star", [])):
                lead_text = f"Situation: {lead.get('situation','')} Task: {lead.get('task','')} Action: {lead.get('action','')} Result: {lead.get('result','')}."
                content_chunks.append({"id":f"lead_{i}","title":"Leadership Example","content":lead_text,"type":"leadership"})

            # --- Quantifications ---
            for i, quant in enumerate(profile_data.get("quantifications", [])):
                content_chunks.append({"id":f"quant_{i}","title":"Quantification","content":quant,"type":"quantification"})

            # Upload to vector DB
            vectors = [(c["id"], c["content"], {"title": c["title"], "type": c["type"], "content": c["content"]}) for c in content_chunks]
            index.upsert(vectors=vectors)
            print(f"✅ Uploaded {len(vectors)} content chunks!")
        
        return index
    except Exception as e:
        print(f"❌ Error setting up vector DB: {e}")
        if debug:
            # Fallback to in-memory index
            class MockDoc:
                def __init__(self, metadata):
                    self.metadata = metadata
            class MockIndex:
                def __init__(self, chunks):
                    self.chunks = chunks
                def query(self, data, top_k=3, include_metadata=True):
                    q = data.lower()
                    scored = []
                    for c in self.chunks:
                        content = c["content"].lower()
                        score = sum(content.count(tok) for tok in q.split())
                        scored.append((score,c))
                    scored.sort(key=lambda x: x[0], reverse=True)
                    results = [MockDoc(s[1]) for s in scored[:top_k]]
                    return results
            return MockIndex(content_chunks)
        return None

# ---------- Query & Response ----------
def query_vectors(index, query_text, top_k=3):
    try:
        return index.query(data=query_text, top_k=top_k, include_metadata=True)
    except Exception as e:
        print(f"❌ Error querying vectors: {e}")
        return []

def generate_response_with_groq(client, prompt, model=DEFAULT_MODEL):
    if client is None:
        return f"[DEBUG MODE] Local response: {prompt[:1000]}"
    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role":"system","content":"You are an AI digital twin answering as Krystel Lingat. Use first person and professional tone."},
                {"role":"user","content":prompt}
            ],
            temperature=0.7,
            max_tokens=500
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        return f"❌ Error generating response: {e}"

def rag_query(index, groq_client, question):
    results = query_vectors(index, question, top_k=3)
    if not results:
        return "I don't have information about that."
    top_docs = []
    for r in results:
        content = getattr(r.metadata, "content", None) if hasattr(r, "metadata") else r.metadata.get("content","")
        if content:
            top_docs.append(content)
    context = "\n".join(top_docs)
    prompt = f"""Based on the following information about yourself, answer the question.
Speak in first person as if you are Krystel Lingat.

Your Information:
{context}

Question: {question}

Provide a helpful, professional response:"""
    return generate_response_with_groq(groq_client, prompt)

# ---------- Main ----------
def main():
    parser = argparse.ArgumentParser(description="Digital Twin RAG App")
    parser.add_argument("--debug", action="store_true", help="Run in debug mode")
    args = parser.parse_args()

    print("🤖 Krystel's Digital Twin Ready")
    groq_client = setup_groq_client() if not args.debug else None
    index = setup_vector_database(debug=args.debug)
    if not index:
        print("❌ Failed to initialize digital twin. Exiting.")
        return

    print("✅ Digital Twin is ready! Type 'exit' to quit.\n")
    while True:
        try:
            question = input("You: ")
        except (EOFError, KeyboardInterrupt):
            print("\n👋 Goodbye!")
            break
        if question.lower() in ["exit", "quit"]:
            print("👋 Goodbye!")
            break
        if question.strip():
            answer = rag_query(index, groq_client, question)
            print(f"🤖 Digital Twin: {answer}\n")

if __name__ == "__main__":
    main()
