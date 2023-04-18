import json
import logging
import textwrap

import openai

from src.config import AiasConfig
from src.file_management import load_code_blocks, load_tree_structure

aias_config = AiasConfig()
openai.api_key = aias_config.get_openai_api_key()

logger = logging.getLogger("ChatGPT")

logging.basicConfig(
    level=logging.INFO, format="", handlers=[logging.FileHandler("./data/chat.log")]
)


def chat_with_gpt(input_text, tree_structure=None, code_blocks=None):
    if tree_structure is None:
        tree_structure = load_tree_structure()
    if code_blocks is None:
        code_blocks = load_code_blocks()

    product_name = "aias"
    product_features = "AI-based code completion and code generation"
    product_target_users = "engineers"

    system_prompt = textwrap.dedent(
        f"""
        # Instruction:
        You are a talented engineer.
        Let's work together to develop a product based on the product information provided below.
        # Product Information
        - Product Name: {product_name}
        - Features: {product_features}
        - Target Users: {product_target_users}
        # Constraint:
        - Outputs should be in exact git diff format, not in code blocks.
        - Please reply in Japanese.
        # Example outputs:
        ```diff
        diff --git a/src/chat_gpt.py b/src/chat_gpt.py
        index 4ab021f..14d5d49 100644
        --- a/src/chat_gpt.py
        +++ b/src/chat_gpt.py
        @@ -39,7 +39,10 @@ def chat_with_gpt(input_text, tree_structure=None, code_blocks=None):
                # Constraint
                - The code should be output in exact diff format.
                - Please reply in Japanese.
        -        - Propose specific implementation methods for the necessary features.
        +        # Example outputs
        ```
        """  # noqa: E501
    )
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": "\n".join(
                    [
                        "# The file structure of our project:",
                        tree_structure,
                        "# The codes of our project:",
                        code_blocks,
                        "# Outputs Diff:"
                    ]
                ),
            },
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
