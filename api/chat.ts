import type { IncomingMessage, ServerResponse } from "node:http";
import { handleChat } from "../server/chat.ts";

export const config = { maxDuration: 60 };

export default function handler(req: IncomingMessage, res: ServerResponse) {
  return handleChat(req, res);
}
