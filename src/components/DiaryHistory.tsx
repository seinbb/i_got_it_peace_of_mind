import React, { useState } from "react";
import { Search, Calendar, Trash2, ChevronRight, FileText } from "lucide-react";
import { DiaryEntry } from "../types";

interface DiaryHistoryProps {
  entries: DiaryEntry[];
  selectedId: string | null;
  onSelectEntry: (entry: DiaryEntry) => void;
  onDeleteEntry: (id: string) => void;
}

const getEmotionEmoji = (emotion: string) => {
  const norm = emotion.trim();
  if (norm.includes("불안") || norm.includes("걱정")) return "🌀";
  if (norm.includes("지침") || norm.includes("무기력")) return "☁️";
  if (norm.includes("외로움") || norm.includes("쓸쓸") || norm.includes("소외")) return "🌙";
  if (norm.includes("슬픔") || norm.includes("우울")) return "💧";
  if (norm.includes("분노") || norm.includes("화") || norm.includes("짜증")) return "⚡";
  if (norm.includes("뿌듯") || norm.includes("성취")) return "✨";
  if (norm.includes("평온") || norm.includes("편안")) return "🍃";
  if (norm.includes("행복") || norm.includes("기쁨")) return "🌸";
  return "🧸";
};

export default function DiaryHistory({
  entries,
  selectedId,
  onSelectEntry,
  onDeleteEntry,
}: DiaryHistoryProps) {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredEntries = entries.filter((entry) =>
    entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.analysis.emotion_analysis.primary_emotion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-3xl p-5 border border-emerald-100 shadow-sm flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
          <FileText className="w-4.5 h-4.5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-gray-800">마음 서랍 기록들</h3>
          <p className="text-[10px] text-gray-400">지나온 흔적을 돌이켜볼 수 있어.</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="감정 단어 또는 일기 내용 검색..."
          className="w-full pl-9 pr-3 py-2 bg-gray-50/50 border border-gray-100 rounded-xl text-xs text-gray-700 focus:outline-none focus:border-emerald-300 focus:bg-white transition-all placeholder:text-gray-400"
          id="history_search_input"
        />
      </div>

      {/* Entries List */}
      <div className="flex-1 overflow-y-auto max-h-[380px] pr-1 space-y-2.5">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-10 px-4 border border-dashed border-gray-100 rounded-2xl bg-gray-50/20">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">
              {searchQuery ? "일치하는 기록을 찾지 못했어." : "아직 차곡차곡 쌓인 이야기가 없네."}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const primaryEmotion = entry.analysis.emotion_analysis.primary_emotion;
            const emoji = getEmotionEmoji(primaryEmotion);
            const isSelected = entry.id === selectedId;

            return (
              <div
                key={entry.id}
                onClick={() => onSelectEntry(entry)}
                className={`group p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 relative ${
                  isSelected
                    ? "bg-emerald-500/10 border-emerald-300 shadow-xs"
                    : "bg-white/50 border-gray-100 hover:border-emerald-200 hover:bg-white"
                }`}
                id={`history_entry_${entry.id}`}
              >
                {/* Emotion Badge icon */}
                <div className="w-10 h-10 shrink-0 rounded-xl bg-gray-50 flex items-center justify-center text-xl shadow-xs border border-gray-100 group-hover:scale-105 transition-transform">
                  {emoji}
                </div>

                {/* Snippet Content */}
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <Calendar className="w-3 h-3 text-gray-300" />
                    <span>{entry.date}</span>
                    <span>•</span>
                    <span>{entry.time}</span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-800 mt-1 truncate">
                    주된 감정: <span className="text-emerald-600">{primaryEmotion}</span>
                  </h4>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 break-all">
                    {entry.content}
                  </p>
                </div>

                {/* Delete and Action Controls */}
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteEntry(entry.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="지우기"
                    id={`delete_entry_btn_${entry.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${isSelected ? "text-emerald-500 translate-x-0.5" : "group-hover:translate-x-0.5"}`} />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="text-[10px] text-gray-400 text-center mt-3 pt-3 border-t border-gray-100">
        일기는 안전하게 너의 기기에만 저장돼.
      </div>
    </div>
  );
}
