import React from "react";
import { AssessmentResult, formatCandidateId, formatCandidateName } from "../utils/calculations";
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
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

interface TotalReportProps {
  data: AssessmentResult[];
  onClose: () => void;
}

export const TotalReport: React.FC<TotalReportProps> = ({ data, onClose }) => {
  const totalCnt = data.length;
  if (totalCnt === 0) {
    return <div className="p-8 text-center text-slate-500">분석할 데이터가 없습니다.</div>;
  }

  const cCnts = { S: 0, A: 0, B1: 0, B2: 0, C1: 0, C2: 0, D: 0 };
  const factorSum = { C: 0, R: 0, S: 0, T: 0, E: 0, A: 0 };
  let totalScoreSum = 0;
  let riskCnt = 0;

  data.forEach((d) => {
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

  const companyStats: Record<string, { total: number, pass: number, review: number, danger: number, fail: number }> = {};
  data.forEach(d => {
    const comp = d.company || "-";
    if (!companyStats[comp]) {
      companyStats[comp] = { total: 0, pass: 0, review: 0, danger: 0, fail: 0 };
    }
    companyStats[comp].total++;

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

    if (code.includes("S") || code.includes("A") || code.includes("B1")) companyStats[comp].pass++;
    else if (code.includes("B2") || code.includes("C1")) companyStats[comp].review++;
    else if (code.includes("C2")) companyStats[comp].danger++;
    else if (code.includes("D")) companyStats[comp].fail++;
  });

  const companyStatsArray = Object.keys(companyStats).map(comp => ({
    company: comp,
    ...companyStats[comp]
  })).sort((a, b) => b.total - a.total);

  const passCnt = cCnts.S + cCnts.A + cCnts.B1;
  const reviewCnt = cCnts.B2 + cCnts.C1;
  const dangerCnt = cCnts.C2;
  const failCnt = cCnts.D;
  const avgScore = (totalScoreSum / totalCnt).toFixed(1);
  const passRate = ((passCnt / totalCnt) * 100).toFixed(1);

  const mainFactorKeys: Array<keyof typeof factorSum> = ["C", "R", "S", "T", "E", "A"];
  const mainFactorNames = {
    C: "근태/책임",
    R: "규범/정직",
    S: "안전의식",
    T: "조직협력",
    E: "정서안정",
    A: "직무적응",
  };

  const factorAvgs = mainFactorKeys
    .map((k) => ({
      k,
      v: parseFloat((factorSum[k] / totalCnt).toFixed(1)),
      name: mainFactorNames[k],
    }))
    .sort((a, b) => b.v - a.v);

  const strong = factorAvgs[0];
  const weak = factorAvgs[factorAvgs.length - 1];

  const getFormatDate = () => {
    const d = new Date();
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  const radarData = mainFactorKeys.map((k) => ({
    subject: mainFactorNames[k],
    A: parseFloat((factorSum[k] / totalCnt).toFixed(1)),
    fullMark: 100,
  }));

  const pieData = [
    { name: "합격", value: passCnt, color: "#3b82f6" },
    { name: "보류", value: reviewCnt, color: "#fbbf24" },
    { name: "위험", value: dangerCnt, color: "#f97316" },
    { name: "부적격", value: failCnt, color: "#ef4444" },
  ];

  const barData1 = [
    { name: "S", count: cCnts.S, fill: "#1d4ed8" },
    { name: "A", count: cCnts.A, fill: "#2563eb" },
    { name: "B1", count: cCnts.B1, fill: "#3b82f6" },
    { name: "B2", count: cCnts.B2, fill: "#fbbf24" },
    { name: "C1", count: cCnts.C1, fill: "#f59e0b" },
    { name: "C2", count: cCnts.C2, fill: "#f97316" },
    { name: "D", count: cCnts.D, fill: "#ef4444" },
  ];

  const scoreRanges = { "90~": 0, "80~89": 0, "70~79": 0, "60~69": 0, "50~59": 0, "~49": 0 };
  data.forEach(d => {
    if (d.total >= 90) scoreRanges["90~"]++;
    else if (d.total >= 80) scoreRanges["80~89"]++;
    else if (d.total >= 70) scoreRanges["70~79"]++;
    else if (d.total >= 60) scoreRanges["60~69"]++;
    else if (d.total >= 50) scoreRanges["50~59"]++;
    else scoreRanges["~49"]++;
  });

  const barData2 = [
    { name: "90점 이상", count: scoreRanges["90~"], fill: "#10b981" },
    { name: "80점대", count: scoreRanges["80~89"], fill: "#3b82f6" },
    { name: "70점대", count: scoreRanges["70~79"], fill: "#6366f1" },
    { name: "60점대", count: scoreRanges["60~69"], fill: "#f59e0b" },
    { name: "50점대", count: scoreRanges["50~59"], fill: "#f97316" },
    { name: "50점 미만", count: scoreRanges["~49"], fill: "#ef4444" },
  ];

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto text-slate-800">
      <div className="no-print bg-white border border-blue-500/30 rounded-xl p-5 mb-8 text-slate-800 max-w-[210mm] w-full shadow-lg">
        <div className="flex items-center gap-3 mb-3 border-b border-slate-200 pb-2">
          <span className="text-xl">💡</span>
          <h3 className="font-bold text-base text-blue-600">인쇄 및 PDF 저장 가이드</h3>
        </div>
        <ul className="list-disc list-inside space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed pl-1">
          <li>
            <strong className="text-slate-900">배경 그래픽 포함:</strong> 인쇄 설정에서 '배경
            그래픽' 옵션을 반드시 활성화해야 표지와 스타일이 정상적으로 출력됩니다.
          </li>
          <li>
            <strong className="text-slate-900">A4 용지 규격:</strong> 본 보고서는 A4 용지
            크기(210mm x 297mm)에 맞게 3페이지(표지, 종합요약, 대상자명단)로 나뉘어 출력되도록
            최적화되어 있습니다.
          </li>
        </ul>
      </div>

      <div id="view-total-report" className="min-w-[210mm] w-[210mm] mx-auto bg-slate-50 relative flex flex-col items-center">
        {/* PAGE 1: COVER */}
        <div className="a4-page executive-cover bg-white flex flex-col relative overflow-hidden" style={{ minHeight: "297mm", height: "297mm" }}>
          {/* Top Green/Navy Accent Bar */}
          <div className="w-full h-4 bg-gradient-to-r from-[#002c5f] to-[#009539]" />
          
          <div className="flex-grow h-full flex flex-col justify-between p-16">
            <div className="text-right">
              <img src="/ci.png" alt="HD HYUNDAI SAMHO" className="h-12 ml-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
              <span className="hidden font-mono text-xl tracking-widest font-bold text-[#002c5f]">HD HYUNDAI SAMHO</span>
            </div>
            
            <div className="text-left mt-32">
              <div className="text-lg font-bold mb-6 tracking-[0.2em] font-sans text-red-600 border border-red-600 inline-block px-3 py-1 rounded">
                대외비 (CONFIDENTIAL)
              </div>
              <div className="text-6xl font-black leading-tight mb-8 text-[#002c5f] break-keep">
                E-7 외국인 근로자
                <br />
                인성검사 총괄 보고서
              </div>
              <div className="text-2xl font-bold text-slate-500 tracking-widest mb-16">
                PERSONALITY ASSESSMENT REPORT
              </div>
              
              <div className="w-24 h-1.5 bg-[#009539] mb-8" />
              
              <div className="text-2xl font-bold text-slate-700">
                {getFormatDate()}
              </div>
            </div>
            
            <div className="text-left text-lg font-bold text-slate-500 leading-relaxed border-t-2 border-slate-200 pt-6 mt-auto">
              HD현대삼호
              <br />
              동반성장부
            </div>
          </div>
        </div>

        {/* PAGE 2: SUMMARY */}
        <div className="a4-page bg-white p-[15mm_20mm] flex flex-col relative w-[210mm] overflow-hidden" style={{ minHeight: "297mm", height: "297mm" }}>
          <div className="border-b-[3px] border-[#002c5f] pb-3 mb-5 flex justify-between items-end">
            <div>
              <div className="text-3xl font-black text-[#002c5f]">종합 분석 요약</div>
              <div className="text-sm font-black text-gray-400 mt-1 tracking-widest">
                전체 대상자 판정 현황
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-black text-gray-800">총원: {totalCnt}명</div>
              <div className="text-sm text-gray-500 font-bold">{getFormatDate()} 기준</div>
            </div>
          </div>

          <div className="mb-3 pb-2 border-b-2 border-slate-200">
            <div className="text-[1.1rem] font-black text-[#002c5f] flex items-center gap-2 mb-2">
              <span>📝</span> 종합 검토 의견
            </div>
            <div className="bg-slate-100 border-l-[5px] border-[#002c5f] p-[10px_15px] rounded-lg text-[0.95rem] leading-[1.7] text-slate-700 font-medium">
              금번 평가 대상자 총 <span className="text-blue-600 font-black">{totalCnt}명</span> 중
              합격(B1등급 이상) 인원은{" "}
              <span className="text-blue-600 font-black">
                {passCnt}명({passRate}%)
              </span>
              입니다. 보류(B2, C1) 인원은 {reviewCnt}명이며, 위험(C2) 및 부적격(D) 인원은 총{" "}
              {dangerCnt + failCnt}명으로 집계되었습니다.{" "}
              {parseFloat(avgScore) >= 80 ? (
                <>
                  전반적인 인력 수준은 <strong>'우수'</strong>하며, 현장 투입 시 빠른 적응이
                  기대됩니다.
                </>
              ) : parseFloat(avgScore) >= 70 ? (
                <>
                  전반적인 인력 수준은 <strong>'양호'</strong>하나, 일부 인원에 대한 직무 교육이
                  필요할 것으로 판단됩니다.
                </>
              ) : (
                <>
                  전반적인 인력 수준이 다소 <strong>'미흡'</strong>하여, 채용 선별에 각별한 주의가
                  요구됩니다.
                </>
              )}
              <br />
              세부 역량 측면에서는 <strong>'{strong.name}'</strong> 점수가 가장 높게 나타났으나,{" "}
              <strong>'{weak.name}'</strong> 역량은 상대적으로 취약하여 이에 대한 보완 대책(교육 등)이
              권장됩니다.
              {riskCnt > 0 && (
                <>
                  <br />
                  <span className="text-red-500 font-bold">※ 특이사항:</span> 응답 신뢰도가 낮은
                  인원이 {riskCnt}명 식별되어 면접 시 심층 검증이 필요합니다.
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="bg-[#002c5f] text-white border border-[#002c5f] rounded-lg p-2 text-center print-exact">
              <div className="text-[0.7rem] font-bold text-blue-200 mb-1">평균 점수</div>
              <div className="text-[1.6rem] font-black">{avgScore}</div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
              <div className="text-[0.7rem] font-bold text-slate-500 mb-1">합격 (Pass)</div>
              <div className="text-[1.6rem] font-black text-blue-600">
                {passCnt}{" "}
                <span className="text-sm text-slate-400 font-bold">({passRate}%)</span>
              </div>
              <div className="text-[10px] text-slate-500 font-bold mt-1">
                S:{cCnts.S} | A:{cCnts.A} | B1:{cCnts.B1}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
              <div className="text-[0.7rem] font-bold text-slate-500 mb-1">보류 (Review)</div>
              <div className="text-[1.6rem] font-black text-orange-500">{reviewCnt}</div>
              <div className="text-[10px] text-slate-500 font-bold mt-1">
                B2:{cCnts.B2} | C1:{cCnts.C1}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
              <div className="text-[0.7rem] font-bold text-slate-500 mb-1">위험/부적격</div>
              <div className="text-[1.6rem] font-black text-red-500">{dangerCnt + failCnt}</div>
              <div className="text-[10px] text-slate-500 font-bold mt-1">
                C2:{cCnts.C2} | D:{cCnts.D}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 h-[250px]">
            <div className="flex flex-col h-full">
              <div className="text-[1.05rem] font-black text-[#002c5f] flex items-center gap-2 mb-1 border-b border-slate-200 pb-1">
                <span>📊</span> 종합 등급 분포
              </div>
              <div className="flex-1 bg-white rounded-xl flex items-center justify-center p-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={45}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        percent > 0 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                      }
                      labelLine={true}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col h-full">
              <div className="text-[1.05rem] font-black text-[#002c5f] flex items-center gap-2 mb-1 border-b border-slate-200 pb-1">
                <span>📈</span> 6대 핵심 역량 (방사형)
              </div>
              <div className="flex-1 bg-white rounded-xl flex items-center justify-center p-1 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius={50} data={radarData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fill: "#475569", fontSize: 9, fontWeight: "bold" }}
                    />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="평균 점수"
                      dataKey="A"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Radar
                      name="목표 점수"
                      dataKey="fullMark"
                      stroke="#ef4444"
                      fill="transparent"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-2 h-[180px]">
            <div className="flex flex-col h-full">
              <div className="text-[1.05rem] font-black text-[#002c5f] flex items-center gap-2 mb-1 border-b border-slate-200 pb-1">
                <span>📊</span> 판정 등급별 인원 분포
              </div>
              <div className="flex-1 bg-white rounded-xl flex items-center justify-center p-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData1} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]} label={{ position: 'top', fill: '#475569', fontSize: 9, fontWeight: 'bold' }}>
                      {barData1.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="flex flex-col h-full">
              <div className="text-[1.05rem] font-black text-[#002c5f] flex items-center gap-2 mb-1 border-b border-slate-200 pb-1">
                <span>📈</span> 총점 구간별 인원 분포
              </div>
              <div className="flex-1 bg-white rounded-xl flex items-center justify-center p-2 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData2} margin={{ top: 20, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: "bold" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]} label={{ position: 'top', fill: '#475569', fontSize: 9, fontWeight: 'bold' }}>
                      {barData2.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="mt-6 mb-2">
            <div className="text-[1.1rem] font-black text-[#002c5f] border-b-2 border-slate-200 pb-2 mb-3 flex items-center gap-2">
              <span>📌</span> 등급별 상세 정의 및 채용 가이드
            </div>
            <div className="grid grid-cols-2 gap-6">
              <table className="w-full text-xs border-collapse shadow-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-300 p-2 w-[15%] text-slate-600 font-bold">등급</th>
                    <th className="border border-slate-300 p-2 w-[20%] text-slate-600 font-bold">판정</th>
                    <th className="border border-slate-300 p-2 text-slate-600 font-bold">정의 및 가이드</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border border-slate-200 text-center font-black text-blue-700">S</td>
                    <td className="border border-slate-200 text-center font-bold text-slate-700">
                      최우수
                    </td>
                    <td className="border border-slate-200 text-slate-700 font-medium px-3 py-2">
                      조직/직무 역량 탁월 (즉시 투입)
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 text-center font-black text-blue-600">A</td>
                    <td className="border border-slate-200 text-center font-bold text-slate-700">
                      우수
                    </td>
                    <td className="border border-slate-200 text-slate-700 font-medium px-3 py-2">
                      전반적 역량 우수 (채용 권장)
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-slate-200 text-center font-black text-emerald-600">
                      B1
                    </td>
                    <td className="border border-slate-200 text-center font-bold text-slate-700">
                      보통
                    </td>
                    <td className="border border-slate-200 text-slate-700 font-medium px-3 py-2">
                      기본 소양 보유 (채용 권장)
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 text-center font-black text-amber-600">
                      B2
                    </td>
                    <td className="border border-slate-200 text-center font-bold text-slate-700">
                      관찰
                    </td>
                    <td className="border border-slate-200 text-slate-700 font-medium px-3 py-2">
                      역량 평이 (초기 멘토링)
                    </td>
                  </tr>
                </tbody>
              </table>
              <table className="w-full text-xs border-collapse shadow-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border border-slate-300 p-2 w-[15%] text-slate-600 font-bold">등급</th>
                    <th className="border border-slate-300 p-2 w-[20%] text-slate-600 font-bold">판정</th>
                    <th className="border border-slate-300 p-2 text-slate-600 font-bold">정의 및 가이드</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="border border-slate-200 text-center font-black text-orange-500">
                      C1
                    </td>
                    <td className="border border-slate-200 text-center font-bold text-slate-700">
                      검토
                    </td>
                    <td className="border border-slate-200 text-slate-700 font-medium px-3 py-2">
                      취약점/신뢰도 저하 (심층 검증)
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td className="border border-slate-200 text-center font-black text-orange-600">
                      C2
                    </td>
                    <td className="border border-slate-200 text-center font-bold text-slate-700">
                      위험
                    </td>
                    <td className="border border-slate-200 text-slate-700 font-medium px-3 py-2">
                      안전의식 낮음 (특별 관리)
                    </td>
                  </tr>
                  <tr className="bg-white">
                    <td className="border border-slate-200 text-center font-black text-red-600">D</td>
                    <td className="border border-slate-200 text-center font-bold text-slate-700">
                      부적격
                    </td>
                    <td className="border border-slate-200 text-slate-700 font-medium px-3 py-2">
                      부적응/불성실 (채용 불가)
                    </td>
                  </tr>
                  <tr className="bg-slate-50">
                    <td colSpan={3} className="border border-slate-200 h-[33px]"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="pt-2 text-center text-[10px] text-gray-400 font-black tracking-[0.2em]">
            HD현대삼호 인사 보고서
          </div>
        </div>

        {/* PAGE 3: COMPANY STATS */}
        <div className="a4-page bg-white p-[15mm_20mm] flex flex-col relative w-[210mm] overflow-hidden" style={{ minHeight: "297mm", height: "297mm" }}>
          <div className="border-b-[3px] border-[#002c5f] pb-3 mb-5 flex justify-between items-end">
            <div>
              <div className="text-3xl font-black text-[#002c5f] tracking-tighter">업체별 현황</div>
              <div className="text-xs font-bold text-slate-500 mt-1 tracking-widest uppercase font-mono">
                STATUS BY COMPANY
              </div>
            </div>
            <img src="/ci.png" alt="HD HYUNDAI SAMHO" className="h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
            <div className="hidden text-sm font-bold text-[#002c5f]">HD HYUNDAI SAMHO</div>
          </div>

          <div className="flex-grow flex flex-col pt-4">
            <table className="w-full text-sm border-collapse shadow-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="border border-slate-300 p-3 text-left font-bold text-slate-700 w-[30%]">업체명</th>
                  <th className="border border-slate-300 p-3 text-center font-bold text-slate-700 w-[14%]">총원</th>
                  <th className="border border-slate-300 p-3 text-center font-bold text-blue-700 w-[14%]">합격</th>
                  <th className="border border-slate-300 p-3 text-center font-bold text-amber-600 w-[14%]">보류</th>
                  <th className="border border-slate-300 p-3 text-center font-bold text-orange-600 w-[14%]">위험</th>
                  <th className="border border-slate-300 p-3 text-center font-bold text-red-600 w-[14%]">부적격</th>
                </tr>
              </thead>
              <tbody>
                {companyStatsArray.map((stats, idx) => (
                  <tr key={idx} className="bg-white hover:bg-slate-50 break-inside-avoid">
                    <td className="border border-slate-200 p-3 font-bold text-slate-800">{stats.company}</td>
                    <td className="border border-slate-200 p-3 text-center font-bold text-slate-600">{stats.total}</td>
                    <td className="border border-slate-200 p-3 text-center font-black text-blue-700">{stats.pass > 0 ? stats.pass : "-"}</td>
                    <td className="border border-slate-200 p-3 text-center font-black text-amber-600">{stats.review > 0 ? stats.review : "-"}</td>
                    <td className="border border-slate-200 p-3 text-center font-black text-orange-600">{stats.danger > 0 ? stats.danger : "-"}</td>
                    <td className="border border-slate-200 p-3 text-center font-black text-red-600">{stats.fail > 0 ? stats.fail : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pt-2 text-center text-[10px] text-gray-400 font-black tracking-[0.2em] mt-auto">
            HD현대삼호 인사 보고서
          </div>
        </div>

        {/* PAGE 4 onwards: LIST (Chunked) */}
        {(() => {
          const sortedData = [...data].sort((a, b) => {
            const compA = a.company || "";
            const compB = b.company || "";
            if (compA !== compB) {
              return compA.localeCompare(compB);
            }
            return a.id.localeCompare(b.id);
          });
          const ITEMS_PER_PAGE = 16;
          const chunks = [];
          for (let i = 0; i < sortedData.length; i += ITEMS_PER_PAGE) {
            chunks.push(sortedData.slice(i, i + ITEMS_PER_PAGE));
          }
          if (chunks.length === 0) chunks.push([]);

          return chunks.map((chunk, pageIndex) => (
            <div key={`list-page-${pageIndex}`} className="a4-page bg-white p-[15mm_20mm] flex flex-col relative w-[210mm] overflow-hidden" style={{ minHeight: "297mm", height: "297mm" }}>
              <div className="border-b-[3px] border-[#002c5f] pb-3 mb-5 flex justify-between items-end">
                <div>
                  <div className="text-2xl font-black text-[#002c5f]">세부 대상자 명단 {chunks.length > 1 && `(${pageIndex + 1}/${chunks.length})`}</div>
                  <div className="text-sm font-black text-gray-400 mt-1 tracking-widest">
                    검사 결과 상세 리스트
                  </div>
                </div>
              </div>

              <div className="flex-grow overflow-hidden">
                <table className="w-full text-xs border-collapse border border-slate-200">
                  <thead className="bg-slate-100 border-b-2 border-slate-300 font-bold text-slate-600 uppercase">
                    <tr>
                      <th className="p-2 border border-slate-200 text-center w-[15%]">업체명</th>
                      <th className="p-2 border border-slate-200 text-center w-[10%]">ID</th>
                      <th className="p-2 border border-slate-200 text-center w-[20%]">성명</th>
                      <th className="p-2 border border-slate-200 text-center w-[10%]">점수</th>
                      <th className="p-2 border border-slate-200 text-center w-[10%]">등급</th>
                      <th className="p-2 border border-slate-200 text-center w-[10%]">신뢰도</th>
                      <th className="p-2 border border-slate-200 text-center w-[10%]">안전</th>
                      <th className="p-2 border border-slate-200 text-center w-[15%]">비고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {chunk.map((d) => {
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

                      const isRisk =
                        code === "C2" ||
                        code === "D" ||
                        d.reliability.includes("V3") ||
                        d.reliability.includes("V4");

                      const rowClass = isRisk ? "bg-red-50" : "";
                      const remark = isRisk
                        ? code === "D"
                          ? "채용부적격"
                          : d.reliability.includes("V3")
                          ? "신뢰도검증"
                          : "심층면접필요"
                        : "-";

                      let gradeBadgeClass = "bg-slate-400";
                      if (code.includes("S")) gradeBadgeClass = "bg-indigo-600";
                      else if (code.includes("A")) gradeBadgeClass = "bg-blue-500";
                      else if (code.includes("B")) gradeBadgeClass = "bg-emerald-500";
                      else if (code.includes("C")) gradeBadgeClass = "bg-amber-500";
                      else if (code.includes("D")) gradeBadgeClass = "bg-red-500";

                      return (
                        <tr key={d.id + d.name} className={`${rowClass} break-inside-avoid`}>
                          <td className="p-2 border border-slate-200 font-bold text-slate-700 text-center">
                            {d.company || "-"}
                          </td>
                          <td className="p-2 border border-slate-200 font-mono text-slate-500 text-center">
                            {formatCandidateId(d.id)}
                          </td>
                          <td className="p-2 border border-slate-200 font-bold text-slate-800 text-center">
                            {formatCandidateName(d.name)}
                          </td>
                          <td className="p-2 border border-slate-200 text-center font-bold text-blue-700">
                            {d.total}
                          </td>
                          <td className="p-2 border border-slate-200 text-center">
                            <span
                              className={`inline-block w-[22px] h-[22px] leading-[22px] text-center rounded-full font-black text-[0.75rem] text-white ${gradeBadgeClass} print-exact`}
                            >
                              {code}
                            </span>
                          </td>
                          <td
                            className={`p-2 border border-slate-200 text-center ${
                              d.reliability.includes("V3") || d.reliability.includes("V4")
                                ? "text-red-600 font-bold"
                                : "text-slate-600"
                            }`}
                          >
                            {d.reliability.split("(")[0].trim()}
                          </td>
                          <td className="p-2 border border-slate-200 text-center text-slate-700">
                            {d.details.S1}/{d.details.S2}
                          </td>
                          <td className="p-2 border border-slate-200 text-slate-500 text-center text-[11px] font-bold">
                            {remark}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pageIndex === chunks.length - 1 && (
                <div className="mt-4 pt-4 text-center text-xs text-gray-300 font-black tracking-widest">
                  [ 보고서 끝 ]
                </div>
              )}
            </div>
          ));
        })()}
      </div>

      <div className="text-center no-print my-10 flex gap-4">
        <button
          onClick={() => {
            const isInIframe = window.self !== window.top;
            if (isInIframe) {
              if (
                window.confirm(
                  "💡 [안내] iframe 환경에서는 총괄보고서 인쇄 시 페이지가 잘릴 수 있습니다.\n\n우측 상단의 '새 탭에서 열기'를 권장합니다.\n진행하시겠습니까?"
                )
              ) {
                setTimeout(() => window.print(), 300);
              }
            } else {
              setTimeout(() => window.print(), 300);
            }
          }}
          className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition cursor-pointer"
        >
          🖨️ 인쇄 / PDF 저장
        </button>
        <button
          onClick={onClose}
          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 px-8 py-4 rounded-xl font-bold shadow-sm transition cursor-pointer"
        >
          대시보드로 돌아가기
        </button>
      </div>
    </div>
  );
};
