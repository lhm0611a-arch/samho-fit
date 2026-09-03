import React, { useState, useMemo, useEffect } from "react";
import { 
  AssessmentResult, 
  formatCandidateId, 
  formatCandidateName, 
  getRecordKey,
  compareCandidateId
} from "../utils/calculations";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { 
  Building2, 
  Calendar, 
  Filter, 
  ArrowUpDown, 
  Printer, 
  RotateCcw, 
  ArrowLeft, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  HardHat 
} from "lucide-react";

interface TotalReportProps {
  data: AssessmentResult[];
  onClose: () => void;
}

type SortOption = "id_asc" | "score_desc" | "score_asc" | "risk_first" | "date_desc";

// 날짜를 YYYY.MM.DD 형태로 정규화하는 헬퍼
function normalizeDateStr(dStr?: string): string {
  if (!dStr || dStr === "-") return "-";
  const clean = dStr.split("T")[0].split(" ")[0].replace(/-/g, ".");
  return clean;
}

export const TotalReport: React.FC<TotalReportProps> = ({ data, onClose }) => {
  // Filter States
  const [selectedCompany, setSelectedCompany] = useState<string>("ALL");
  const [selectedDate, setSelectedDate] = useState<string>("ALL");
  const [selectedGrade, setSelectedGrade] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortOption>("id_asc");

  // 1. 협력업체 목록 (선택된 날짜가 있으면 해당 날짜에 데이터가 있는 업체 우선/정리, 없으면 전체)
  const availableCompanies = useMemo(() => {
    const compCountMap = new Map<string, number>();
    
    data.forEach((d) => {
      const comp = (d.company || "").trim();
      if (!comp) return;

      if (selectedDate !== "ALL") {
        const itemDate = normalizeDateStr(d.date);
        if (itemDate !== selectedDate) return;
      }
      compCountMap.set(comp, (compCountMap.get(comp) || 0) + 1);
    });

    // 한글 및 알파벳 가나다순 오름차순 정렬 (SORTING)
    return Array.from(compCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [data, selectedDate]);

  // 2. 검사 일자 목록 (선택된 협력업체가 있으면 해당 협력업체 데이터가 있는 날짜만 추출 및 최신순 정렬)
  const availableDates = useMemo(() => {
    const dateCountMap = new Map<string, number>();

    data.forEach((d) => {
      const itemDate = normalizeDateStr(d.date);
      if (!itemDate || itemDate === "-") return;

      if (selectedCompany !== "ALL") {
        const comp = (d.company || "").trim();
        if (comp !== selectedCompany) return;
      }
      dateCountMap.set(itemDate, (dateCountMap.get(itemDate) || 0) + 1);
    });

    // 최신 날짜순 내림차순 정렬 (SORTING)
    return Array.from(dateCountMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data, selectedCompany]);

  // 상호 연동 시 기존 선택값이 유효하지 않으면 "ALL"로 안전하게 리셋
  useEffect(() => {
    if (selectedCompany !== "ALL") {
      const exists = availableCompanies.some((c) => c.name === selectedCompany);
      // 만약 날짜 선택으로 인해 현재 선택된 업체가 해당 날짜에 없다면 ALL로 초기화하지 않고,
      // 데이터가 없는 날짜를 골랐을 때 날짜가 리셋되도록 보조
    }
  }, [selectedCompany, availableCompanies]);

  const handleCompanyChange = (newCompany: string) => {
    setSelectedCompany(newCompany);
    if (newCompany !== "ALL" && selectedDate !== "ALL") {
      // 해당 신규 업체에 현재 선택된 날짜 데이터가 있는지 확인
      const hasDateInCompany = data.some((d) => {
        return (d.company || "").trim() === newCompany && normalizeDateStr(d.date) === selectedDate;
      });
      if (!hasDateInCompany) {
        setSelectedDate("ALL");
      }
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    if (newDate !== "ALL" && selectedCompany !== "ALL") {
      // 해당 신규 날짜에 현재 선택된 업체 데이터가 있는지 확인
      const hasCompanyInDate = data.some((d) => {
        return normalizeDateStr(d.date) === newDate && (d.company || "").trim() === selectedCompany;
      });
      if (!hasCompanyInDate) {
        setSelectedCompany("ALL");
      }
    }
  };

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((d) => {
      // Company match
      if (selectedCompany !== "ALL" && (d.company || "").trim() !== selectedCompany) {
        return false;
      }
      // Date match
      if (selectedDate !== "ALL") {
        const itemDate = normalizeDateStr(d.date);
        if (itemDate !== selectedDate) return false;
      }
      // Grade match
      if (selectedGrade !== "ALL") {
        let code = "B1";
        if (d.decision.includes("(")) {
          const match = d.decision.match(/\(([^)]+)\)/);
          if (match) code = match[1];
        } else {
          code = d.decision;
        }
        code = code.replace(/[^A-Z0-9]/g, "");
        if (code === "C") code = d.total < 50 ? "C2" : "C1";
        else if (code === "B") code = d.total < 66 ? "B2" : "B1";

        if (selectedGrade === "PASS" && !(code.includes("S") || code.includes("A") || code.includes("B1"))) return false;
        if (selectedGrade === "REVIEW" && !(code.includes("B2") || code.includes("C1"))) return false;
        if (selectedGrade === "RISK" && !(code.includes("C2") || code.includes("D"))) return false;
      }
      // Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = (d.name || "").toLowerCase().includes(q);
        const matchId = (d.id || "").toLowerCase().includes(q);
        const matchComp = (d.company || "").toLowerCase().includes(q);
        const matchNation = (d.lang || "").toLowerCase().includes(q);
        if (!matchName && !matchId && !matchComp && !matchNation) return false;
      }
      return true;
    });
  }, [data, selectedCompany, selectedDate, selectedGrade, searchQuery]);

  // Sorted dataset (Natural numeric sort for candidate IDs: K-01, K-99, K-100)
  const sortedData = useMemo(() => {
    const list = [...filteredData];
    list.sort((a, b) => {
      if (sortBy === "score_desc") {
        const diff = b.total - a.total;
        if (diff !== 0) return diff;
        return compareCandidateId(a.id, b.id);
      }
      if (sortBy === "score_asc") {
        const diff = a.total - b.total;
        if (diff !== 0) return diff;
        return compareCandidateId(a.id, b.id);
      }
      if (sortBy === "date_desc") {
        const diff = (b.date || "").localeCompare(a.date || "");
        if (diff !== 0) return diff;
        return compareCandidateId(a.id, b.id);
      }
      if (sortBy === "risk_first") {
        const isRiskA = a.decision.includes("C2") || a.decision.includes("D") || a.total < 55 ? 1 : 0;
        const isRiskB = b.decision.includes("C2") || b.decision.includes("D") || b.total < 55 ? 1 : 0;
        if (isRiskA !== isRiskB) return isRiskB - isRiskA;
        const diff = a.total - b.total;
        if (diff !== 0) return diff;
        return compareCandidateId(a.id, b.id);
      }
      // Default: id_asc with company grouping (e.g., K-01, K-99, K-100)
      const compA = a.company || "";
      const compB = b.company || "";
      if (compA !== compB) return compA.localeCompare(compB, "ko");
      return compareCandidateId(a.id, b.id);
    });
    return list;
  }, [filteredData, sortBy]);

  const totalCnt = sortedData.length;

  const cCnts = { S: 0, A: 0, B1: 0, B2: 0, C1: 0, C2: 0, D: 0 };
  const factorSum = { C: 0, R: 0, S: 0, T: 0, E: 0, A: 0 };
  let totalScoreSum = 0;
  let riskCnt = 0;

  sortedData.forEach((d) => {
    let code = "B1";
    if (d.decision.includes("(")) {
      const match = d.decision.match(/\(([^)]+)\)/);
      if (match) code = match[1];
    } else {
      code = d.decision;
    }
    code = code.replace(/[^A-Z0-9]/g, "");
    if (code === "C") code = d.total < 50 ? "C2" : "C1";
    else if (code === "B") code = d.total < 66 ? "B2" : "B1";

    if (cCnts[code as keyof typeof cCnts] !== undefined) {
      cCnts[code as keyof typeof cCnts]++;
    } else {
      if (code.includes("S")) cCnts.S++;
      else if (code.includes("A")) cCnts.A++;
      else if (code.includes("B1")) cCnts.B1++;
      else if (code.includes("B2")) cCnts.B2++;
      else if (code.includes("C1")) cCnts.C1++;
      else if (code.includes("C2")) cCnts.C2++;
      else if (code.includes("D")) cCnts.D++;
    }

    totalScoreSum += d.total;

    let main = d.mainDetails;
    if (!main && d.details) {
      const s = d.details;
      main = {
        C: Math.round(((s.C1 || 0) + (s.C2 || 0)) / 2),
        R: Math.round(((s.R1 || 0) + (s.R2 || 0)) / 2),
        S: Math.round(((s.S1 || 0) + (s.S2 || 0)) / 2),
        T: Math.round(((s.T1 || 0) + (s.T2 || 0)) / 2),
        E: Math.round(((s.E1 || 0) + (s.E2 || 0)) / 2),
        A: Math.round(((s.A1 || 0) + (s.A2 || 0)) / 2),
      };
    }
    if (main) {
      (Object.keys(factorSum) as Array<keyof typeof factorSum>).forEach((k) => {
        factorSum[k] += main[k] || 0;
      });
    }

    if (
      d.reliability.includes("V3") ||
      d.reliability.includes("V4") ||
      d.reliability.includes("V5")
    ) {
      riskCnt++;
    }
  });

  const passCnt = cCnts.S + cCnts.A + cCnts.B1;
  const reviewCnt = cCnts.B2 + cCnts.C1;
  const dangerCnt = cCnts.C2 + cCnts.D;
  const avgScore = totalCnt > 0 ? (totalScoreSum / totalCnt).toFixed(1) : "0.0";
  const passRate = totalCnt > 0 ? ((passCnt / totalCnt) * 100).toFixed(1) : "0.0";
  const dangerRate = totalCnt > 0 ? ((dangerCnt / totalCnt) * 100).toFixed(1) : "0.0";
  const reviewRate = totalCnt > 0 ? ((reviewCnt / totalCnt) * 100).toFixed(1) : "0.0";

  const mainFactorKeys: Array<keyof typeof factorSum> = ["C", "R", "S", "T", "E", "A"];
  const mainFactorNames = {
    C: "근태/책임",
    R: "규범/정직",
    S: "안전의식",
    T: "조직협력",
    E: "정서안정",
    A: "직무적응",
  };

  // Recharts Radar Data
  const radarData = mainFactorKeys.map((k) => ({
    subject: `${mainFactorNames[k]} (${k})`,
    score: totalCnt > 0 ? Math.round(factorSum[k] / totalCnt) : 0,
    fullMark: 100,
  }));

  // Recharts Pie Data
  const pieData = [
    { name: "S등급 (최우수)", value: cCnts.S, color: "#4f46e5" },
    { name: "A등급 (우수)", value: cCnts.A, color: "#2563eb" },
    { name: "B1등급 (보통)", value: cCnts.B1, color: "#10b981" },
    { name: "B2등급 (관찰)", value: cCnts.B2, color: "#f59e0b" },
    { name: "C1등급 (검토)", value: cCnts.C1, color: "#ea580c" },
    { name: "C2등급 (위험)", value: cCnts.C2, color: "#dc2626" },
    { name: "D등급 (부적격)", value: cCnts.D, color: "#991b1b" },
  ].filter((p) => p.value > 0);

  // 최고 및 최저 역량 분석 (총평용)
  const factorAverages = mainFactorKeys.map((k) => ({
    key: k,
    name: mainFactorNames[k],
    score: totalCnt > 0 ? Number((factorSum[k] / totalCnt).toFixed(1)) : 0,
  }));
  factorAverages.sort((a, b) => b.score - a.score);
  const highestFactor = factorAverages[0] || { name: "안전의식", score: 80 };
  const lowestFactor = factorAverages[factorAverages.length - 1] || { name: "정서안정", score: 70 };

  const getFormatDate = () => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto text-slate-800 print:overflow-visible print:p-0 print:m-0 print:block">
      
      {/* Top Interactive Filter & Action Bar (Hidden in Print) */}
      <div className="no-print bg-slate-900 border border-slate-700 text-white rounded-2xl p-4 sm:p-5 mb-8 max-w-[210mm] w-full shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-cyan-400" />
            <h3 className="font-bold text-sm text-white">총괄 보고서 필터 & 조회 옵션</h3>
            <span className="text-xs text-slate-400 font-mono">
              (출력 대상: <strong className="text-cyan-300">{totalCnt}명</strong> / 전체 {data.length}명)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedCompany("ALL");
                setSelectedDate("ALL");
                setSelectedGrade("ALL");
                setSearchQuery("");
                setSortBy("id_asc");
              }}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>초기화</span>
            </button>
            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition flex items-center gap-1.5 cursor-pointer ml-2"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>인쇄/PDF</span>
            </button>
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs font-mono transition cursor-pointer border border-slate-700 flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>닫기</span>
            </button>
          </div>
        </div>

        {/* Filters Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Company Filter - 자동 SORTING & 인원수 표시 */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                협력업체
              </span>
              <span className="text-[10px] text-cyan-300 font-mono">
                {availableCompanies.length}개사
              </span>
            </label>
            <select
              value={selectedCompany}
              onChange={(e) => handleCompanyChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-2 focus:border-cyan-500 transition cursor-pointer font-medium"
            >
              <option value="ALL">전체 업체 (전체 {data.length}명)</option>
              {availableCompanies.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name} ({c.count}명)
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter - 선택된 업체에 존재하는 일자만 자동 SORTING (최신순) */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between mb-1">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                검사 일자
              </span>
              <span className="text-[10px] text-blue-300 font-mono">
                {availableDates.length}개 일자
              </span>
            </label>
            <select
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-2 focus:border-blue-500 transition cursor-pointer font-mono"
            >
              <option value="ALL">
                {selectedCompany !== "ALL" ? `[${selectedCompany}] 전체 일정` : "전체 일정"}
              </option>
              {availableDates.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.date} ({d.count}명)
                </option>
              ))}
            </select>
          </div>

          {/* Decision Grade Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-1">
              <span>결과 등급</span>
            </label>
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-2 focus:border-indigo-500 transition cursor-pointer font-medium"
            >
              <option value="ALL">전체 등급</option>
              <option value="PASS">합격군 (S, A, B1)</option>
              <option value="REVIEW">관찰/보류군 (B2, C1)</option>
              <option value="RISK">위험/부적격군 (C2, D)</option>
            </select>
          </div>

          {/* Sorting Option */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
              <span>정렬 기준</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-2 focus:border-emerald-500 transition cursor-pointer font-medium"
            >
              <option value="id_asc">수험번호순 (기본)</option>
              <option value="score_desc">종합점수 높은순</option>
              <option value="score_asc">종합점수 낮은순</option>
              <option value="risk_first">위험군(C2/D) 우선</option>
              <option value="date_desc">최근 검사일순</option>
            </select>
          </div>

          {/* Quick Search */}
          <div>
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-1">
              <Search className="w-3.5 h-3.5 text-amber-400" />
              <span>성명/ID 검색</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="검색어 입력..."
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-2 focus:border-amber-500 transition text-xs placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {totalCnt === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md w-full shadow-md text-slate-600 my-10">
          <p className="font-bold text-base mb-2">선택한 조건에 일치하는 응시 데이터가 없습니다.</p>
          <p className="text-xs text-slate-400">상단의 업체 또는 기간 필터를 변경해 보세요.</p>
        </div>
      ) : (
        <div id="view-total-report" className="min-w-[210mm] w-[210mm] mx-auto bg-slate-50 relative flex flex-col items-center">
          
          {/* ========================================================================= */}
          {/* PAGE 1: 공식 표지 (EXECUTIVE COVER PAGE)                                  */}
          {/* ========================================================================= */}
          <div 
            className="a4-page executive-cover bg-white flex flex-col relative overflow-hidden" 
            style={{ 
              width: "210mm", 
              height: "297mm", 
              minHeight: "297mm", 
              boxSizing: "border-box", 
              padding: "0",
              pageBreakAfter: "always"
            }}
          >
            {/* Top Brand Header Bar */}
            <div className="w-full h-4 bg-gradient-to-r from-[#002c5f] to-[#009539]" />
            
            <div className="flex-grow h-full flex flex-col justify-between p-16">
              <div className="flex justify-between items-start">
                <div className="text-sm font-mono text-[#002c5f] font-black tracking-widest">
                  HD HYUNDAI SAMHO DX_PRO
                </div>
                <img 
                  src="/ci.png" 
                  alt="HD HYUNDAI SAMHO" 
                  className="h-12 object-contain" 
                  onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                />
              </div>
              
              <div className="text-left mt-14">
                <div className="text-xs font-bold mb-5 tracking-[0.2em] font-sans text-red-600 border border-red-600 inline-block px-3 py-1 rounded">
                  대외비 (CONFIDENTIAL)
                </div>
                
                <h1 className="text-5xl font-black leading-[1.25] mb-4 text-[#002c5f] tracking-tight break-keep">
                  E-7 외국인 근로자
                  <br />
                  인성검사 총괄 보고서
                </h1>
                
                <p className="text-base font-bold text-slate-500 font-sans tracking-wide mb-10">
                  Foreign Worker Personality Assessment Executive Report
                </p>

                {/* Subtitle with filtered Company & Date info (여백 및 줄바꿈 최적화) */}
                <div className="text-sm font-medium text-slate-700 space-y-3 mb-12 bg-slate-50/90 p-6 rounded-2xl border border-slate-200 inline-block min-w-[460px] shadow-sm">
                  <div className="flex items-center">
                    <span className="text-slate-500 w-32 shrink-0 font-bold flex items-center gap-1.5">
                      <span>🏢</span> 대상 업체:
                    </span> 
                    <strong className="text-slate-900 font-black text-base">
                      {selectedCompany === "ALL" ? "전체 협력사" : selectedCompany}
                    </strong>
                  </div>
                  <div className="flex items-center">
                    <span className="text-slate-500 w-32 shrink-0 font-bold flex items-center gap-1.5">
                      <span>📅</span> 검사 일정:
                    </span> 
                    <strong className="text-slate-900 font-mono font-bold text-base">
                      {selectedDate === "ALL" ? "전체 기간" : selectedDate}
                    </strong>
                  </div>
                  <div className="flex items-center">
                    <span className="text-slate-500 w-32 shrink-0 font-bold flex items-center gap-1.5">
                      <span>👥</span> 총 응시인원:
                    </span> 
                    <strong className="text-blue-700 font-black text-base">
                      {totalCnt}명
                    </strong>
                  </div>
                  <div className="flex items-center pt-2 border-t border-slate-200">
                    <span className="text-slate-500 w-32 shrink-0 font-bold flex items-center gap-1.5 whitespace-nowrap">
                      <span>📊</span> 평균 / 합격률:
                    </span> 
                    <strong className="text-emerald-700 font-black text-base">
                      {avgScore}점 / {passRate}%
                    </strong>
                  </div>
                </div>
                
                <div className="w-24 h-1.5 bg-[#009539] mb-6" />
                
                <div className="text-lg font-bold text-slate-700 font-mono">
                  발행일자: {getFormatDate()}
                </div>
              </div>
              
              <div className="text-left text-xs font-bold text-slate-400 leading-relaxed border-t-2 border-slate-100 pt-4 mt-auto flex justify-between items-center">
                <span>HD HYUNDAI SAMHO DX_PRO TALENT ASSESSMENT SYSTEM</span>
                <span className="font-mono">P. 1 / 3+</span>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PAGE 2: 종합 분석 요약 및 역량 프로파일 (경영층 가독성 극대화: 폰트 확대 & 여백 최적화) */}
          {/* ========================================================================= */}
          <div 
            className="a4-page bg-white flex flex-col relative overflow-hidden" 
            style={{ 
              width: "210mm", 
              height: "297mm", 
              minHeight: "297mm", 
              maxHeight: "297mm",
              boxSizing: "border-box", 
              padding: "10mm 14mm",
              pageBreakAfter: "always"
            }}
          >
            {/* Header */}
            <div className="border-b-[3px] border-[#002c5f] pb-2 mb-2.5 flex justify-between items-end shrink-0">
              <div>
                <h2 className="text-2xl font-black text-[#002c5f] tracking-tight">종합 분석 요약 및 역량 프로파일</h2>
                <div className="text-xs font-bold text-slate-600 mt-0.5 uppercase font-mono">
                  {selectedCompany === "ALL" ? "전체 협력사" : selectedCompany}
                  {selectedDate !== "ALL" ? ` [${selectedDate}]` : ""} | 총 {totalCnt}명 인성평가 통계
                </div>
              </div>
              <img 
                src="/ci.png" 
                alt="HD HYUNDAI SAMHO" 
                className="h-8 object-contain" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }} 
              />
            </div>

            {/* Top 4 KPI Cards - 글씨 크기 대폭 확대 */}
            <div className="grid grid-cols-4 gap-2.5 mb-2.5 shrink-0">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center shadow-xs">
                <div className="text-xs text-slate-600 font-bold uppercase tracking-wider mb-0.5">총 응시자</div>
                <div className="text-2xl font-black text-slate-900 font-display">
                  {totalCnt}<span className="text-xs font-bold text-slate-500 ml-1">명</span>
                </div>
              </div>
              <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-2.5 text-center shadow-xs">
                <div className="text-xs text-blue-800 font-bold uppercase tracking-wider mb-0.5">평균 종합 점수</div>
                <div className="text-2xl font-black text-blue-700 font-display">
                  {avgScore}<span className="text-xs font-bold text-blue-600 ml-1">점</span>
                </div>
              </div>
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-2.5 text-center shadow-xs">
                <div className="text-xs text-emerald-800 font-bold uppercase tracking-wider mb-0.5">합격군 (S/A/B1)</div>
                <div className="text-2xl font-black text-emerald-700 font-display">
                  {passCnt}<span className="text-xs font-bold text-emerald-600 ml-1">명 ({passRate}%)</span>
                </div>
              </div>
              <div className="bg-red-50/80 border border-red-200 rounded-lg p-2.5 text-center shadow-xs">
                <div className="text-xs text-red-800 font-bold uppercase tracking-wider mb-0.5">위험/부적격 (C2/D)</div>
                <div className="text-2xl font-black text-red-700 font-display">
                  {dangerCnt}<span className="text-xs font-bold text-red-600 ml-1">명 ({dangerRate}%)</span>
                </div>
              </div>
            </div>

            {/* 2-Column Visual Charts Section - 폰트 및 라벨 가독성 확대 */}
            <div className="grid grid-cols-2 gap-3 mb-2.5 shrink-0" style={{ height: "205px" }}>
              {/* Radar Chart: 6 Core Competencies */}
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col shadow-xs">
                <h3 className="text-xs font-black text-slate-900 pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>📊</span> 6대 핵심 역량 평균 프로파일
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-500">100점 만점 기준</span>
                </h3>
                <div className="flex-1 w-full relative min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                      <PolarGrid stroke="#cbd5e1" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: "#0f172a", fontSize: 11, fontWeight: 800 }} 
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]} 
                        tick={{ fill: "#64748b", fontSize: 9, fontWeight: 700 }} 
                      />
                      <Radar
                        name="평균 점수"
                        dataKey="score"
                        stroke="#002c5f"
                        fill="#0284c7"
                        fillOpacity={0.45}
                        strokeWidth={2.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie/Donut Chart: Grade Distribution */}
              <div className="bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col shadow-xs">
                <h3 className="text-xs font-black text-slate-900 pb-1 border-b border-slate-100 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>🍩</span> 종합 평가 등급 분포
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-500">전체 비율</span>
                </h3>
                <div className="flex-1 w-full flex items-center min-h-0">
                  <div className="w-1/2 h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          innerRadius={28}
                          outerRadius={56}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => [`${value}명 (${((value / totalCnt) * 100).toFixed(1)}%)`, "인원"]}
                          contentStyle={{ fontSize: "11px", borderRadius: "6px", fontWeight: "bold" }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 pl-2 flex flex-col justify-center space-y-1 text-xs">
                    <div className="flex items-center justify-between text-indigo-800 font-bold">
                      <span>• S (최우수):</span>
                      <span className="font-mono font-black">{cCnts.S}명 ({((cCnts.S / (totalCnt || 1)) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center justify-between text-blue-700 font-bold">
                      <span>• A (우수):</span>
                      <span className="font-mono font-black">{cCnts.A}명 ({((cCnts.A / (totalCnt || 1)) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-700 font-bold">
                      <span>• B1 (보통):</span>
                      <span className="font-mono font-black">{cCnts.B1}명 ({((cCnts.B1 / (totalCnt || 1)) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center justify-between text-amber-700 font-bold">
                      <span>• B2 (관찰):</span>
                      <span className="font-mono font-black">{cCnts.B2}명 ({((cCnts.B2 / (totalCnt || 1)) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center justify-between text-orange-700 font-bold">
                      <span>• C1 (검토):</span>
                      <span className="font-mono font-black">{cCnts.C1}명 ({((cCnts.C1 / (totalCnt || 1)) * 100).toFixed(0)}%)</span>
                    </div>
                    <div className="flex items-center justify-between text-red-700 font-bold">
                      <span>• C2/D (위험):</span>
                      <span className="font-mono font-black">{dangerCnt}명 ({((dangerCnt / (totalCnt || 1)) * 100).toFixed(0)}%)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 6 Core Competency Score Indicators - 글씨 크기 및 대비 강화 */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 mb-2.5 shrink-0 shadow-xs">
              <h3 className="text-xs font-black text-slate-900 mb-1.5 flex items-center justify-between">
                <span>📋 6대 세부 요인별 평균 점수 현황</span>
                <span className="text-xs text-slate-600 font-medium">80점 이상: 우수 / 60점 미만: 집중 관리 요망</span>
              </h3>
              <div className="grid grid-cols-6 gap-2 text-center">
                {mainFactorKeys.map((k) => {
                  const score = totalCnt > 0 ? Number((factorSum[k] / totalCnt).toFixed(1)) : 0;
                  const isHigh = score >= 80;
                  const isLow = score < 60;
                  return (
                    <div key={k} className="bg-white border border-slate-200 rounded-md p-1.5 flex flex-col justify-between shadow-xs">
                      <div className="text-slate-600 font-extrabold text-xs mb-0.5">{mainFactorNames[k]}</div>
                      <div className={`text-base font-black font-display mb-1 ${isHigh ? "text-blue-700" : isLow ? "text-red-600" : "text-slate-900"}`}>
                        {score}<span className="text-[11px] font-bold text-slate-500 ml-0.5">점</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${isHigh ? "bg-blue-600" : isLow ? "bg-red-500" : "bg-emerald-500"}`} 
                          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* 강화된 영역: 인사 관리 권고사항 및 종합 총평 (경영층 가독성 특화: 폰트 확대 & 명확한 가이드) */}
            {/* ========================================================================= */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-col shadow-xs flex-grow justify-between">
              
              {/* 섹션 헤더 & 종합 평가 요약 진단 */}
              <div className="mb-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 mb-1.5">
                  <h3 className="text-sm font-black text-[#002c5f] flex items-center gap-1.5">
                    <span>📌</span> 인사 관리 권고사항 및 종합 총평 (HR Executive Guidelines)
                  </h3>
                  <span className="text-xs font-bold text-slate-600">
                    평가 대상: {selectedCompany === "ALL" ? "전체 협력사" : selectedCompany} ({totalCnt}명)
                  </span>
                </div>
                {/* 실시간 데이터 기반 종합 총평 브리핑 - 경영층용 큰 글씨 */}
                <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 text-xs text-slate-800 leading-relaxed font-medium">
                  <div className="flex items-start gap-2">
                    <span className="text-blue-700 font-black mt-0.5 shrink-0 text-sm">■</span>
                    <div>
                      <strong className="text-slate-950 font-black">역량 종합 진단: </strong>
                      본 평가 집단의 종합 평균 점수는 <strong className="text-blue-800 font-black">{avgScore}점</strong>으로 
                      {Number(avgScore) >= 75 ? " 조선소 현장 요구 기준치를 안정적으로 상회하는 양호한" : " 현장 적응 지도가 권장되는 보통"} 수준입니다.
                      가장 우수한 역량은 <strong className="text-emerald-800 font-black">{highestFactor.name}({highestFactor.score}점)</strong>이며, 
                      상대적 집중 지도가 필요한 항목은 <strong className="text-amber-800 font-black">{lowestFactor.name}({lowestFactor.score}점)</strong>으로 확인되었습니다.
                      전체 응시자 중 <strong className="text-emerald-700 font-black">{passCnt}명({passRate}%)</strong>이 적격 판정을 받았습니다.
                    </div>
                  </div>
                </div>
              </div>

              {/* 3단계 등급별 인사 배치 및 현장 관리 가이드 매트릭스 - 폰트 확대 */}
              <div className="grid grid-cols-3 gap-2.5 mb-2 text-xs">
                {/* 1. 채용 적격군 */}
                <div className="bg-emerald-50/50 border border-emerald-300 rounded-md p-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between font-black text-emerald-900 text-xs mb-1 pb-1 border-b border-emerald-200">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        1. 채용 적격군
                      </span>
                      <span className="text-emerald-800 font-mono font-black">{passCnt}명 ({passRate}%)</span>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-800 mb-1">[S · A · B1 등급]</div>
                    <p className="text-slate-800 leading-normal font-medium text-[11.5px]">
                      규범 준수 및 안전의식이 검증된 인력입니다. 조선소 주력 공정(취부, 용접, 도장, 의장)에 즉시 배치 가능하며 안정적인 적응이 기대됩니다.
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-emerald-200 text-xs font-black text-emerald-800">
                    권고: 표준 OJT 및 기초안전교육 후 즉시 투입
                  </div>
                </div>

                {/* 2. 조건부 관찰/보류군 */}
                <div className="bg-amber-50/50 border border-amber-300 rounded-md p-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between font-black text-amber-900 text-xs mb-1 pb-1 border-b border-amber-200">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        2. 조건부 관찰군
                      </span>
                      <span className="text-amber-800 font-mono font-black">{reviewCnt}명 ({reviewRate}%)</span>
                    </div>
                    <div className="text-[11px] font-bold text-amber-800 mb-1">[B2 · C1 등급]</div>
                    <p className="text-slate-800 leading-normal font-medium text-[11.5px]">
                      기본 직무 수행은 가능하나 감정 조절이나 규정 준수에 일시적 편차가 관찰됩니다. 고위험 단독 작업을 배제하고 숙련 멘토와 2인 1조 페어링을 권장합니다.
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-amber-200 text-xs font-black text-amber-800">
                    권고: 숙련공 1:1 멘토링 및 초기 3개월 모니터링
                  </div>
                </div>

                {/* 3. 집중 관리/부적격군 */}
                <div className="bg-red-50/50 border border-red-300 rounded-md p-2.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between font-black text-red-900 text-xs mb-1 pb-1 border-b border-red-200">
                      <span className="flex items-center gap-1.5">
                        <ShieldAlert className="w-4 h-4 text-red-600" />
                        3. 집중 관리군
                      </span>
                      <span className="text-red-800 font-mono font-black">{dangerCnt}명 ({dangerRate}%)</span>
                    </div>
                    <div className="text-[11px] font-bold text-red-800 mb-1">[C2 · D 등급 / 비신뢰]</div>
                    <p className="text-slate-800 leading-normal font-medium text-[11.5px]">
                      안전수칙 경시 위험 및 응답 신뢰도 저하가 감지된 고위험군입니다. 즉시 배치 불가하며, 안전책임자 1:1 심층 면담 후 부적격 판단 시 채용 재검토가 필요합니다.
                    </p>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-red-200 text-xs font-black text-red-800">
                    권고: 안전책임자 심층 면담 및 고위험 공정 배제
                  </div>
                </div>
              </div>

              {/* 조선소 현장 E-7 맞춤 안전관리 3대 프로토콜 - 글씨 확대 */}
              <div className="pt-2 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 font-black text-slate-900 mb-1.5">
                    <HardHat className="w-4 h-4 text-amber-500" />
                    <span className="text-xs">조선소 현장 중점 안전관리 3대 프로토콜</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 text-xs text-slate-700 leading-snug">
                    <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
                      <strong className="text-slate-900 block mb-1 font-bold">① 중대재해 예방</strong>
                      추락·낙하·협착 위험 구역 진입 전 TBM 안전 점검 및 보호구 100% 착용 의무화
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
                      <strong className="text-slate-900 block mb-1 font-bold">② 시각화 소통</strong>
                      모국어 번역 및 픽토그램 안전 매뉴얼 배포, 비상 호각/수신호 소통 체계 확립
                    </div>
                    <div className="bg-white p-2 rounded border border-slate-200 shadow-2xs">
                      <strong className="text-slate-900 block mb-1 font-bold">③ 현장 적응 지원</strong>
                      초기 언어·문화적 고충 해소를 위한 1:1 멘토 배정 및 전담 상담 창구 운영
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="pt-1.5 text-center text-xs text-slate-400 font-black tracking-[0.2em] mt-auto shrink-0 flex justify-between items-center border-t border-slate-100">
              <span>HD HYUNDAI CONFIDENTIAL • DO NOT DISTRIBUTE</span>
              <span className="font-mono">P. 2 / 3+</span>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* PAGE 3 onwards: 세부 대상자 명단 (DETAILED CANDIDATE ROSTER)               */}
          {/* ========================================================================= */}
          <div className="total-report-flowing-page bg-white relative w-[210mm] mt-8 p-[15mm_18mm] shadow-lg">
            <table className="w-full text-xs border-collapse border-x border-b border-slate-200" style={{ pageBreakInside: 'auto' }}>
              <thead className="print:table-header-group">
                <tr>
                  <td colSpan={10} className="bg-white border-none p-0">
                    <div className="border-b-[3px] border-[#002c5f] pb-3 mb-4 flex justify-between items-end text-left">
                      <div>
                        <h2 className="text-2xl font-black text-[#002c5f] tracking-tight">세부 대상자 명단 및 평가 결과</h2>
                        <div className="text-xs text-slate-500 mt-1 font-mono">
                          {selectedCompany !== "ALL" ? `[${selectedCompany}] ` : ""}
                          {selectedDate !== "ALL" ? `[${selectedDate}] ` : ""}
                          총 {totalCnt}명 종합 평가 상세 목록
                        </div>
                      </div>
                      <img 
                        src="/ci.png" 
                        alt="HD HYUNDAI SAMHO" 
                        className="h-7 object-contain" 
                        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                      />
                    </div>
                  </td>
                </tr>
                <tr className="bg-slate-100 border-y-2 border-slate-300 font-bold text-slate-700 uppercase text-[11px]">
                  <th className="py-2.5 px-1 border border-slate-200 text-center w-[5%] font-mono">NO</th>
                  <th className="py-2.5 px-2 border border-slate-200 text-center w-[13%]">협력업체명</th>
                  <th className="py-2.5 px-2 border border-slate-200 text-center w-[11%]">검사일자</th>
                  <th className="py-2.5 px-2 border border-slate-200 text-center w-[11%]">수험번호</th>
                  <th className="py-2.5 px-2 border border-slate-200 text-center w-[13%]">성명</th>
                  <th className="py-2.5 px-1 border border-slate-200 text-center w-[7%]">국적</th>
                  <th className="py-2.5 px-1 border border-slate-200 text-center w-[8%]">점수</th>
                  <th className="py-2.5 px-1 border border-slate-200 text-center w-[8%]">등급</th>
                  <th className="py-2.5 px-2 border border-slate-200 text-center w-[11%]">신뢰도</th>
                  <th className="py-2.5 px-2 border border-slate-200 text-center w-[13%]">인사 판정</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                {sortedData.map((d, idx) => {
                  let code = "B1";
                  if (d.decision.includes("(")) {
                    const match = d.decision.match(/\(([^)]+)\)/);
                    if (match) code = match[1];
                  } else {
                    code = d.decision;
                  }
                  code = code.replace(/[^A-Z0-9]/g, "");
                  if (code === "C") code = d.total < 50 ? "C2" : "C1";
                  else if (code === "B") code = d.total < 66 ? "B2" : "B1";

                  const isDanger = code === "C2" || code === "D";
                  const isReview = code === "B2" || code === "C1";
                  const isInvalidRel = d.reliability.includes("V3") || d.reliability.includes("V4");

                  const rowBg = isDanger 
                    ? "bg-red-50/80" 
                    : isReview 
                    ? "bg-amber-50/40" 
                    : idx % 2 === 1 
                    ? "bg-slate-50/50" 
                    : "bg-white";

                  let decisionText = "채용 권장";
                  let decisionColor = "text-emerald-700";
                  if (code === "S") { decisionText = "탁월 (즉시투입)"; decisionColor = "text-indigo-700"; }
                  else if (code === "A") { decisionText = "우수 (채용권장)"; decisionColor = "text-blue-700"; }
                  else if (code === "B1") { decisionText = "적격 (기본소양)"; decisionColor = "text-emerald-700"; }
                  else if (code === "B2") { decisionText = "관찰 (초기멘토)"; decisionColor = "text-amber-700"; }
                  else if (code === "C1") { decisionText = "검토 (심층면접)"; decisionColor = "text-orange-700"; }
                  else if (code === "C2") { decisionText = "위험 (안전주의)"; decisionColor = "text-red-700"; }
                  else if (code === "D") { decisionText = "부적격 (채용불가)"; decisionColor = "text-red-800"; }

                  let gradeBadgeClass = "bg-slate-400";
                  if (code.includes("S")) gradeBadgeClass = "bg-indigo-600";
                  else if (code.includes("A")) gradeBadgeClass = "bg-blue-600";
                  else if (code.includes("B1")) gradeBadgeClass = "bg-emerald-600";
                  else if (code.includes("B2")) gradeBadgeClass = "bg-amber-500";
                  else if (code.includes("C1")) gradeBadgeClass = "bg-orange-500";
                  else if (code.includes("C2")) gradeBadgeClass = "bg-red-600";
                  else if (code.includes("D")) gradeBadgeClass = "bg-red-800";

                  const dateOnly = normalizeDateStr(d.date);

                  return (
                    <tr 
                      key={getRecordKey(d, idx)} 
                      className={`${rowBg} break-inside-avoid print:break-inside-avoid transition-colors hover:bg-blue-50/50`} 
                      style={{ pageBreakInside: 'avoid' }}
                    >
                      <td className="py-2 px-1 border border-slate-200 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2 border border-slate-200 font-bold text-slate-800 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                        {d.company || "-"}
                      </td>
                      <td className="py-2 px-2 border border-slate-200 text-slate-500 text-center font-mono text-[10.5px]">
                        {dateOnly}
                      </td>
                      <td className="py-2 px-2 border border-slate-200 font-mono font-bold text-slate-700 text-center">
                        {formatCandidateId(d.id)}
                      </td>
                      <td className="py-2 px-2 border border-slate-200 font-black text-slate-900 text-center">
                        {formatCandidateName(d.name)}
                      </td>
                      <td className="py-2 px-1 border border-slate-200 text-slate-600 font-bold text-center uppercase font-mono text-[10px]">
                        {d.lang ? d.lang.toUpperCase() : "N/A"}
                      </td>
                      <td className="py-2 px-1 border border-slate-200 text-center font-black text-blue-700 font-display text-xs">
                        {d.total}
                      </td>
                      <td className="py-2 px-1 border border-slate-200 text-center">
                        <span
                          className={`inline-block w-[22px] h-[22px] leading-[22px] text-center rounded font-black text-[11px] text-white ${gradeBadgeClass} shadow-sm print-exact`}
                        >
                          {code}
                        </span>
                      </td>
                      <td
                        className={`py-2 px-2 border border-slate-200 text-center font-bold ${
                          isInvalidRel ? "text-red-600 font-black" : "text-slate-700"
                        }`}
                      >
                        {d.reliability.split("(")[0].trim()}
                      </td>
                      <td className={`py-2 px-2 border border-slate-200 text-center font-bold text-[10.5px] ${decisionColor}`}>
                        {decisionText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* End of Report notice */}
            <div className="mt-6 pt-4 pb-8 text-center text-xs text-gray-400 font-black tracking-widest border-t border-slate-200">
              - [ HD현대삼호 인성검사 총괄 보고서 종료 ] -
            </div>
          </div>

        </div>
      )}

      {/* Footer Controls (Screen only) */}
      <div className="text-center no-print my-10 flex gap-4">
        <button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition cursor-pointer flex items-center gap-2"
        >
          <Printer className="w-4 h-4" />
          <span>🖨️ 인쇄 / PDF 저장</span>
        </button>
        <button
          onClick={onClose}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 px-8 py-4 rounded-xl font-bold shadow-sm transition cursor-pointer flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>대시보드로 돌아가기</span>
        </button>
      </div>
    </div>
  );
};
