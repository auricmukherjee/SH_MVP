from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

from config.settings import (
    GITHUB_API_KEY,
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

# Gemini Model (Therapy Strategy)

med_model = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    project="your-project-id",
    location="us-central1",
    temperature=0.1
)