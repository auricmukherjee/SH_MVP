import os
import json
from pathlib import Path

from langchain_core.output_parsers import JsonOutputParser
from langchain_core.output_parsers import StrOutputParser
from prompts.strategy_prompt import get_strategy_prompt
from models.llm import text_model
from models.llm import med_model

BASE_DIR = Path(__file__).parent.parent

OUTPUT_FILE = BASE_DIR / "outputs" / "strategy_response.txt"

class StrategyAgent:

    def __init__(self):

        self.prompt = get_strategy_prompt()

        self.chain = (
            self.prompt
            | med_model
            | StrOutputParser()
        )

    def run(self):

        print("Running Strategy Agent:")
        response = self.chain.invoke({})

        print("\nLLM Response:\n")
        print(response)

        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(response)
            