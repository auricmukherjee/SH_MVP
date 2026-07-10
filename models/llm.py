from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

from config.settings import (
    GITHUB_API_KEY,
    GEMINI_API_KEY,
)

# ==========================================
# GPT Model (Condition Extraction)
# ==========================================

text_model = ChatOpenAI(
    base_url="https://models.inference.ai.azure.com",
    api_key=GITHUB_API_KEY,
    model="gpt-4o",
    temperature=0
)

# ==========================================
# Gemini Model (Therapy Strategy)
# ==========================================

med_model = ChatGoogleGenerativeAI(
    api_key=GEMINI_API_KEY,
    model="gemini-2.5-flash",
    temperature=0
)