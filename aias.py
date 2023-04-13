#!/usr/bin/env python3

import argparse
import readline
from src.chat_gpt import chat_with_gpt
from src.file_management import load_code_blocks, load_tree_structure, save_code_blocks, save_tree_structure

def reindex():
    tree_structure, tree_structure_file_path = save_tree_structure()
    code_blocks, code_blocks_file_path = save_code_blocks()
    return tree_structure, tree_structure_file_path, code_blocks, code_blocks_file_path


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Generate code blocks from Python files.")
    parser.add_argument(
        '--reindex',
        action='store_true',
        help='Reindex the code blocks.'
    )
    parser.add_argument(
        '--output',
        action='store_true',
    )

    args = parser.parse_args()

    if args.reindex:
        _, tree_structure_file_path, _, code_blocks_file_path = reindex()
        print(f"ℹ️ Saved to {tree_structure_file_path} and {code_blocks_file_path} respectively.\n")

    if args.output:
        tree_structure = load_tree_structure()
        code_blocks = load_code_blocks()
        print(f"{tree_structure}\n\n-----------------\n\n{code_blocks}")

    else:
        print("Enter message and press Ctrl+D to confirm... (Ctrl+C to exit)")
        print("---------------------------------------------------------------")
        input_texts = []
        while True:
            try:
                line = input()
            except EOFError:
                break
            input_texts.append(line)
        print("---------------------------------------------------------------")
        print("\nPlease wait...")

        response, tokens = chat_with_gpt("\n".join(input_texts))
        print("ChatGPT:", response)
        print("tokens:", tokens)
