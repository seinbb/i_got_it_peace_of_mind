export interface EmotionRatio {
  emotion: string;
  percentage: number;
}

export interface EmotionAnalysis {
  primary_emotion: string;
  ratios: EmotionRatio[];
}

export interface RecommendedContent {
  title: string;
  author: string;
  quote: string;
  reason: string;
}

export interface AnalysisResponse {
  emotion_analysis: EmotionAnalysis;
  empathy_message: string;
  recommended_content?: RecommendedContent;
  reflection_question?: string;
}

export interface DiaryEntry {
  id: string;
  date: string;
  time: string;
  content: string;
  analysis: AnalysisResponse;
  reflection_answer?: string;
  responseMode?: "empathy" | "mentor";
}

export interface WritingPrompt {
  id: string;
  text: string;
  category: "study" | "relationship" | "career" | "general";
}
