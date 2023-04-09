import openai
import os

openai.api_key = os.getenv("OPENAI_API_KEY")

def chat_with_gpt(input_text):
    response = openai.ChatCompletion.create(
        model="gpt-3.5-turbo",
        messages=[
            {"role": "user", "content": input_text},
        ],
        temperature=1,
    )

    return response.choices[0].message.content.strip()

if __name__ == "__main__":
    input_text = input("あなた: ")
    response = chat_with_gpt(input_text)
    print("ChatGPT:", response)
