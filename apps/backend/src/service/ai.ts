import {  generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { chatApiValidation } from "types/types";

const getAnthropicModel = (apiKey: string) => {
  if (!apiKey) {
    throw new Error("Anthropic API key is missing. Please set the ANTHROPIC_API_KEY environment variable.");
  }

  const anthropic = createAnthropic({
    apiKey,
  });

  return anthropic("claude-3-5-sonnet-20240620");
};

export const getLlmResponse = async (
  prompt: typeof chatApiValidation,
  options:any,
  systemPrompt: string
): Promise<string> => {
  try {
    const model = getAnthropicModel(process.env.ANTHROPIC_API_KEY || "");
    const { text } = await generateText({
      model,
      prompt,
      system: systemPrompt,
      max_tokens: 300,
      ...options,
    });
    return text;
  } catch (error) {
    console.error("Error generating LLM response:", error);
    throw new Error("Failed to generate LLM response. Please try again later.");
  }
};

