import os
from services.pipeline import SmartHealPipeline



def main():

    pipeline = SmartHealPipeline()

    result = pipeline.run()

    print(result)


if __name__ == "__main__":
    main()
