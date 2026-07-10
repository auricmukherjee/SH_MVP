import json
from pathlib import Path

from langchain_core.prompts import ChatPromptTemplate

BASE_DIR = Path(__file__).parent.parent

PROMPT_FILE = BASE_DIR / "config" / "profile_agent_prompt.txt"
CONDITION_FILE = BASE_DIR / "config" / "conditions.json"

def get_profile_prompt():
    """
    Returns the prompt template for the Profile Agent.
    """

    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        system_prompt = f.read()
        system_prompt = system_prompt.replace("{", "{{").replace("}", "}}")

    with open(CONDITION_FILE, "r", encoding="utf-8") as f:
        conditions = json.load(f)

    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                system_prompt,
            ),
            (
                "user",
                "Clinical Note:\n{clinical_note}",
            ),
        ]
    )