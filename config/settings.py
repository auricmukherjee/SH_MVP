import os
from dotenv import load_dotenv

load_dotenv()

# ============================
# API Keys
# ============================

GITHUB_API_KEY = os.getenv("GITHUB_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GITHUB_API_KEY is None:
    raise ValueError("GITHUB_API_KEY not found in .env")

if GEMINI_API_KEY is None:
    raise ValueError("GEMINI_API_KEY not found in .env")