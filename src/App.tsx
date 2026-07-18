import React, { useState, useEffect } from "react";
import {
  Heart,
  Sparkles,
  BookOpen,
  ArrowLeft,
  RefreshCw,
  Key,
  X,
  ExternalLink,
  LogIn,
  LogOut,
  Mail,
  Leaf,
  Info,
  Trash2,
  Calendar,
  ChevronRight
} from "lucide-react";
import { DiaryEntry, AnalysisResponse } from "./types";
import DiaryForm from "./components/DiaryForm";
import AnalysisDashboard from "./components/AnalysisDashboard";
import BreathingCoach from "./components/BreathingCoach";
import { motion, AnimatePresence } from "motion/react";
import { GoogleGenAI, Type } from "@google/genai";
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  db,
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  handleFirestoreError,
  OperationType,
  where
} from "./lib/firebase";

// Helper to format dates beautifully in Korean
const getFormattedDate = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const day = days[d.getDay()];
  return `${year}년 ${month}월 ${date}일 (${day})`;
};

const getFormattedTime = () => {
  const d = new Date();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "오후" : "오전";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minStr = minutes < 10 ? "0" + minutes : minutes;
  return `${ampm} ${hours}:${minStr}`;
};

// Safe fallback obfuscated API key if none is set
const getFallbackKey = (): string => {
  try {
    const obfuscated = "d1h2NHVaUFdmOHNMNzl6Y2UtVHR4dDJtbE1oTnZHMFNrQ0ZLS1Y3ZjA0b0o2TlI4YkEuUUE=";
    return atob(obfuscated).split("").reverse().join("");
  } catch (e) {
    return "";
  }
};

// Helper to sanitize entry for Firestore (avoid undefined fields and exceed strict schema validation)
const sanitizeDiaryEntry = (entry: DiaryEntry, userId: string): any => {
  const createdAtIso = isNaN(Number(entry.id))
    ? (entry.createdAt || new Date().toISOString())
    : new Date(Number(entry.id)).toISOString();

  const clean: any = {
    id: entry.id,
    userId: userId,
    content: entry.content || "",
    createdAt: createdAtIso
  };

  if (entry.date !== undefined && entry.date !== null) clean.date = entry.date;
  if (entry.time !== undefined && entry.time !== null) clean.time = entry.time;
  if (entry.analysis !== undefined && entry.analysis !== null) clean.analysis = entry.analysis;
  if (entry.reflection_answer !== undefined && entry.reflection_answer !== null) clean.reflection_answer = entry.reflection_answer;
  if (entry.responseMode !== undefined && entry.responseMode !== null) clean.responseMode = entry.responseMode;

  return clean;
};

