#!/usr/bin/env python3
"""
Ingest script for Digital Twin profile into Upstash Vector DB.
Upstash will handle embeddings automatically (configured with groq-embed-1).
"""

import os
import json
import sys
from dotenv import load_dotenv
from upstash_vector import Index

# Load environment variables
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env.local"))

# Configuration
UPSTASH_VECTOR_URL = os.getenv("UPSTASH_VECTOR_REST_URL")
UPSTASH_VECTOR_TOKEN = os.getenv("UPSTASH_VECTOR_REST_TOKEN")

# Profile file location
profile_path = os.path.join(os.path.dirname(__file__), "digitaltwin.json")

def validate_credentials():
    """Validate that all required credentials are present."""
    if not UPSTASH_VECTOR_URL:
        print("❌ UPSTASH_VECTOR_REST_URL not found in .env.local")
        return False
    if not UPSTASH_VECTOR_TOKEN:
        print("❌ UPSTASH_VECTOR_REST_TOKEN not found in .env.local")
        return False
    print("✅ Upstash credentials found")
    return True

def load_profile():
    """Load the digital twin profile from JSON."""
    if not os.path.exists(profile_path):
        print(f"❌ Profile file not found: {profile_path}")
        return None
    
    try:
        with open(profile_path, "r", encoding="utf-8") as f:
            profile = json.load(f)
        print(f"✅ Loaded profile from {profile_path}")
        return profile
    except Exception as e:
        print(f"❌ Error loading profile: {e}")
        return None

def build_content_chunks(profile):
    """Build content chunks from the profile for ingestion."""
    chunks = []
    
    # Personal section
    personal = profile.get("personal", {})
    if personal:
        name = personal.get("name", "")
        title = personal.get("title", "")
        summary = personal.get("summary", "")
        location = personal.get("location", "")
        chunk_text = f"Personal: {name}, {title}. Location: {location}. Summary: {summary}"
        chunks.append({
            "id": "personal",
            "text": chunk_text,
            "metadata": {"type": "personal", "name": name}
        })
    
    # Experience section
    for i, exp in enumerate(profile.get("experience", [])):
        title = exp.get("title", "")
        company = exp.get("company", "")
        duration = exp.get("duration", "")
        description = exp.get("description", "")
        
        # Flatten STAR bullets
        achievements = []
        for star in exp.get("achievements_star", []):
            s = f"Situation: {star.get('situation', '')} Task: {star.get('task', '')} Action: {star.get('action', '')} Result: {star.get('result', '')}"
            achievements.append(s)
        
        chunk_text = f"Experience: {title} at {company} ({duration}). {description}. " + " ".join(achievements)
        chunks.append({
            "id": f"experience_{i}",
            "text": chunk_text,
            "metadata": {"type": "experience", "title": title, "company": company}
        })
    
    # Skills section
    skills = profile.get("skills", {})
    if skills:
        tech_skills = skills.get("technical", {})
        soft_skills = skills.get("soft_skills", [])
        
        tech_text = ", ".join([f"{k}: {v}" for k, v in tech_skills.items()])
        soft_text = ", ".join(soft_skills)
        
        chunk_text = f"Technical Skills: {tech_text}. Soft Skills: {soft_text}"
        chunks.append({
            "id": "skills",
            "text": chunk_text,
            "metadata": {"type": "skills"}
        })
    
    # Projects section
    for i, proj in enumerate(profile.get("projects_portfolio", [])):
        name = proj.get("name", "")
        description = proj.get("description", "")
        technologies = ", ".join(proj.get("technologies", []))
        impact = proj.get("impact", "")
        
        chunk_text = f"Project: {name}. Description: {description}. Technologies: {technologies}. Impact: {impact}"
        chunks.append({
            "id": f"project_{i}",
            "text": chunk_text,
            "metadata": {"type": "project", "name": name}
        })
    
    print(f"✅ Built {len(chunks)} content chunks")
    return chunks

def embed_chunks_with_groq(chunks):
    """Embed chunks using Groq's groq-embed-1 model."""
    print(f"🔄 Embedding {len(chunks)} chunks with Groq (groq-embed-1)...")
    
    groq_client = Groq(api_key=GROQ_API_KEY)
    embedded_chunks = []
    
    for i, chunk in enumerate(chunks):
        try:
            # Call Groq embedding endpoint
            response = groq_client.embeddings.create(
                input=chunk["text"],
                model="text-embedding-3-small"  # Using text-embedding-3-small as groq-embed-1 may not be available
            )
            embedding = response.data[0].embedding
            
            embedded_chunks.append({
                "id": chunk["id"],
                "values": embedding,
                "metadata": chunk["metadata"]
            })
            
            if (i + 1) % 5 == 0:
                print(f"  ✓ Embedded {i + 1}/{len(chunks)} chunks")
        except Exception as e:
            print(f"❌ Error embedding chunk {chunk['id']}: {e}")
            return None
    
    print(f"✅ Embedded all {len(embedded_chunks)} chunks")
    return embedded_chunks

def upload_to_upstash(chunks):
    """Upload text chunks to Upstash Vector DB (Upstash handles embedding automatically)."""
    print(f"🔄 Uploading {len(chunks)} text chunks to Upstash...")
    print("   (Upstash will automatically embed them using groq-embed-1)")
    
    try:
        index = Index(url=UPSTASH_VECTOR_URL, token=UPSTASH_VECTOR_TOKEN)
        
        # Upsert text directly - Upstash will embed automatically
        vectors = [
            (chunk["id"], chunk["text"], chunk["metadata"])
            for chunk in chunks
        ]
        
        index.upsert(vectors=vectors)
        print(f"✅ Successfully uploaded {len(vectors)} text chunks to Upstash")
        print("   Upstash is now embedding them with groq-embed-1...")
        
        # Verify the upload
        try:
            info = index.info()
            vector_count = info.get("vector_count", 0) if isinstance(info, dict) else getattr(info, "vector_count", 0)
            print(f"📊 Total vectors in index: {vector_count}")
        except Exception as e:
            print(f"⚠️  Could not fetch index info: {e}")
        
        return True
    except Exception as e:
        print(f"❌ Error uploading to Upstash: {e}")
        if "embedding" in str(e).lower():
            print("\n⚠️  IMPORTANT: Your Upstash Vector index may not be configured with an embedding model.")
            print("   Please recreate your index with 'groq-embed-1' or another embedding model:")
            print("   1. Go to https://console.upstash.com")
            print("   2. Delete the current Vector index")
            print("   3. Create a new index with Embedding Model: 'groq-embed-1'")
            print("   4. Copy the new REST URL and Token to .env.local")
            print("   5. Run this script again")
        return False

def main():
    """Main ingestion workflow."""
    print("🚀 Digital Twin Upstash Ingestion Script")
    print("=" * 50)
    
    # Step 1: Validate credentials
    if not validate_credentials():
        sys.exit(1)
    
    # Step 2: Load profile
    profile = load_profile()
    if not profile:
        sys.exit(1)
    
    # Step 3: Build content chunks
    chunks = build_content_chunks(profile)
    if not chunks:
        print("❌ No content chunks generated")
        sys.exit(1)
    
    # Step 4: Upload to Upstash (Upstash handles embedding)
    if upload_to_upstash(chunks):
        print("\n✅ Ingestion complete! Your Digital Twin profile is now searchable.")
    else:
        sys.exit(1)

if __name__ == "__main__":
    main()
