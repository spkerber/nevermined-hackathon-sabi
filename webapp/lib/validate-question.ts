export interface ValidationResult {
  valid: boolean;
  error?: string;
  suggestion?: string;
}

export function validateQuestion(question: string): ValidationResult {
  const trimmed = question.trim();

  if (trimmed.length < 10) {
    return {
      valid: false,
      error: "Question is too short. Please describe what you need verified.",
    };
  }

  if (trimmed.length > 500) {
    return {
      valid: false,
      error: "Question is too long. Keep it under 500 characters.",
    };
  }

  // Must end with a question mark or be phrased as a request
  const isQuestion = /\?$/.test(trimmed);
  const isRequest = /^(check|verify|confirm|is|are|does|do|how|what|where|when|can|could|will|would|has|have)/i.test(trimmed);
  if (!isQuestion && !isRequest) {
    return {
      valid: false,
      error: "This doesn't look like a verifiable question. Try phrasing it as a question (ending with ?) or starting with a verb like \"Is\", \"Check\", \"How many\".",
      suggestion: `${trimmed}?`,
    };
  }

  // Check for real-world verifiability — should reference something observable
  const abstractPatterns = [
    /^(what is the meaning|why do|explain|tell me about|define|what are your thoughts)/i,
    /^(how do I|how to|teach me|help me understand)/i,
    /\b(opinion|think about|feel about|believe)\b/i,
  ];
  for (const pattern of abstractPatterns) {
    if (pattern.test(trimmed)) {
      return {
        valid: false,
        error: "This seems like an abstract or opinion question. Sabi is for verifying observable, real-world facts — things a person can go see and photograph.",
      };
    }
  }

  return { valid: true };
}
