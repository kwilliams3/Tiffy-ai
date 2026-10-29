import { handleChat } from "../server/chat.mjs";

export default function handler(req, res) {
  return handleChat(req, res);
}
