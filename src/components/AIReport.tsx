import React, { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { formatCandidateId, formatCandidateName } from "../utils/calculations";

interface AIReportProps {
  data: {
    id: string;
    name: string;
    company: string;
    date: string;
    total: number;
    reliability: string;
    decision: string;
    details: Record<string, number>;
    answers?: Record<number, number>;
  };
  onScaleUpdate?: () => void;
}

export const AIReport: React.FC<AIReportProps> = ({ data, onScaleUpdate }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [aiText, setAiText] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleGenerateAIReport = async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const response = await fetch("/api/generate-ai-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const resJson = await response.json();
      if (!response.ok || resJson.error) {
        throw new Error(resJson.message || "Failed to generate AI report");
      }

      setAiText(resJson.text || "");
      
      // Trigger scaling adjustments if necessary
      setTimeout(() => {
        if (onScaleUpdate) onScaleUpdate();
      }, 300);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "오류가 발생했습니다. 잠시 후 다시 시도하십시오.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full mt-8">
      {aiText ? (
        <div className="a4-page ai-report-page break-after-page overflow-visible bg-white" style={{ width: "210mm", minWidth: "210mm", height: "auto", minHeight: "297mm", padding: "15mm 20mm", marginTop: "24px" }}>
          <div className="report-header gap-4 border-b-[3px] border-[#002c5f] pb-4 mb-6 flex justify-between items-end">
            <div className="flex-1">
              <img src="/ci.png" alt="HD HYUNDAI SAMHO" className="h-10 mb-3 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <div className="hidden text-xs font-mono text-[#002c5f] font-bold tracking-widest mb-1">HD HYUNDAI SAMHO DX_PRO</div>
              <div className="text-3xl font-black text-[#002c5f] font-sans leading-tight tracking-tighter">AI 심층 분석 리포트</div>
            </div>
            <div className="text-right flex flex-col items-end justify-end max-w-[50%]">
              <div className="text-[21px] font-black text-slate-800 font-sans break-keep leading-snug">
                {formatCandidateName(data.name)} <span className="text-[17px] text-slate-500 font-bold">({formatCandidateId(data.id)})</span>
              </div>
              <div className="text-[16px] font-bold text-slate-500 font-mono mt-1">
                {data.company}
              </div>
            </div>
          </div>
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 ai-markdown flex-grow text-slate-700">
            <div className="markdown-body">
              <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{aiText}</Markdown>
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-gray-100 text-center text-xs text-gray-400 font-bold tracking-[0.2em] font-sans">
            HD HYUNDAI CONFIDENTIAL • DO NOT DISTRIBUTE
          </div>
        </div>
      ) : (
        <div className="text-center no-print my-6">
          {errorMsg && (
            <p className="text-red-500 text-sm mb-4 font-bold font-sans">
              ⚠️ {errorMsg}
            </p>
          )}
          <button
            onClick={handleGenerateAIReport}
            disabled={loading}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black py-4 px-10 rounded-xl shadow-lg transition-all hover:shadow-cyan-500/30 inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="animate-pulse">✨ AI 딥러닝 분석 중... (약 10초)</span>
              </>
            ) : (
              <>
                <span>✨</span>
                <span className="text-[15px]">AI 심층 분석 리포트 생성</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
