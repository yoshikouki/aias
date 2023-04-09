import openai

from src.config import AiasConfig

def chat_with_gpt(aias_config, input_text):
    openai.api_key = aias_config.config["api"]["key"]
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": input_text},
        ],
        temperature=1,
    )

    return response.choices[0].message.content.strip()

if __name__ == "__main__":
    aias_config = AiasConfig()
    input_text = input("あなた: ")
    response = chat_with_gpt(aias_config, input_text)
    print("ChatGPT:", response)
