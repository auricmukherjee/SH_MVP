from agents.condition_agent import ConditionAgent
from agents.therapy_agent import TherapyAgent
from agents.profile_agent import ProfileAgent
from agents.strategy_agent import StrategyAgent

class SmartHealPipeline:

    def __init__(self):

        self.condition_agent = ConditionAgent()
        self.profile_agent = ProfileAgent()
        self.therapy_agent = TherapyAgent()
        self.strategy_agent = StrategyAgent()

    def run(self):

        print("PROFILE AND STRATEGY PIPELINE")
        # Build Profile
        profile = self.profile_agent.run()

        # ----------------------------------------
        # Step 2 : Therapy Recommendation
        # ----------------------------------------

        strategy = self.strategy_agent.run()

        return {
            "Profile": profile,

            "strategy": strategy
        }