import React, { useState, useEffect, useRef } from "react";
import { Wind, Play, Square, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type BreathPhase = "inhale" | "hold" | "exhale" | "idle";

export default function BreathingCoach() {
  const [phase, setPhase] = useState<BreathPhase>("idle");
  const [secondsLeft, setSecondsLeft] = useState<number>(4);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startBreathing = () => {
    setPhase("inhale");
    setSecondsLeft(4);
    runTimer("inhale");
  };

  const stopBreathing = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase("idle");
    setSecondsLeft(4);
  };

  const runTimer = (currentPhase: BreathPhase) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let count = 4;
    setSecondsLeft(count);

    timerRef.current = setInterval(() => {
      count -= 1;
      setSecondsLeft(count);

      if (count <= 0) {
        // Transition to next phase
        setPhase((prevPhase) => {
          let next: BreathPhase = "idle";
          if (prevPhase === "inhale") next = "hold";
          else if (prevPhase === "hold") next = "exhale";
          else if (prevPhase === "exhale") next = "inhale";

          // Schedule next run
          setTimeout(() => runTimer(next), 50);
          return next;
        });
      }
    }, 1000);
  };

  // Guidance texts and colors based on breath phase
  const getGuidance = () => {
    switch (phase) {
      case "inhale":
        return {
          title: "들이쉬기",
          desc: "코로 맑은 공기를 가득 채우듯이...",
          colorClass: "text-teal-600 bg-teal-50 border-teal-100",
          ringColor: "border-teal-300 bg-teal-100/50",
          scale: 1.5,
        };
      case "hold":
        return {
          title: "잠시 멈춤",
          desc: "머금은 따뜻함을 온몸으로 느끼며...",
          colorClass: "text-emerald-600 bg-emerald-50 border-emerald-100",
          ringColor: "border-emerald-300 bg-emerald-100/50",
          scale: 1.5,
        };
      case "exhale":
        return {
          title: "내쉬기",
          desc: "오늘의 고단함과 불안을 후- 날려보내자.",
          colorClass: "text-green-600 bg-green-50 border-green-100",
          ringColor: "border-green-200 bg-green-50/50",
          scale: 1.0,
        };
      default:
        return {
          title: "숨 고르기",
          desc: "마음이 무거울 때, 1분 동안 천천히 호흡해보자.",
          colorClass: "text-gray-600 bg-gray-50 border-gray-100",
          ringColor: "border-emerald-200 bg-emerald-50/20",
          scale: 1.0,
        };
    }
  };

  const info = getGuidance();

  return (
    <div className="bg-white/80 backdrop-blur-md rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-col items-center">
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
            <Wind className="w-4 h-4 text-emerald-500" />
            마음 토닥 호흡 가이드
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">안절부절못하는 마음을 가라앉히는 호흡기</p>
        </div>
        {phase !== "idle" && (
          <button
            onClick={stopBreathing}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="그만하기"
            id="breath_stop_btn"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
          </button>
        )}
      </div>

      {/* Circle Visualizer */}
      <div className="relative w-36 h-36 flex items-center justify-center my-4">
        {/* Breathing expanding circle background */}
        <motion.div
          animate={{
            scale: info.scale,
          }}
          transition={{
            duration: phase === "hold" ? 0 : 4,
            ease: "easeInOut",
          }}
          className={`absolute rounded-full w-24 h-24 border transition-all duration-1000 ${info.ringColor}`}
        />

        {/* Center state circle */}
        <div className="absolute rounded-full w-20 h-20 bg-white shadow-md flex flex-col items-center justify-center z-10 border border-emerald-100">
          <AnimatePresence mode="wait">
            {phase === "idle" ? (
              <button
                onClick={startBreathing}
                className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors flex items-center justify-center shadow-sm"
                title="호흡 시작"
                id="breath_start_btn"
              >
                <Play className="w-5 h-5 fill-current" />
              </button>
            ) : (
              <motion.div
                key={phase}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center justify-center"
              >
                <span className="text-[11px] font-semibold text-gray-400">
                  {phase === "inhale" ? "들숨" : phase === "hold" ? "멈춤" : "날숨"}
                </span>
                <span className="text-2xl font-bold text-emerald-600 my-0.5 font-mono">{secondsLeft}</span>
                <span className="text-[9px] text-gray-400">초 남음</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Instruction text */}
      <div className="text-center w-full mt-2 min-h-[50px] flex flex-col justify-center items-center">
        <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${info.colorClass}`}>
          {info.title}
        </div>
        <p className="text-xs text-gray-600 mt-1.5 font-medium max-w-[200px]">
          {info.desc}
        </p>
      </div>

      {phase === "idle" && (
        <button
          onClick={startBreathing}
          className="mt-3 text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1 hover:underline"
          id="breath_start_link"
        >
          <RefreshCw className="w-3 h-3" />
          지금 같이 해볼래?
        </button>
      )}
    </div>
  );
}