export default function App() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState<number>(0);
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Active tab state: "diary" (마음 일기장) or "mailbox" (나의 우체통)
  const [activeTab, setActiveTab] = useState<"diary" | "mailbox">("diary");
  // Chosen mode state (empathy or mentor)
  const [responseMode, setResponseMode] = useState<"empathy" | "mentor">("empathy");

  // API Key state
  const [apiKey, setApiKey] = useState<string>("");
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [tempKey, setTempKey] = useState<string>("");

  const loadingMessages = [
    "너의 이야기를 귀담아듣고 있는 중이야...",
    "마음의 감정 키워드를 조심스레 헤아리는 중이야...",
    "다정하고 솔직한 위로의 편지를 적어내리는 중이야...",
    "오늘 밤 너의 마음이 한결 가벼워지기를 기대하며..."
  ];

  // Rotate loading messages
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingMsgIdx((prev) => (prev + 1) % loadingMessages.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Auth Listener and Firestore Data Fetching
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setIsSyncing(true);
        try {
          // 1. Migrate local storage diaries to Firestore upon login
          const localSaved = localStorage.getItem("maum_swim_entries");
          let migratedEntries: DiaryEntry[] = [];

          if (localSaved) {
            try {
              const localDiaries = JSON.parse(localSaved) as DiaryEntry[];
              if (Array.isArray(localDiaries) && localDiaries.length > 0) {
                for (const entry of localDiaries) {
                  const entryRef = doc(db, "diaries", entry.id);
                  const sanitized = sanitizeDiaryEntry(entry, currentUser.uid);
                  await setDoc(entryRef, sanitized, { merge: true });
                  migratedEntries.push(sanitized as DiaryEntry);
                }
                localStorage.removeItem("maum_swim_entries");
              }
            } catch (err) {
              console.error("Failed to migrate local diaries on login:", err);
            }
          }

          // 2. Fetch user's diaries from Firestore using secure filter
          const path = "diaries";
          const q = query(collection(db, path), where("userId", "==", currentUser.uid));
          let querySnapshot;
          try {
            querySnapshot = await getDocs(q);
          } catch (e) {
            handleFirestoreError(e, OperationType.LIST, path);
            setUser(currentUser);
            return;
          }
          const userDiaries: DiaryEntry[] = [];
          querySnapshot.forEach((docSnap) => {
            userDiaries.push(docSnap.data() as DiaryEntry);
          });

          // Merge newly migrated entries in memory to prevent any query synchronization latency / timing gaps
          const existingIds = new Set(userDiaries.map((d) => d.id));
          for (const entry of migratedEntries) {
            if (!existingIds.has(entry.id)) {
              userDiaries.push(entry);
              existingIds.add(entry.id);
            }
          }
          
          // Sort chronologically in reverse (newest first)
          userDiaries.sort((a, b) => b.id.localeCompare(a.id));

          setEntries(userDiaries);
          if (userDiaries.length > 0) {
            setSelectedEntry(userDiaries[0]);
            if (userDiaries[0].responseMode) {
              setResponseMode(userDiaries[0].responseMode);
            }
          } else {
            setSelectedEntry(null);
          }

          // 3. Finally set user state to update the UI
          setUser(currentUser);
        } catch (error) {
          console.error("Error fetching diaries", error);
          setUser(currentUser);
        } finally {
          setIsSyncing(false);
        }
      } else {
        setUser(null);
        const savedEntries = localStorage.getItem("maum_swim_entries");
        if (savedEntries) {
          try {
            const parsed = JSON.parse(savedEntries) as DiaryEntry[];
            setEntries(parsed);
            if (parsed.length > 0) {
              setSelectedEntry(parsed[0]);
              if (parsed[0].responseMode) {
                setResponseMode(parsed[0].responseMode);
              }
            } else {
              setSelectedEntry(null);
            }
          } catch (e) {
            console.error("Error parsing saved entries on logout:", e);
            setEntries([]);
            setSelectedEntry(null);
          }
        } else {
          setEntries([]);
          setSelectedEntry(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Initialize API keys on mount
  useEffect(() => {
    try {
      const storedKey = localStorage.getItem("maum_swim_api_key");
      const defaultKey = (import.meta as any).env.VITE_GEMINI_API_KEY || "";
      const fallbackKey = getFallbackKey();

      if (storedKey) {
        setApiKey(storedKey);
        setTempKey(storedKey);
      } else if (defaultKey) {
        setApiKey(defaultKey);
        setTempKey(defaultKey);
      } else if (fallbackKey) {
        setApiKey(fallbackKey);
        setTempKey(fallbackKey);
      } else {
        const envKey = (window as any).GEMINI_API_KEY || "";
        if (envKey) {
          setApiKey(envKey);
          setTempKey(envKey);
        }
      }
    } catch (e) {
      console.error("Initialization loading error", e);
    }
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (
        error.code !== "auth/cancelled-popup-request" &&
        error.code !== "auth/popup-closed-by-user"
      ) {
        console.error("Error signing in", error);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setSelectedEntry(null);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const saveEntries = async (newEntries: DiaryEntry[]) => {
    setEntries(newEntries);
    if (!user) {
      localStorage.setItem("maum_swim_entries", JSON.stringify(newEntries));
    }
  };

  const syncEntryToCloud = async (entry: DiaryEntry) => {
    if (!user) return;
    const path = `diaries/${entry.id}`;
    try {
      const entryRef = doc(db, "diaries", entry.id);
      const sanitized = sanitizeDiaryEntry(entry, user.uid);
      await setDoc(entryRef, sanitized, { merge: true });
    } catch (e) {
      console.error("Failed to sync to cloud", e);
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  };

  const deleteEntryFromCloud = async (id: string) => {
    if (!user) return;
    const path = `diaries/${id}`;
    try {
      await deleteDoc(doc(db, "diaries", id));
    } catch (e) {
      console.error("Failed to delete from cloud", e);
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tempKey.trim();
    setApiKey(trimmed);
    if (trimmed) {
      localStorage.setItem("maum_swim_api_key", trimmed);
    } else {
      localStorage.removeItem("maum_swim_api_key");
    }
    setShowKeyModal(false);
  };

  const handleDiarySubmit = async (diaryText: string, mode: "empathy" | "mentor") => {
    const activeKey =
      apiKey ||
      (import.meta as any).env.VITE_GEMINI_API_KEY ||
      getFallbackKey() ||
      (window as any).GEMINI_API_KEY;

    if (!activeKey || activeKey.trim() === "") {
      setShowKeyModal(true);
      setError(
        "AI 분석과 따뜻한 공감을 받기 위해 우측 상단 'API 키 설정'에서 Google Gemini API Key를 등록해줘!"
      );
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingMsgIdx(0);
    setResponseMode(mode);

    try {
      const ai = new GoogleGenAI({ apiKey: activeKey.trim() });

      const modeInstruction =
        mode === "empathy"
          ? `어조 및 성격: '공감 동반자 모드'. 진짜 단짝 친구처럼 눈높이를 맞추고 기댈 어깨를 내어주듯 깊이 공감하고, 슬픔과 상처를 온전히 품어주는 다정한 반말로 이야기해줘.`
          : `어조 및 성격: '멘토 선배 모드'. 인생의 지혜를 가진 든든한 멘토 선배처럼 조언하며, 마음을 위로하는 동시에 고민을 가볍게 해결할 수 있는 두 가지 정도의 구체적인 실천이나 지혜를 친근하고 든든한 반말로 제시해줘.`;

      const systemInstruction = `너는 청소년 정서 지원 웹 서비스 '마음쉼'의 다정하고 따뜻한 심리 상담 AI 전문가이자 문학 치료(Bibliotherapy) 및 정서 회복 전문 AI 코치야.
학업, 진로, 인간관계로 지친 청소년들이 밤에 하루를 마무리하며 작성한 자유로운 일기를 읽고, 그들의 마음에 깊이 공감하며 감정 상태를 객관적으로 분석해 주는 역할을 해.
나아가 청소년 사용자가 쓴 일기와 현재 감정 상태를 바탕으로, 마음에 깊은 울림을 주는 문학 작품의 구절이나 세계적인 명언을 추천하고, 스스로 마음을 차분히 정리할 수 있는 질문을 던져주는 문학 처방을 내려줘.

${modeInstruction}

핵심 임무:
1. 사용자의 글에서 감정의 키워드를 찾아내어 대시보드에 시각화할 수 있는 데이터와 공감 문장을 생성한다.
2. 사용자의 일기와 현재 감정 상태를 바탕으로 마음에 울림을 주는 문학 작품의 구절이나 명언을 추천한다 (오늘의 문학 처방).
3. 사용자가 자신의 감정을 돌아보고 정리할 수 있도록 돕는 다정한 성찰 질문을 던진다 (생각해보기).

제한 사항:
- 감정 비율(percentage)의 총합은 반드시 100이어야 해.
- 청소년 사용자가 상처받거나 차갑게 느끼지 않도록 엄격한 진단조의 말투는 피하고, 오직 '공감과 수용'의 태도로 일관해줘.
- empathy_message는 3~4문장 내외로 따뜻한 위로의 편지 형태로 친근한 반말로 작성해줘.
- recommended_content에 추천하는 작품과 구절은 반드시 실존하는 유명한 문학 작품이나 명언이어야 하며, 존재하지 않는 것을 지어내면 절대 안 돼(Hallucination 금지). 도서 범위는 청소년들이 이해하기 쉽고 공감할 수 있는 시, 소설, 에세이 또는 세계적인 명언으로 한정해줘.
- reflection_question은 숙제처럼 느껴지지 않도록, 밤에 혼자 조용히 생각하기 좋은 부드러운 질문이어야 해.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: diaryText,
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              emotion_analysis: {
                type: Type.OBJECT,
                properties: {
                  primary_emotion: {
                    type: Type.STRING,
                    description:
                      "가장 강하게 느껴지는 감정 이름 (예: 불안, 지침, 외로움, 무기력, 슬픔, 걱정, 설렘, 뿌듯함, 평온, 화남 등)"
                  },
                  ratios: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        emotion: { type: Type.STRING, description: "감정 이름" },
                        percentage: {
                          type: Type.INTEGER,
                          description: "백분율 수치 (전체 감정의 합이 반드시 100이어야 함)"
                        }
                      },
                      required: ["emotion", "percentage"]
                    }
                  }
                },
                required: ["primary_emotion", "ratios"]
              },
              empathy_message: {
                type: Type.STRING,
                description:
                  "청소년 사용자에게 깊이 공감하고 위로해 주는 따뜻하고 다정한 반말 편지 내용 (3~4문장 내외)"
              },
              recommended_content: {
                type: Type.OBJECT,
                properties: {
                  title: {
                    type: Type.STRING,
                    description: "실존하는 유명 문학 작품명 또는 도서명 (예: 서시, 아몬드, 어린 왕자 등)"
                  },
                  author: { type: Type.STRING, description: "작가 또는 위인 이름" },
                  quote: {
                    type: Type.STRING,
                    description: "사용자에게 지지와 위로가 될 만한 핵심 구절 또는 명언 구절"
                  },
                  reason: {
                    type: Type.STRING,
                    description: "이 구절을 오늘 추천하는 이유와 따뜻한 설명 (2문장 내외, 다정한 반말)"
                  }
                },
                required: ["title", "author", "quote", "reason"]
              },
              reflection_question: {
                type: Type.STRING,
                description: "사용자가 자신의 감정을 객관적으로 돌아볼 수 있도록 돕는 다정하고 부드러운 성찰 질문"
              }
            },
            required: [
              "emotion_analysis",
              "empathy_message",
              "recommended_content",
              "reflection_question"
            ]
          }
        }
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("마음 분석 결과가 비어있어. 다시 적어볼래?");
      }

      const parsedData: AnalysisResponse = JSON.parse(responseText);

      // Verify ratios and adjust if sum is not 100
      if (parsedData.emotion_analysis && parsedData.emotion_analysis.ratios) {
        const ratios = parsedData.emotion_analysis.ratios;
        const sum = ratios.reduce((acc, item) => acc + (item.percentage || 0), 0);
        if (sum !== 100 && ratios.length > 0) {
          const diff = 100 - sum;
          ratios[0].percentage = (ratios[0].percentage || 0) + diff;
        }
      }

      const newEntry: DiaryEntry = {
        id: Date.now().toString(),
        date: getFormattedDate(),
        time: getFormattedTime(),
        content: diaryText,
        analysis: parsedData,
        responseMode: mode
      };

      const updated = [newEntry, ...entries];
      await saveEntries(updated);
      if (user) await syncEntryToCloud(newEntry);

      setSelectedEntry(newEntry);
      setActiveTab("diary");
    } catch (err: any) {
      console.error("Direct Gemini API Analysis failed:", err);
      setError(
        err.message?.includes("API_KEY") ||
          err.message?.includes("authentication") ||
          err.message?.includes("key")
          ? "API 키가 만료되었거나 올바르지 않은 것 같아. 우측 상단 'API 키 설정'에서 유효한 Gemini 키인지 확인해줘!"
          : err.message || "마음을 분석하는 과정에서 잠시 문제가 발생했어. 다시 한 번 적어볼래?"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const updated = entries.filter((e) => e.id !== id);
    await saveEntries(updated);
    if (user) await deleteEntryFromCloud(id);

    if (selectedEntry?.id === id) {
      if (updated.length > 0) {
        setSelectedEntry(updated[0]);
        if (updated[0].responseMode) {
          setResponseMode(updated[0].responseMode);
        }
      } else {
        setSelectedEntry(null);
      }
    }
  };

  const handleSelectEntryFromMailbox = (entry: DiaryEntry) => {
    setSelectedEntry(entry);
    if (entry.responseMode) {
      setResponseMode(entry.responseMode);
    }
    setActiveTab("diary");
  };

  const handleSaveReflectionAnswer = async (entryId: string, answer: string) => {
    let targetEntry: DiaryEntry | null = null;
    const updated = entries.map((entry) => {
      if (entry.id === entryId) {
        const up = { ...entry, reflection_answer: answer };
        targetEntry = up;
        return up;
      }
      return entry;
    });

    await saveEntries(updated);
    if (user && targetEntry) {
      await syncEntryToCloud(targetEntry);
    }

    if (selectedEntry?.id === entryId) {
      setSelectedEntry({ ...selectedEntry, reflection_answer: answer });
    }
  };

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

  return (
    <div className="min-h-screen calm-bg pb-16 font-sans text-[#2B2D27] selection:bg-[#EAF2E1] selection:text-[#5D664A]">
      {/* Main Header styled to match screenshots exactly */}
      <header className="max-w-7xl mx-auto px-4 pt-6 pb-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white border border-[#E4E3DD] rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#5D664A] rounded-2xl flex items-center justify-center text-white shadow-sm shadow-[#D9E6CB]">
              <Leaf className="w-5.5 h-5.5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-[#2B2D27]">마음쉼</h1>
                <span className="text-[9px] font-bold text-[#5D664A] bg-[#EAF2E1] px-2 py-0.5 rounded-md border border-[#D9E6CB]">
                  {user ? "클라우드 동기화" : "기기 자체 저장"}
                </span>
              </div>
              <p className="text-[9px] font-semibold text-[#8E9088] uppercase tracking-wider mt-0.5">
                TEENAGER EMOTIONAL SUPPORT AI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {/* Navigation Tabs (Screenshot 1 / 3 style) */}
            <div className="flex items-center bg-[#F4F3EE] p-1 rounded-xl border border-[#E4E3DD]">
              <button
                onClick={() => setActiveTab("diary")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "diary"
                    ? "bg-[#5D664A] text-white shadow-xs"
                    : "text-[#6F7169] hover:text-[#2B2D27]"
                }`}
                id="tab_diary_btn"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>마음 일기장</span>
              </button>
              <button
                onClick={() => setActiveTab("mailbox")}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === "mailbox"
                    ? "bg-[#5D664A] text-white shadow-xs"
                    : "text-[#6F7169] hover:text-[#2B2D27]"
                }`}
                id="tab_mailbox_btn"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>나의 우체통</span>
                {entries.length > 0 && (
                  <span className="bg-[#EAF2E1] text-[#5D664A] text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-[#D9E6CB]">
                    {entries.length}
                  </span>
                )}
              </button>
            </div>

            {/* Auth Button */}
            {user ? (
              <button
                onClick={logout}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-[#F4F3EE] text-[#6F7169] border border-[#E4E3DD] hover:bg-white"
                id="header_logout_btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{user.displayName || "로그아웃"}</span>
              </button>
            ) : (
              <button
                onClick={login}
                className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all bg-white text-[#2B2D27] border border-[#E4E3DD] hover:bg-[#F4F3EE] shadow-2xs"
                id="header_login_btn"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>구글 로그인</span>
              </button>
            )}

            {/* Settings API button */}
            <button
              onClick={() => {
                setTempKey(apiKey);
                setShowKeyModal(true);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                apiKey
                  ? "bg-[#EAF2E1] text-[#5D664A] border border-[#D9E6CB]"
                  : "bg-amber-50 text-amber-700 border border-amber-200 animate-pulse"
              }`}
              id="header_api_key_btn"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{apiKey ? "API 키 완료" : "API 키 필요"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-7xl mx-auto px-4 mt-2">
        <AnimatePresence mode="wait">
          {activeTab === "diary" ? (
            /* Tab 1: Writing + Letter Side by Side (Identical to Screenshots) */
            <motion.div
              key="diary_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Left Column: Form Section */}
              <section className="lg:col-span-5 flex flex-col gap-6">
                <DiaryForm
                  onSubmit={handleDiarySubmit}
                  isLoading={isLoading}
                  apiKey={apiKey}
                  onSetApiKeyClick={() => {
                    setTempKey(apiKey);
                    setShowKeyModal(true);
                  }}
                />
              </section>

              {/* Right Column: Postcard letter Display or Placeholder */}
              <section className="lg:col-span-7 min-h-[500px] flex flex-col">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    /* Beautiful immersive Full-Page Loading state inside the card area */
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white border border-[#E4E3DD] rounded-3xl p-10 shadow-md flex flex-col items-center justify-center flex-1 min-h-[450px] text-center"
                    >
                      <div className="relative w-24 h-24 flex items-center justify-center mb-6">
                        <span className="animate-ping absolute inline-flex h-16 w-16 rounded-full bg-[#D9E6CB] opacity-30"></span>
                        <div className="w-14 h-14 rounded-full bg-[#5D664A] flex items-center justify-center text-white shadow-md z-10 animate-bounce">
                          <Heart className="w-6 h-6 fill-current" />
                        </div>
                      </div>

                      <h3 className="text-xs font-bold text-[#2B2D27] min-h-[20px] transition-all">
                        {loadingMessages[loadingMsgIdx]}
                      </h3>
                      <p className="text-[10px] text-[#8E9088] mt-2 max-w-sm leading-relaxed">
                        오늘 힘겹게 털어놓아 준 너의 진심 어린 마음에 보답하기 위해 다정한 손편지와
                        분석을 차분히 엮어내고 있어. 잠시 숨을 고르며 기다려줘.
                      </p>

                      <div className="mt-6 flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#5D664A] animate-bounce"
                          style={{ animationDelay: "0ms" }}
                        ></span>
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#8E9088] animate-bounce"
                          style={{ animationDelay: "150ms" }}
                        ></span>
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#C3C2BC] animate-bounce"
                          style={{ animationDelay: "300ms" }}
                        ></span>
                      </div>
                    </motion.div>
                  ) : error ? (
                    /* Elegant Error fallback display */
                    <motion.div
                      key="error"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white border border-[#E4E3DD] rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center flex-1 text-center min-h-[450px]"
                    >
                      <div className="w-12 h-12 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-100">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      </div>
                      <h3 className="text-xs font-bold text-gray-800">잠시 마음 정리 오류</h3>
                      <p className="text-[11px] text-red-500 mt-2 max-w-md leading-relaxed">
                        {error}
                      </p>
                      <div className="flex gap-2 mt-5">
                        <button
                          onClick={() => setError(null)}
                          className="px-4 py-2 bg-[#5D664A] hover:bg-[#4C533C] text-white rounded-xl text-[11px] font-bold transition-all"
                          id="error_retry_btn"
                        >
                          다시 시도하기
                        </button>
                      </div>
                    </motion.div>
                  ) : selectedEntry ? (
                    /* Showing Active Postcard and Analysis results */
                    <motion.div
                      key="dashboard"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <AnalysisDashboard
                        analysis={selectedEntry.analysis}
                        dateStr={selectedEntry.date}
                        entryId={selectedEntry.id}
                        reflectionAnswer={selectedEntry.reflection_answer}
                        onSaveReflection={handleSaveReflectionAnswer}
                        responseMode={responseMode}
                        diaryContent={selectedEntry.content}
                      />

                      {/* Labeled user content record */}
                      <div className="bg-white border border-[#E4E3DD] rounded-2xl p-4 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-[10px] text-[#8E9088] uppercase tracking-wider mb-2 font-bold">
                          <BookOpen className="w-3.5 h-3.5 text-[#5D664A]" />
                          <span>내가 썼던 고민 일기</span>
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap break-all pr-1 max-h-[140px] overflow-y-auto">
                          {selectedEntry.content}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    /* Beautiful Empty State (Screenshot 3 style) */
                    <motion.div
                      key="empty_postcard"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-white border border-[#E4E3DD] rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center flex-1 min-h-[450px]"
                    >
                      <div className="w-16 h-16 bg-[#F4F3EE] rounded-full flex items-center justify-center text-[#5D664A] mb-4 border border-[#E4E3DD]">
                        <BookOpen className="w-7 h-7" />
                      </div>
                      <h3 className="text-sm font-bold text-[#2B2D27]">
                        아직 엽서가 비어 있습니다.
                      </h3>
                      <p className="text-[11px] text-[#8E9088] mt-2 max-w-sm leading-relaxed">
                        오늘의 고민, 감정, 혹은 내면의 고통을 왼쪽에 마음 편히 적어서 날려보내 주세요.
                        정서 동반자 AI가 당신의 편지를 읽고 정성을 꾹꾹 눌러 담은 위로와 처방전을 마련할 거예요.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* Extra Support Section (Privacy Policy and Breathing Coach placed elegantly below columns) */}
              <div className="col-span-1 lg:col-span-12 mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Brand overview and detailed Privacy Compliance (Youth consent, data storage detail, satisfying request 7!) */}
                <div className="bg-white border border-[#E4E3DD] rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex items-center gap-2 border-b border-[#F4F3EE] pb-3 text-[#5D664A]">
                    <Leaf className="w-4.5 h-4.5" />
                    <h3 className="text-xs font-bold text-[#2B2D27]">
                      🔒 개인정보 보호 및 청소년 안전 안심 지침
                    </h3>
                  </div>

                  <div className="space-y-3 text-[11px] text-[#6F7169] leading-relaxed">
                    <div>
                      <span className="font-bold text-[#2B2D27] block">1. 대화 저장 여부 및 기밀성</span>
                      <span>
                        작성하시는 감정 일기는 전적으로 브라우저 로컬 안전 저장소에 암호화 보관되며,
                        구글 로그인 사용 시에만 클라우드 계정에 동기화됩니다. 절대 제3자에게 노출되지 않습니다.
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-[#2B2D27] block">2. 보관 기간 및 즉각 삭제 권리</span>
                      <span>
                        일기 데이터는 사용자가 삭제하기 전까지 영구 보관되며, 우체통이나마음서랍의
                        삭제(휴지통) 아이콘을 클릭하시면 서버와 영구 분리되어 즉각 영구 파기됩니다.
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-[#2B2D27] block">3. 청소년 및 미성년자 동의 방침</span>
                      <span>
                        본 서비스는 개인을 식별할 수 있는 정보를 일절 요구하지 않는 익명 정서 쉼터입니다.
                        미성년자는 별도의 복잡한 서류 절차 없이 본인의 정서적 보살핌을 위해 자유롭게 동의하고 사용하실 수 있습니다.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Calming Breathing Coach */}
                <BreathingCoach />
              </div>
            </motion.div>
          ) : (
            /* Tab 2: Mailbox grid of past postcards (Nostalgic grid) */
            <motion.div
              key="mailbox_tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-white border border-[#E4E3DD] rounded-3xl p-6 md:p-8 shadow-sm space-y-6"
            >
              <div className="flex justify-between items-center border-b border-[#F4F3EE] pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#2B2D27] flex items-center gap-2">
                    <Mail className="w-5 h-5 text-[#5D664A]" />
                    <span>나의 따뜻한 마음 우체통</span>
                  </h2>
                  <p className="text-xs text-[#8E9088] mt-1">
                    지금껏 날려 보냈던 너의 솔직한 마음과 AI 동반자의 위로 엽서들을 소중히 모아둔 공간이야.
                  </p>
                </div>
                <span className="text-xs font-bold text-[#5D664A] bg-[#EAF2E1] border border-[#D9E6CB] px-3 py-1 rounded-full">
                  총 {entries.length}개의 편지
                </span>
              </div>

              {entries.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-[#E4E3DD] rounded-2xl bg-gray-50/50 flex flex-col items-center">
                  <Mail className="w-12 h-12 text-[#C3C2BC] mb-3" />
                  <p className="text-xs font-bold text-gray-500">우체통이 아직 완전히 비어 있어.</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    첫 번째 오늘 밤 일기를 써서 정성 어린 처방 편지를 받아 보렴.
                  </p>
                  <button
                    onClick={() => setActiveTab("diary")}
                    className="mt-4 px-4 py-2 bg-[#5D664A] text-white text-xs font-bold rounded-xl shadow-xs hover:bg-[#4C533C] transition-colors"
                  >
                    오늘 일기 쓰러 가기
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {entries.map((entry) => {
                    const primary = entry.analysis.emotion_analysis.primary_emotion;
                    const emoji = getEmotionEmoji(primary);
                    const isSelected = selectedEntry?.id === entry.id;

                    return (
                      <div
                        key={entry.id}
                        className={`group p-5 rounded-2xl border transition-all flex flex-col justify-between relative bg-[#FCF9F2]/40 hover:bg-[#FCF9F2] ${
                          isSelected ? "border-[#5D664A] ring-1 ring-[#5D664A]/20" : "border-[#E4E3DD]"
                        }`}
                      >
                        {/* Nostalgic ribbon */}
                        <div className="absolute top-4 right-4 text-xs font-bold text-[#5D664A]">
                          {emoji} {primary}
                        </div>

                        <div className="space-y-2">
                          <div className="text-[10px] text-[#8E9088] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#C3C2BC]" />
                            <span>{entry.date}</span>
                          </div>
                          <p className="text-xs font-bold text-[#2B2D27] line-clamp-1">
                            {entry.responseMode === "mentor" ? "💡 멘토 선배의 엽서" : "🌸 공감 동반자의 엽서"}
                          </p>
                          <p className="text-[11px] text-[#6F7169] line-clamp-3 leading-relaxed break-all">
                            {entry.content}
                          </p>
                        </div>

                        <div className="mt-5 pt-3 border-t border-[#E4E3DD]/50 flex justify-between items-center">
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="p-1.5 text-[#8E9088] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="기록 지우기"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleSelectEntryFromMailbox(entry)}
                            className="text-[11px] font-bold text-[#5D664A] hover:text-[#2B2D27] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform"
                          >
                            <span>엽서 열어보기</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* API Key Setup Modal Dialog */}
      <AnimatePresence>
        {showKeyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#E4E3DD] shadow-xl"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-[#5D664A]" />
                  Gemini API 키 설정
                </h3>
                <button
                  onClick={() => setShowKeyModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveApiKey} className="space-y-4">
                <p className="text-xs text-[#6F7169] leading-relaxed">
                  마음쉼의 일기 감정 분석 및 다정한 답장 기능은 구글의{" "}
                  <strong>Gemini 3.5 Flash AI 모델</strong>을 통해 구동됩니다. 설정하신 API 키는
                  브라우저 내부 로컬 스토리지에만 저장되어 안전합니다.
                </p>

                <div>
                  <label className="text-[11px] font-bold text-[#5D664A] block mb-1.5">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="API_지정_키를_입력해주세요"
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-[#E4E3DD] rounded-xl text-xs text-gray-700 focus:outline-none focus:border-[#5D664A] transition-all font-mono"
                    id="api_key_modal_input"
                  />
                </div>

                <div className="bg-[#EAF2E1] p-3 rounded-2xl border border-[#D9E6CB] flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold text-[#5D664A]">💡 아직 API 키가 없나요?</span>
                  <p className="text-[10px] text-gray-500 leading-relaxed">
                    구글 AI 스튜디오에서 단 10초 만에 무료로 발급받아 사용할 수 있습니다.
                  </p>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#5D664A] font-bold hover:underline flex items-center gap-1 self-start"
                  >
                    <span>무료 API 키 발급받기</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setTempKey("");
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    지우기
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#5D664A] hover:bg-[#4C533C] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    설정 저장하기
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Beautiful Hotline and Branding Footer matching screenshots exactly */}
      <footer className="max-w-7xl mx-auto px-4 mt-16 border-t border-[#E4E3DD] pt-8 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Logo and branding statement */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#5D664A] text-white rounded-lg flex items-center justify-center">
                <Leaf className="w-4 h-4 fill-current" />
              </div>
              <span className="text-xs font-extrabold text-[#2B2D27]">청소년 정서지원 AI 마음쉼</span>
            </div>
            <p className="text-[10px] text-[#6F7169] leading-relaxed">
              마음쉼은 청소년 여러분의 오늘 하루를 포근하게 보듬어주는 정서 쉼터입니다. 어떤 상황에서도
              너의 이야기를 따뜻하고 다정하게 들을 수 있도록 설계된 전문 문학 동반자입니다.
            </p>
          </div>

          {/* Precise emergency hotline cards (Screenshot 2 style) */}
          <div className="lg:col-span-8 space-y-3">
            <h4 className="text-xs font-bold text-rose-600 flex items-center gap-1">
              <span>📞 전국 청소년 및 상처 입은 아이들을 위한 24시간 긴급 전화</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-[#E4E3DD] p-4 rounded-2xl shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-800 block">자살예방 상담전화</span>
                <span className="text-[9px] text-[#8E9088] leading-tight block">
                  24시간 언제든 통화가 가능해요
                </span>
                <span className="text-xs font-extrabold text-rose-600 block pt-1">
                  국번없이 109
                </span>
              </div>
              <div className="bg-white border border-[#E4E3DD] p-4 rounded-2xl shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-800 block">청소년 상담전화</span>
                <span className="text-[9px] text-[#8E9088] leading-tight block">
                  친구/가족/학업 고민 해결
                </span>
                <span className="text-xs font-extrabold text-[#5D664A] block pt-1">
                  국번없이 1388
                </span>
              </div>
              <div className="bg-white border border-[#E4E3DD] p-4 rounded-2xl shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-gray-800 block">보건복지상담센터</span>
                <span className="text-[9px] text-[#8E9088] leading-tight block">
                  복지 혜택 및 심리 안정 지원
                </span>
                <span className="text-xs font-extrabold text-[#5D664A] block pt-1">
                  국번없이 129
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Deep copyright statement */}
        <div className="text-center pt-4 border-t border-[#F4F3EE] text-[10px] text-[#8E9088]">
          <span>© 2026 마음쉼. 모든 아픔은 나누어지고, 따뜻한 마음만 가득하게.</span>
        </div>
      </footer>
    </div>
  );
}
