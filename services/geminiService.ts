import axios from "axios";
import { AnalysisFeedback } from "../types";
import { STARTUP_ANALYSIS_PROMPT_TEMPLATE } from "../constants";

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

export const analyzeStartupIdea = async (
  idea: string
): Promise<AnalysisFeedback> => {
  if (!API_KEY) {
    throw new Error("Set VITE_OPENROUTER_API_KEY in .env.local");
  }

  const prompt = `
${STARTUP_ANALYSIS_PROMPT_TEMPLATE.replace("{USER_IDEA}", idea)}

IMPORTANT:
Return STRICT JSON in this format:
{
  "feasibilityScore": number,
  "uniqueness": "text",
  "competition": "text",
  "goToMarketStrategy": "text",
  "overallAssessment": "text"
}
`;

  try {
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mixtral-8x7b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5
      },
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    let text: string = String(
      response.data?.choices?.[0]?.message?.content || ""
    ).trim();

    if (!text) {
      throw new Error("Empty response from AI");
    }

    // 🔹 Try extracting JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.warn("JSON parse failed, using fallback...");
      }
    }

    // 🔥 FALLBACK (convert plain text → structured output)
    return {
      feasibilityScore: 7, // default
      uniqueness: text,
      competition: text,
      goToMarketStrategy: text,
      overallAssessment: text
    };

  } catch (error) {
    console.error("OpenRouter Error:", error);

    if (error instanceof Error) {
      throw new Error(`Failed to get analysis from AI: ${error.message}`);
    }

    throw new Error("Unknown AI error occurred");
  }
};