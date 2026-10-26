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
    lang?: string;
    diagnosis?: any;
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
          "Accept": "application/json",
        },
        body: JSON.stringify(data),
      });

      const rawText = await response.text();
      let resJson: any = null;
      try {
        resJson = JSON.parse(rawText);
      } catch {
        // Non-JSON response (e.g., HTML proxy or gateway error)
        console.warn("Server returned non-JSON response:", rawText.slice(0, 200));
      }

      if (!response.ok || !resJson || resJson.error) {
        const errorDetail = resJson?.message || (response.status === 504 || response.status === 502
          ? "서버 응답 시간 초과 또는 게이트웨이 일시 지연이 발생했습니다. 잠시 후 다시 시도해 주세요."
          : "AI 리포트 생성 서버와의 통신 중 문제가 발생했습니다. 다시 시도해 주세요.");
        throw new Error(errorDetail);
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

  // Grade and Metric metadata for top mini bar (matching Page 1 visual tone)
  const engGradeMatch = (data.decision || "").match(/\(([^)]+)\)/);
  const engGrade = engGradeMatch ? engGradeMatch[1] : (data.decision || "").replace(/[^A-Z0-9]/g, "");
  const korGrade = (data.decision || "").split(" ")[0];

  let gradeGuide = "채용 권고";
  let gradeGuideSub = "기본 합격";
  if (engGrade === "S") { gradeGuide = "즉시 투입"; gradeGuideSub = "최우수 추천"; }
  else if (engGrade === "A") { gradeGuide = "적극 채용"; gradeGuideSub = "우수 인재"; }
  else if (engGrade === "B1") { gradeGuide = "채용 권고"; gradeGuideSub = "기본 합격"; }
  else if (engGrade === "B2") { gradeGuide = "조건부 채용"; gradeGuideSub = "멘토링 요망"; }
  else if (engGrade === "C1") { gradeGuide = "심층 검증"; gradeGuideSub = "교차 면접"; }
  else if (engGrade === "C2") { gradeGuide = "특별 관리"; gradeGuideSub = "안전 재교육"; }
  else if (engGrade === "D") { gradeGuide = "채용 불가"; gradeGuideSub = "종합 부적격"; }

  let gradeColor = "#10b981";
  if (engGrade === "S") gradeColor = "#4f46e5";
  else if (engGrade === "A") gradeColor = "#2563eb";
  else if (engGrade === "B2") gradeColor = "#d97706";
  else if (engGrade === "C1") gradeColor = "#ea580c";
  else if (engGrade === "C2") gradeColor = "#c2410c";
  else if (engGrade === "D") gradeColor = "#dc2626";

  let relText = (data.reliability || "").split(" (")[0];
  if (relText === "매우 높음") relText = "높음";
  else if (relText === "주의 요망") relText = "주의";
  else if (relText === "해석 불가") relText = "불가";
  const relCode = (data.reliability || "").includes("V1") ? "V1" : (data.reliability || "").includes("V2") ? "V2" : (data.reliability || "").includes("V3") ? "V3" : "V4";
  const relColor = relCode === "V1" || relCode === "V2" ? "#10b981" : relCode === "V3" ? "#d97706" : "#dc2626";
  const relSub = relCode === "V1" ? "신뢰도 최우수" : relCode === "V2" ? "판단 타당" : relCode === "V3" ? "해석 주의" : "신뢰 불가";

  const isSafetyFail = data.diagnosis?.sFail || (data.details?.S1 || 0) < 60 || (data.details?.S2 || 0) < 60;
  const isSafetyCaution = !isSafetyFail && ((data.details?.S1 || 0) < 70 || (data.details?.S2 || 0) < 70);
  let safetyText = "PASS (적합)";
  let safetySub = "안전 기준 통과";
  let safetyColor = "#10b981";
  if (isSafetyFail) {
    safetyText = "FAIL (과락)";
    safetySub = "안전의식 미달 🚨";
    safetyColor = "#dc2626";
  } else if (isSafetyCaution) {
    safetyText = "CAUTION (주의)";
    safetySub = "사전 교육 요망";
    safetyColor = "#d97706";
  }

  const displayDate = (data.date || "").slice(0, 10) || new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full mt-6">
      {aiText ? (
        <div 
          className="a4-page ai-report-page break-after-page overflow-visible bg-white flex flex-col" 
          style={{ 
            width: "210mm", 
            minWidth: "210mm", 
            height: "auto", 
            minHeight: "297mm", 
            padding: "19mm 14mm 12mm 14mm", 
            boxSizing: "border-box",
            marginTop: "16px",
            fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
          }}
        >
          {/* Header: Title and Candidate Info (Identical to 1st Page Report) */}
          <div className="flex justify-between items-start border-b-[2px] border-[#002c5f] pb-1.5 mb-2 shrink-0">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <img 
                  src="/ci.png" 
                  alt="HD HYUNDAI SAMHO" 
                  className="h-6 object-contain" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
              </div>
              <h1 className="text-[21px] font-black text-[#002c5f] tracking-tight leading-none mb-1">
                AI 심층 분석 리포트
              </h1>
              <p className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
                HD HYUNDAI SAMHO DX_PRO In-Depth AI Assessment Report
              </p>
            </div>
            
            <div className="flex flex-col items-end text-right">
              <div className="bg-[#002c5f] text-white text-[8.5px] px-2 py-0.5 rounded-xs font-bold tracking-wider mb-1">
                AI DEEP EVALUATION
              </div>
              <div className="text-[18px] font-black text-slate-900 leading-none mb-1">
                {formatCandidateName(data.name)} <span className="text-[13px] text-slate-500 font-bold tabular-nums">({formatCandidateId(data.id)})</span>
              </div>
              <div className="text-[11.5px] font-bold text-slate-600 tabular-nums">
                {displayDate} | {data.company} | NATION: {data.lang ? data.lang.toUpperCase() : "N/A"}
              </div>
            </div>
          </div>

          {/* Quick KPI Bar (6 Mini Cards connecting Page 1 and Page 2 visually) */}
          <div className="grid grid-cols-6 gap-2 mb-3 shrink-0">
            {/* 카드 1: 종합 점수 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg h-[64px] px-1.5 py-1 flex flex-col justify-between items-center text-center shadow-xs">
              <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider h-3 flex items-center justify-center">종합 점수</div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[20px] font-black leading-none text-slate-900 tracking-tight tabular-nums">{data.total}</span>
                <span className="text-[10px] font-medium text-slate-500 ml-0.5">점</span>
              </div>
              <div className="text-[8.5px] font-bold text-slate-400 h-2.5 flex items-center justify-center">100점 만점</div>
            </div>

            {/* 카드 2: 종합 판정 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg h-[64px] px-1.5 py-1 flex flex-col justify-between items-center text-center shadow-xs">
              <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider h-3 flex items-center justify-center">종합 판정</div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[16px] font-black leading-none tracking-tight" style={{ color: gradeColor }}>
                  {korGrade}
                </span>
              </div>
              <div className="text-[8.5px] font-bold text-slate-400 h-2.5 flex items-center justify-center">
                {korGrade === "적격" ? "기준선 충족" : korGrade === "우수" ? "상위 역량" : "요주의"}
              </div>
            </div>

            {/* 카드 3: 종합 등급 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg h-[64px] px-1.5 py-1 flex flex-col justify-between items-center text-center shadow-xs">
              <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider h-3 flex items-center justify-center">종합 등급</div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[20px] font-black leading-none tracking-tight" style={{ color: gradeColor }}>
                  {engGrade}
                </span>
              </div>
              <div className="text-[8.5px] font-bold text-slate-400 h-2.5 flex items-center justify-center">
                {engGrade === "S" ? "최상위 2%" : engGrade === "A" ? "상위 15%" : engGrade.startsWith("B") ? "적격 범위" : "특별 관리"}
              </div>
            </div>

            {/* 카드 4: 현장 안전 적합성 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg h-[64px] px-1.5 py-1 flex flex-col justify-between items-center text-center shadow-xs">
              <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider h-3 flex items-center justify-center">안전 적합성</div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[12px] font-black tracking-tight" style={{ color: safetyColor }}>
                  {safetyText}
                </span>
              </div>
              <div className="text-[8.5px] font-bold h-2.5 flex items-center justify-center" style={{ color: safetyColor }}>
                {safetySub}
              </div>
            </div>

            {/* 카드 5: 채용 권고 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg h-[64px] px-1.5 py-1 flex flex-col justify-between items-center text-center shadow-xs">
              <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider h-3 flex items-center justify-center">채용 권고</div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[13px] font-black text-slate-800 tracking-tight">
                  {gradeGuide}
                </span>
              </div>
              <div className="text-[8.5px] font-bold text-slate-500 h-2.5 flex items-center justify-center">{gradeGuideSub}</div>
            </div>

            {/* 카드 6: 응답 신뢰도 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg h-[64px] px-1.5 py-1 flex flex-col justify-between items-center text-center shadow-xs">
              <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider h-3 flex items-center justify-center">응답 신뢰도</div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-[12px] font-black tracking-tight" style={{ color: relColor }}>
                  {relText} ({relCode})
                </span>
              </div>
              <div className="text-[8.5px] font-bold h-2.5 flex items-center justify-center" style={{ color: relColor }}>
                {relSub}
              </div>
            </div>
          </div>

          {/* AI Markdown Content Area */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 ai-markdown flex-grow text-slate-700 shadow-xs">
            <div className="markdown-body">
              <Markdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>{aiText}</Markdown>
            </div>
          </div>

          {/* In-Screen Control Bar (no-print) */}
          <div className="no-print mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
            <div className="text-xs text-slate-500 font-medium">
              💡 <span>분석 결과는 조선소 현장 배치 및 반장 코칭 가이드라인으로 활용할 수 있습니다.</span>
            </div>
            <button
              onClick={handleGenerateAIReport}
              disabled={loading}
              className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-300 hover:border-blue-400 px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>AI 재분석 생성 중...</span>
                </>
              ) : (
                <>
                  <span>🔄</span>
                  <span>AI 리포트 다시 생성하기</span>
                </>
              )}
            </button>
          </div>

          {/* Official Footer Notice */}
          <div className="mt-4 pt-2 border-t border-slate-200 flex justify-between items-center text-[9px] text-slate-500 font-medium shrink-0">
            <span>HD HYUNDAI SAMHO DX_PRO E-7 FOREIGN TALENT ASSESSMENT SYSTEM</span>
            <span className="text-slate-400 font-bold tracking-wider">HD HYUNDAI CONFIDENTIAL • DO NOT DISTRIBUTE</span>
          </div>
        </div>
      ) : (
        <div className="text-center no-print my-6">
          {errorMsg && (
            <div className="max-w-xl mx-auto mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl text-left text-amber-900 shadow-sm font-sans">
              <div className="flex items-center gap-2 font-black text-amber-800 mb-1.5 text-sm">
                <span className="text-base">⚠️</span>
                <span>AI 리포트 생성 안내</span>
              </div>
              <p className="text-xs sm:text-sm font-medium whitespace-pre-line leading-relaxed text-amber-900">
                {errorMsg}
              </p>
            </div>
          )}
          <button
            onClick={handleGenerateAIReport}
            disabled={loading}
            className="bg-gradient-to-r from-blue-700 via-blue-600 to-[#002c5f] hover:from-blue-600 hover:to-blue-800 text-white font-black py-4 px-10 rounded-xl shadow-lg transition-all hover:shadow-blue-900/30 inline-flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="animate-pulse">✨ HD현대삼호 AI 딥러닝 심층 분석 중... (약 10초)</span>
              </>
            ) : (
              <>
                <span className="text-lg">✨</span>
                <span className="text-[15px]">AI 심층 분석 리포트 생성 (HD HYUNDAI SAMHO DX_PRO)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
