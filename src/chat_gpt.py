import openai
from src.config import AiasConfig

aias_config = AiasConfig()
openai.api_key = aias_config.config["api"]["key"]

def chat_with_gpt(input_text):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": input_text},
        ],
        temperature=1,
    )

    return response.choices[0].message.content.strip()
