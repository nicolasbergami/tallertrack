import OpenAI from "openai";
import { env } from "../../config/env";

// Singleton — reused across all Whisper / GPT requests
export const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });
