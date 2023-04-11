import argparse
from src.chat_gpt import chat_with_gpt
from src.file_management import generate_code_blocks, generate_tree_structure

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate code blocks from Python files.")
    parser.add_argument(
        '--reindex',
        action='store_true',
        help='Reindex the code blocks.'
    )

    args = parser.parse_args()

    if args.reindex:
        tree_structure = generate_tree_structure()
        code_blocks = generate_code_blocks()
        print(tree_structure, code_blocks, sep="\n\n-----------------\n\n")
    else:
        input_text = input("あなた: ")
        response = chat_with_gpt(input_text)
        print("ChatGPT:", response)
