import Anthropic from "@anthropic-ai/sdk";
import { parseAndExecuteTool } from "./parser";

const systemPrompt = `You are a coding agent. Use the following tools to complete tasks:

# ListFile
Get a list of files in a directory.
<list_file>
<path>directory path</path>
<recursive>true or false</recursive>
</list_file>

# ReadFile
Read the contents of a file.
<read_file>
<path>file path</path>
</read_file>

# WriteFile
Write content to a file.
<write_file>
<path>file path</path>
<content>
content to write
</content>
</write_file>

# AskQuestion
Ask a question to the user.
<ask_question>
<question>question content</question>
</ask_question>

# ExecuteCommand
Execute a command.
<execute_command>
<command>command to execute</command>
<requires_approval>true or false</requires_approval>
</execute_command>

# Complete
Indicate task completion.
<complete>
<result>task result or output description</result>
</complete>

Always use one of the above tools. Do not respond directly without using a tool.`;

export class CodingAgent {
  private anthropic: Anthropic;
  private messages: { role: "user" | "assistant"; content: string }[] = [];

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({ apiKey });
  }

  async start(task: string) {
    this.messages = [
      { role: "assistant", content: systemPrompt },
      { role: "user", content: task },
    ];

    let isComplete = false;
    while (!isComplete) {
      const response = await this.anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4096,
        messages: this.messages,
        temperature: 0.7,
      });

      const assistantResponse = response.content[0].text;
      this.messages.push({ role: "assistant", content: assistantResponse });

      const { response: toolResponse, isComplete: complete } =
        await parseAndExecuteTool(assistantResponse);

      if (toolResponse.success) {
        console.log(`\n[${toolResponse.message}]`);
      }

      this.messages.push({ role: "user", content: `[Tool Result] ${toolResponse.message}` });
      isComplete = complete;
    }
  }
}
