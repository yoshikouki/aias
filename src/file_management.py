import fnmatch
import os
import re


def generate_code_blocks(directory="."):
    code_blocks = []
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith(".py"):
                file_path = os.path.join(root, file)
                with open(file_path, "r") as f:
                    file_content = f.read()

                block = "\n".join([
                    f"## File: {file_path}",
                    "```python",
                    file_content,
                    "```",
                    "",
                ])
                code_blocks.append(block)
    return "\n".join(code_blocks)


def parse_gitignore(ignore_file='.gitignore'):
    with open(ignore_file, 'r') as f:
        lines = f.readlines()
    ignore_patterns = [line.strip()
                       for line in lines if line.strip() and not line.startswith('#')]
    return ignore_patterns


def is_ignored(path, ignore_patterns):
    relative_path = os.path.relpath(path, start=".")
    for pattern in ignore_patterns:
        regex_pattern = fnmatch.translate(pattern)
        if re.match(regex_pattern, relative_path) or re.match(regex_pattern, os.path.join(relative_path, '')):
            return True
    return False


def generate_tree_structure(directory='.', gitignore='.gitignore'):
    tree = []
    ignore_patterns = []

    if gitignore:
        ignore_patterns = parse_gitignore(gitignore)

    for root, dirs, files in os.walk(directory):
        level = root.replace(directory, '').count(os.sep)
        if level == 0:
            tree.append(f"{os.path.basename(root)}/")
        else:
            indent = "│   " * (level - 1) + "├── "
            if not is_ignored(os.path.join(root), ignore_patterns):
                tree.append(f"{indent}{os.path.basename(root)}/")

        if ignore_patterns:
            dirs[:] = [d for d in dirs if not is_ignored(
                os.path.join(root, d), ignore_patterns)]
            files = [f for f in files if not is_ignored(
                os.path.join(root, f), ignore_patterns)]

        for index, file in enumerate(files):
            if index == len(files) - 1:
                indent = "│   " * level + "└── "
            else:
                indent = "│   " * level + "├── "
            tree.append(f"{indent}{file}")

    return '\n'.join(tree)
