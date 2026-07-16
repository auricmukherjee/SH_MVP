import os
import json
from pathlib import Path

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.output_parsers import StrOutputParser
from prompts.profile_prompt import get_profile_prompt
from models.llm import text_model
from models.llm import med_model

BASE_DIR = Path(__file__).parent.parent

CLINICAL_NOTE = BASE_DIR / "config" / "clinical_note.txt"

OUTPUT_FILE = BASE_DIR / "outputs" / "profile_response.txt"

class ProfileAgent:

    def __init__(self):
        
        with open(CLINICAL_NOTE, "r", encoding="utf-8") as f:
            self.clinical_note_text = f.read()

        self.prompt = get_profile_prompt()

        self.chain = (
            self.prompt
            | med_model
            | StrOutputParser()
        )

    def run(self):

        print("Running Profile Agent:")
        response = self.chain.invoke(
            {
                "clinical_note": self.clinical_note_text
            }
        )

        print("\nLLM Response:\n")
        print(response)

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(response)