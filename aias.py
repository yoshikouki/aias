#!/usr/bin/env python3

import argparse
from src.chat_gpt import chat_with_gpt
from src.file_management import generate_code_blocks, generate_tree_structure, save_code_blocks, save_tree_structure

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

    if args.reindex and args.output:
      tree_structure, _, code_blocks, _ = reindex()
      print(f"{tree_structure}\n\n-----------------\n\n{code_blocks}")

    elif args.reindex:
        _, tree_structure_file_path, _, code_blocks_file_path = reindex()
        print(f"Code blocks and tree structure have been saved to {tree_structure_file_path} and {code_blocks_file_path} respectively.")

    else:
        input_text = input("あなた: ")
        response = chat_with_gpt(input_text)
        print("ChatGPT:", response)
