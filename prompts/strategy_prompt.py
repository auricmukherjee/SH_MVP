import json
from pathlib import Path

from langchain_core.prompts import ChatPromptTemplate

BASE_DIR = Path(__file__).parent.parent

PROMPT_FILE = BASE_DIR / "config" / "strategy_agent_prompt.txt"
PROFILE_FILE = BASE_DIR / "outputs" / "strategy_response.txt"

def get_strategy_prompt():
    """
    Returns the prompt template for the Strategy Agent.
    """

    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        system_prompt = f.read()
        system_prompt = system_prompt.replace("{", "{{").replace("}", "}}")

    with open(PROFILE_FILE, "r", encoding="utf-8") as f:
        profile = f.read()
        profile = profile.replace("{", "{{").replace("}", "}}")

    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                system_prompt,
            ),
            (
                "user", 
                profile,
            ),
        ]
    )