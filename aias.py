from src.chat_gpt import chat_with_gpt

if __name__ == "__main__":
    input_text = input("あなた: ")
    response = chat_with_gpt(input_text)
    print("ChatGPT:", response)
