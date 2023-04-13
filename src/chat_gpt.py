import json
import logging
import openai
from src.config import AiasConfig
from src.file_management import load_code_blocks, load_tree_structure

aias_config = AiasConfig()
openai.api_key = aias_config.get_openai_api_key()

logger = logging.getLogger('ChatGPT')

logging.basicConfig(level=logging.INFO,
                    format='',
                    handlers=[logging.FileHandler('./data/chat.log')])


def chat_with_gpt(input_text, tree_structure=None, code_blocks=None):
    if tree_structure is None:
        tree_structure = load_tree_structure()
    if code_blocks is None:
        code_blocks = load_code_blocks()

    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "You are a talented engineer. Let's work together to create a product based on the product information we are about to show you."},  # noqa: E501
            {"role": "system", "content": "The code should be output in exact git diff format."},
            {"role": "system", "content": "Please reply in Japanese."},
            {"role": "user", "content": "\n".join([
                "# The file structure of our project",
                tree_structure,
                "# The codes of our project",
                code_blocks,
            ])},
            {"role": "user", "content": input_text},
        ],
        temperature=0.7,
    )

    message = response.choices[0].message
    tokens = response.usage
    log_dict = [
        {"role": "user", "content": input_text},
        message,
    ]
    logger.info("\n".join([json.dumps(data) for data in log_dict]))

    return message.content.strip(), tokens
