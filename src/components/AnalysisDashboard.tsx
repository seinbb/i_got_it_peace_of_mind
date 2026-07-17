import React, { useState, useEffect } from "react";
import { Smile, BookOpen, Sparkles, Send, Check, Copy, Download, ShieldAlert, Heart, Calendar } from "lucide-react";
import { AnalysisResponse } from "../types";
import { motion } from "motion/react";

interface AnalysisDashboardProps {
  analysis: AnalysisResponse;
  dateStr?: string;
  entryId?: string;
  reflectionAnswer?: string;
  onSaveReflection?: (entryId: string, answer: string) => void;
  responseMode?: "empathy" | "mentor";
  diaryContent?: string;
}

const getEmotionMeta = (emotion: string) => {
  const normalized = emotion.trim().replace(/\s+/g, "");
  
  if (normalized.includes("불안") || normalized.includes("걱정")) {
    return {
      emoji: "🌀",
      color: "from-blue-400 to-teal-500",
      textColor: "text-teal-700",
      bgColor: "bg-teal-50",
      borderColor: "border-teal-100",
      comment: "마음속 소용돌이를 달래줄 따뜻한 숨결이 필요해.",
    };
  }
  if (normalized.includes("지침") || normalized.includes("무기력") || normalized.includes("피로")) {
    return {
      emoji: "☁️",
      color: "from-slate-400 to-teal-400",
      textColor: "text-slate-700",
      bgColor: "bg-slate-50",
      borderColor: "border-slate-100",
      comment: "지금은 가만히 멈춰서 보송보송 쉴 준비가 된 때야.",
    };
  }
  if (normalized.includes("외로움") || normalized.includes("소외") || normalized.includes("쓸쓸")) {
    return {
      emoji: "🌙",
      color: "from-emerald-400 to-emerald-600",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
      comment: "어두운 밤에도 달님은 언제나 너의 길을 비춰줄 거야.",
    };
  }
  if (normalized.includes("슬픔") || normalized.includes("우울") || normalized.includes("눈물")) {
    return {
      emoji: "💧",
      color: "from-sky-400 to-blue-500",
      textColor: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
      comment: "마음껏 눈물 흘려도 괜찮아, 맑은 무지개가 비칠 거야.",
    };
  }
  if (normalized.includes("분노") || normalized.includes("화") || normalized.includes("짜증") || normalized.includes("억울")) {
    return {
      emoji: "⚡",
      color: "from-amber-400 to-rose-500",
      textColor: "text-rose-700",
      bgColor: "bg-rose-50",
      borderColor: "border-rose-100",
      comment: "불쑥 솟구친 불꽃도 너를 지키고 싶었던 정당한 울림이야.",
    };
  }
  if (normalized.includes("뿌듯") || normalized.includes("성취") || normalized.includes("자랑")) {
    return {
      emoji: "✨",
      color: "from-yellow-400 to-amber-500",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-100",
      comment: "스스로를 대견해하는 너의 마음이 별처럼 반짝이네.",
    };
  }
  if (normalized.includes("평온") || normalized.includes("편안") || normalized.includes("안정")) {
    return {
      emoji: "🍃",
      color: "from-emerald-400 to-teal-500",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
      comment: "살랑이는 풀잎처럼 한없이 맑고 편안한 호흡이야.",
    };
  }
  if (normalized.includes("행복") || normalized.includes("기쁨") || normalized.includes("설렘")) {
    return {
      emoji: "🌸",
      color: "from-pink-400 to-rose-400",
      textColor: "text-pink-700",
      bgColor: "bg-pink-50",
      borderColor: "border-pink-100",
      comment: "네 마음에 따스한 봄날의 꽃봉오리가 활짝 피었구나.",
    };
  }

  return {
    emoji: "🧸",
    color: "from-emerald-400 to-teal-400",
    textColor: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-100",
    comment: "소중한 너의 감정을 조용히 보듬어줄게.",
  };
};

