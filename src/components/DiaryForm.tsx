import React, { useState } from "react";
import { Key, BookOpen, Smile, Sparkles, Send, Info } from "lucide-react";

interface DiaryFormProps {
  onSubmit: (diaryText: string, mode: "empathy" | "mentor") => void;
  isLoading: boolean;
  apiKey: string;
  onSetApiKeyClick: () => void;
}

export default function DiaryForm({
  onSubmit,
  isLoading,
  apiKey,
  onSetApiKeyClick,
}: DiaryFormProps) {
  const [diaryText, setDiaryText] = useState<string>("");
  const [responseMode, setResponseMode] = useState<"empathy" | "mentor">("empathy");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (diaryText.trim() && !isLoading) {
      onSubmit(diaryText, responseMode);
    }
  };

  const wordCount = diaryText.length;

  return (
    <div className="flex flex-col gap-6">
      {/* Title Header Section */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-[#2B2D27] tracking-tight">
          오늘 밤, 어떤 마음을 안고 있나요?
        </h2>
        <p className="text-xs text-[#6F7169] leading-relaxed">
          숨겨왔던 상처, 친구와의 말 못할 다툼, 혹은 혼자만의 불안까지 어떤 이야기든 이곳에 흘려보내 주세요. 너만을 위한 쉼터가 열립니다.
        </p>
      </div>

      {/* Gemini API Key Config Box */}
      <div className="flex items-center justify-between p-3.5 bg-white border border-[#E4E3DD] rounded-2xl shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#F4F3EE] rounded-xl text-[#5D664A]">
            <Key className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-[#2B2D27]">Gemini API 키 설정</span>
          {apiKey ? (
            <span className="bg-[#EAF2E1] text-[#5D664A] text-[10px] font-bold py-0.5 px-2.5 rounded-full border border-[#D9E6CB]">
              적용됨
            </span>
          ) : (
            <span className="bg-amber-50 text-amber-700 text-[10px] font-bold py-0.5 px-2.5 rounded-full border border-amber-200">
              미설정
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onSetApiKeyClick}
          className="text-xs font-bold text-[#6F7169] hover:text-[#2B2D27] underline transition-colors"
          id="form_api_key_set_btn"
        >
          설정하기
        </button>
      </div>

      {/* Diary Card */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white border border-[#E4E3DD] rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-[#F4F3EE] pb-3">
            <div className="flex items-center gap-2 text-[#5D664A]">
              <BookOpen className="w-4.5 h-4.5" />
              <span className="text-xs font-bold text-[#2B2D27]">너의 솔직한 마음 기록</span>
            </div>
            <span className="text-[11px] font-medium text-[#8E9088] font-mono">
              {wordCount}자
            </span>
          </div>

          <textarea
            value={diaryText}
            onChange={(e) => setDiaryText(e.target.value)}
            disabled={isLoading}
            placeholder="아무에게도 털어놓지 못했던 깊은 속마음을 따뜻한 차 한 잔을 마시듯 찬찬히 적어내려가 보세요. 고민의 시작점부터 지금의 감정까지 모두 소중해요..."
            className="w-full min-h-[180px] text-xs text-gray-700 placeholder-[#9A9B94] leading-relaxed resize-none focus:outline-none bg-transparent"
            id="diary_write_textarea"
          />
        </div>

        {/* Response Mode Selector Section */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-[#2B2D27] block">
            편지의 향기 (답변 모드 선택)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Empathy Mode Option */}
            <button
              type="button"
              onClick={() => setResponseMode("empathy")}
              className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                responseMode === "empathy"
                  ? "bg-[#F9F8F3] border-[#5D664A] shadow-xs"
                  : "bg-white border-[#E4E3DD] hover:border-[#C3C2BC]"
              }`}
              id="mode_empathy_btn"
            >
              <div className="flex-1 space-y-1">
                <span className="text-xs font-bold text-[#2B2D27] block">공감 중심</span>
                <span className="text-[10px] text-[#6F7169] leading-relaxed block">
                  단짝 친구가 기댈 어깨를 주듯, 아픔과 고통을 온전히 안아줍니다.
                </span>
              </div>
              <div className={`p-1.5 rounded-full shrink-0 ${responseMode === "empathy" ? "bg-[#5D664A] text-white" : "bg-[#F4F3EE] text-gray-400"}`}>
                <Smile className="w-4 h-4" />
              </div>
            </button>

            {/* Mentor Mode Option */}
            <button
              type="button"
              onClick={() => setResponseMode("mentor")}
              className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                responseMode === "mentor"
                  ? "bg-[#F9F8F3] border-[#5D664A] shadow-xs"
                  : "bg-white border-[#E4E3DD] hover:border-[#C3C2BC]"
              }`}
              id="mode_mentor_btn"
            >
              <div className="flex-1 space-y-1">
                <span className="text-xs font-bold text-[#2B2D27] block">해결 중심</span>
                <span className="text-[10px] text-[#6F7169] leading-relaxed block">
                  든든한 등대처럼, 고민을 가볍게 풀 수 있는 작은 실천을 짚어줍니다.
                </span>
              </div>
              <div className={`p-1.5 rounded-full shrink-0 ${responseMode === "mentor" ? "bg-[#5D664A] text-white" : "bg-[#F4F3EE] text-gray-400"}`}>
                <Sparkles className="w-4 h-4" />
              </div>
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || wordCount < 5}
          className={`w-full py-4 rounded-2xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-2 ${
            isLoading || wordCount < 5
              ? "bg-[#E4E3DD] text-[#8E9088] cursor-not-allowed"
              : "bg-[#5D664A] hover:bg-[#4C533C] active:scale-[0.99] text-white shadow-[#D9E6CB]"
          }`}
          id="diary_submit_btn"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-[#C3C2BC]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>마음 날려보내는 중...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>마음 실어 편지 받아보기</span>
            </>
          )}
        </button>
      </form>

      {/* Guide Banner */}
      <div className="flex items-start gap-2.5 p-3.5 bg-white border border-[#E4E3DD] rounded-2xl shadow-2xs">
        <Info className="w-4 h-4 text-[#5D664A] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#6F7169] leading-relaxed">
          <strong>마음쉼 100% 안심 가이드:</strong> 마음에 담기 위한 익명 감정분석 목적으로만 일시적으로 사용됩니다. 안심하고 너의 깊은 바다를 그려줘.
        </p>
      </div>
    </div>
  );
}
