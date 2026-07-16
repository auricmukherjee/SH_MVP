
from agents.profile_agent import ProfileAgent
from agents.strategy_agent import StrategyAgent

class SmartHealPipeline:

    def __init__(self):
        self.profile_agent = ProfileAgent()
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