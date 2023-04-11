import os
import yaml

class AiasConfig:
    def __init__(self):
        self.config_directory = os.path.expanduser("~/.aias")
        self.config_file = os.path.join(self.config_directory, "config.yaml")
        self.create_config_directory()
        self.create_config_file()
        self.config = self.load_config()
        self.validate_and_prompt_for_api_key()

    def create_config_directory(self):
        if not os.path.exists(self.config_directory):
            os.makedirs(self.config_directory)

    def create_config_file(self):
        if not os.path.exists(self.config_file):
            initial_config = {"api": {"key": "your_openai_api_key_here"}}
            with open(self.config_file, "w") as f:
                yaml.safe_dump(initial_config, f)
            print(f"A config file has been created in {self.config_file}")

    def update_api_key(self, api_key):
        self.config["api"]["key"] = api_key
        with open(self.config_file, "w") as f:
            yaml.safe_dump(self.config, f)

    def load_config(self):
        with open(self.config_file, "r") as f:
            return yaml.safe_load(f)

    def get_openai_api_key(self):
        return self.config["api"]["key"]

    def validate_and_prompt_for_api_key(self):
        api_key = self.get_openai_api_key()

        while not api_key.startswith("sk-"):
            print("Invalid API key. It should start with 'sk-'.")
            api_key = input("Please enter your OpenAI API key: ")
            self.update_api_key(api_key)
