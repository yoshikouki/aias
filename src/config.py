import os
import yaml

class AiasConfig:
    def __init__(self):
        self.config_directory = os.path.expanduser("~/.aias")
        self.config_file = os.path.join(self.config_directory, "config.yaml")
        self.config = self.load_config()

    def create_config_directory(self):
        if not os.path.exists(self.config_directory):
            os.makedirs(self.config_directory)

    def create_config_file(self):
        if not os.path.exists(self.config_file):
            with open(self.config_file, "w") as f:
                f.write("api:\n  key: your_openai_api_key_here\n")
            print("A config.yaml file has been created in the .aias directory. Please update it with your API key.")
            exit()

    def load_config(self):
        self.create_config_directory()
        self.create_config_file()
        with open(self.config_file, "r") as f:
            return yaml.safe_load(f)
