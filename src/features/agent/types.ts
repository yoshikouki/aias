export interface Message {
  content: string;
  role: "user" | "assistant";
}

export interface Response {
  content: string;
  type: "text" | "error";
}