export default function AnalysisDashboard({
  analysis,
  dateStr,
  entryId,
  reflectionAnswer,
  onSaveReflection,
  responseMode = "empathy",
  diaryContent = "",
}: AnalysisDashboardProps) {
  const { emotion_analysis, empathy_message, recommended_content, reflection_question } = analysis;
  const primaryEmotion = emotion_analysis.primary_emotion;
  const primaryMeta = getEmotionMeta(primaryEmotion);

  const [localAnswer, setLocalAnswer] = useState(reflectionAnswer || "");
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check self-harm danger words in entry content
  const hasDangerTrigger = [
    "죽고 싶", "자살", "자해", "살기 싫", "끝내고 싶", "극단적", "우울증", "끝내려"
  ].some(word => diaryContent.toLowerCase().includes(word));

  useEffect(() => {
    setLocalAnswer(reflectionAnswer || "");
    setIsSaved(false);
    setCopied(false);
  }, [entryId, reflectionAnswer]);

  const handleSave = () => {
    if (onSaveReflection && entryId) {
      onSaveReflection(entryId, localAnswer);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(empathy_message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const fileContent = `[마음쉼 다정한 엽서 - ${dateStr || ""}]\n\n감정 분석: ${primaryEmotion}\n\n위로의 편지:\n${empathy_message}\n\n추천 문학 처방:\n《${recommended_content?.title || ""}》 - ${recommended_content?.author || ""}\n"${recommended_content?.quote || ""}"\n${recommended_content?.reason || ""}\n\n질문 성찰 답변:\n${localAnswer || "(미작성)"}`;
    const blob = new Blob([fileContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `maum_swim_${entryId || Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const actualMode = responseMode || "empathy";

  return (
    <div className="flex flex-col gap-6">
      {/* ⚠️ HIGH PRIORITY SAFETY NOTIFICATION: Crisis Express Card */}
      {hasDangerTrigger && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 border border-rose-200 rounded-3xl p-5 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-2 text-rose-700">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <h4 className="text-xs font-bold">도움의 손길은 언제나 너의 곁에 있어</h4>
          </div>
          <p className="text-[11px] text-rose-600 leading-relaxed">
            마음이 유난히 시리거나 버거워 홀로 감당하기 어려울 땐, 즉시 주위의 <strong>믿을 수 있는 보호자, 학교 상담 선생님, 혹은 긴급 지원 전문가</strong>에게 고민을 나눠봐. 너의 아픔을 함께 나누어 짊어질 따뜻한 손길들이 언제나 준비되어 있단다.
          </p>
          <div className="grid grid-cols-2 gap-2 text-[10px] text-rose-800">
            <div className="bg-white/80 p-2 rounded-xl border border-rose-100 flex flex-col justify-center">
              <span className="font-bold">자살예방 상담전화 (24시간)</span>
              <span className="text-xs font-extrabold text-rose-600 mt-0.5">📞 국번없이 109</span>
            </div>
            <div className="bg-white/80 p-2 rounded-xl border border-rose-100 flex flex-col justify-center">
              <span className="font-bold">청소년 상담전화 (24시간)</span>
              <span className="text-xs font-extrabold text-rose-600 mt-0.5">📞 국번없이 1388</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Primary Emotion Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl p-4 border ${primaryMeta.bgColor} ${primaryMeta.borderColor} flex items-center gap-4`}
      >
        <div className="w-14 h-14 shrink-0 rounded-xl bg-white shadow-2xs flex items-center justify-center text-3xl border border-neutral-100">
          {primaryMeta.emoji}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold text-[#5D664A] bg-[#EAF2E1] px-2 py-0.5 rounded-full uppercase tracking-wider">
              {dateStr || "오늘 밤"}의 주된 마음
            </span>
          </div>
          <h3 className="text-sm font-bold text-gray-800 mt-0.5">
            <span className={`${primaryMeta.textColor}`}>{primaryEmotion}</span>
            <span>을 온전히 마주하고 있어요</span>
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {primaryMeta.comment}
          </p>
        </div>
      </motion.div>

      {/* Ruled Postcard Container */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h4 className="text-xs font-bold text-[#2B2D27] flex items-center gap-1.5">
            <Heart className="w-4 h-4 text-[#5D664A] fill-current" />
            {actualMode === "mentor" ? (
              <span>💚 멘토 선배의 다정한 지혜 엽서 (MENTOR MODE)</span>
            ) : (
              <span>💚 공감 동반자의 다정한 위로 엽서 (EMPATHY MODE)</span>
            )}
          </h4>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-[#F4F3EE] transition-all"
              title="엽서 복사하기"
              id="postcard_copy_btn"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-[#F4F3EE] transition-all"
              title="텍스트 파일로 보관하기"
              id="postcard_download_btn"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The postcard with ruled paper background */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="ruled-postcard rounded-3xl p-8 border border-[#E4E3DD] shadow-md relative overflow-hidden"
        >
          <div className="flex items-center justify-between border-b border-[#5D664A]/10 pb-3 mb-4 text-[10px] text-[#8E9088]">
            <span>발신: 너를 보듬어주는 마음쉼 동반자</span>
            <span className="font-serif">Dear. 소중한 너에게</span>
          </div>

          <p className="text-[13px] text-[#2B2D27] font-sans font-medium tracking-wide whitespace-pre-line break-all pr-1 min-h-[140px] leading-[2.25rem]">
            {empathy_message}
          </p>

          <div className="flex items-center justify-end mt-4 border-t border-[#5D664A]/10 pt-3">
            <span className="text-[10px] text-[#8E9088] italic">언제나 마음 편안한 밤이 되기를</span>
          </div>
        </motion.div>
      </div>

      {/* 오늘의 문학 처방 (Literature Prescription) */}
      {recommended_content && (
        <div className="bg-white rounded-3xl p-5 border border-[#E4E3DD] shadow-sm relative overflow-hidden">
          <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-emerald-50/10 select-none pointer-events-none">
            <BookOpen className="w-32 h-32" />
          </div>

          <div className="flex items-center gap-2 mb-3.5">
            <div className="p-1.5 bg-[#F4F3EE] text-[#5D664A] rounded-xl">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-800">오늘의 문학 처방</h4>
              <p className="text-[9px] text-[#6F7169]">네 마음을 포근하게 어루만지는 활자</p>
            </div>
          </div>

          <div className="relative pl-4 border-l-2 border-[#5D664A]/50 my-4">
            <p className="text-sm text-gray-800 font-medium leading-relaxed font-serif italic mb-2 whitespace-pre-line">
              "{recommended_content.quote}"
            </p>
            <p className="text-[10px] text-gray-500 font-medium text-right">
              — {recommended_content.author}, <span className="font-semibold text-gray-700">《{recommended_content.title}》</span>
            </p>
          </div>

          <div className="bg-[#F9F8F3] rounded-2xl p-3.5 border border-[#E4E3DD]/40 text-xs text-[#2B2D27] leading-relaxed">
            {recommended_content.reason}
          </div>
        </div>
      )}

      {/* 생각해보기 (Self-Reflection Panel) */}
      {reflection_question && (
        <div className="bg-white rounded-3xl p-5 border border-[#E4E3DD] shadow-sm">
          <div className="flex items-center gap-2 mb-3.5">
            <div className="p-1.5 bg-[#F4F3EE] text-[#5D664A] rounded-xl">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-gray-800">마음을 비추는 생각해보기</h4>
              <p className="text-[9px] text-[#6F7169]">스스로 조용히 질문을 마주하는 성찰</p>
            </div>
          </div>

          <div className="bg-[#F9F8F3] rounded-2xl p-3.5 border border-[#E4E3DD]/40 mb-3">
            <p className="text-xs font-bold text-[#2B2D27] leading-relaxed">
              {reflection_question}
            </p>
          </div>

          {entryId && (
            <div className="space-y-2">
              <textarea
                value={localAnswer}
                onChange={(e) => setLocalAnswer(e.target.value)}
                placeholder="조용히 여기에 마음의 소리를 적어볼래? (작성해 둔 답은 언제든 다시 돌아와 읽을 수 있어)"
                className="w-full h-20 p-3.5 text-xs bg-gray-50 border border-neutral-200 rounded-2xl focus:border-[#5D664A] focus:outline-none transition-all resize-none leading-relaxed text-gray-700 placeholder:text-gray-400 focus:bg-white"
                id="reflection_answer_textarea"
              />
              <div className="flex flex-col sm:flex-row gap-2 justify-between sm:items-center">
                <span className="text-[9px] text-[#8E9088]">
                  * 이 성찰 답변은 너의 일기 기록과 함께 영구히 보존돼.
                </span>
                <button
                  onClick={handleSave}
                  disabled={!localAnswer.trim()}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer self-end ${
                    isSaved
                      ? "bg-emerald-600 text-white shadow-sm"
                      : localAnswer.trim()
                      ? "bg-[#5D664A] hover:bg-[#4C533C] text-white shadow-sm active:scale-[0.99]"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  }`}
                  id="save_reflection_btn"
                >
                  {isSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>기록 완료!</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>성찰 기록하기</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ratios Emotional Spectrum Chart */}
      <div className="bg-white rounded-3xl p-5 border border-[#E4E3DD] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Smile className="w-4.5 h-4.5 text-[#5D664A]" />
              나의 감정 비율 스펙트럼
            </h4>
            <p className="text-[9px] text-[#6F7169] mt-0.5">내 마음에 불어온 감정들의 점유율입니다.</p>
          </div>
          <span className="text-[9px] text-[#5D664A] bg-[#EAF2E1] px-2 py-0.5 rounded-md font-bold border border-[#D9E6CB]">
            총합 100%
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {emotion_analysis.ratios.map((ratio, index) => {
            const meta = getEmotionMeta(ratio.emotion);
            return (
              <div key={index} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-[11px]">
                  <div className="flex items-center gap-1 font-bold text-gray-700">
                    <span>{meta.emoji}</span>
                    <span>{ratio.emotion}</span>
                  </div>
                  <span className={`font-mono font-extrabold ${meta.textColor}`}>{ratio.percentage}%</span>
                </div>
                <div className="w-full h-2 bg-gray-50 rounded-full overflow-hidden border border-neutral-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ratio.percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: index * 0.1 }}
                    className={`h-full rounded-full bg-gradient-to-r ${meta.color}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
