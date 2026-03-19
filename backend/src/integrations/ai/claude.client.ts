import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env";

// Singleton Anthropic client — shared across all AI service calls
export const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
