import React from "react";

interface MainChartProps {
  personalDetails: Record<string, number>;
  averageDetails: Record<string, string>;
  mainDetails?: Record<string, number>;
}

export const MainChart: React.FC<MainChartProps> = ({
  personalDetails,
  averageDetails,
  mainDetails,
}) => {
  // 6대 핵심 역량 팩터 키 및 정의
  const FACTORS = [
    { key: "C", name: "근태·책임", sub: "C1, C2", desc: "출결 성실성 및 과업 완결력" },
    { key: "R", name: "규범·정직", sub: "R1, R2", desc: "사내 표준 준수 및 정직성" },
    { key: "S", name: "안전의식", sub: "S1, S2", desc: "보호구 착용 및 위험 예지 (핵심)" },
    { key: "T", name: "조직협력", sub: "T1, T2", desc: "팀워크 및 다문화 갈등 조율" },
    { key: "E", name: "정서안정", sub: "E1, E2", desc: "스트레스 내성 및 평정심" },
    { key: "A", name: "직무적응", sub: "A1, A2", desc: "기술 습득력 및 조직 순응성" },
  ];

  // 개인 점수 계산
  const cScore = mainDetails?.C ?? Math.round(((personalDetails.C1 || 0) + (personalDetails.C2 || 0)) / 2);
  const rScore = mainDetails?.R ?? Math.round(((personalDetails.R1 || 0) + (personalDetails.R2 || 0)) / 2);
  const sScore = mainDetails?.S ?? Math.round(((personalDetails.S1 || 0) + (personalDetails.S2 || 0)) / 2);
  const tScore = mainDetails?.T ?? Math.round(((personalDetails.T1 || 0) + (personalDetails.T2 || 0)) / 2);
  const eScore = mainDetails?.E ?? Math.round(((personalDetails.E1 || 0) + (personalDetails.E2 || 0)) / 2);
  const aScore = mainDetails?.A ?? Math.round(((personalDetails.A1 || 0) + (personalDetails.A2 || 0)) / 2);

  const scores: Record<string, number> = {
    C: cScore,
    R: rScore,
    S: sScore,
    T: tScore,
    E: eScore,
    A: aScore,
  };

  // 평균 점수 계산
  const getAvg = (k1: string, k2: string) => {
    const v1 = parseFloat(averageDetails[k1] || "70");
    const v2 = parseFloat(averageDetails[k2] || "70");
    return Math.round((v1 + v2) / 2) || 72;
  };

  const avgScores: Record<string, number> = {
    C: getAvg("C1", "C2"),
    R: getAvg("R1", "R2"),
    S: getAvg("S1", "S2"),
    T: getAvg("T1", "T2"),
    E: getAvg("E1", "E2"),
    A: getAvg("A1", "A2"),
  };

  // SVG Radar Chart 계산 (230x215 완벽한 가로·세로 중심 정렬)
  const width = 230;
  const height = 215;
  const centerX = width / 2;
  const centerY = height / 2; // 완벽한 수직 중앙 정렬
  const radius = 66;
  const angleStep = (Math.PI * 2) / 6;
  const startAngle = -Math.PI / 2; // 12시 방향부터 시작

  const getCoordinates = (value: number, index: number, maxVal = 100) => {
    const angle = startAngle + index * angleStep;
    const r = (Math.max(0, Math.min(100, value)) / maxVal) * radius;
    const x = centerX + r * Math.cos(angle);
    const y = centerY + r * Math.sin(angle);
    return { x, y };
  };

  // 배경 육각형 그리드 (20, 40, 60, 80, 100)
  const gridLevels = [20, 40, 60, 80, 100];

  // 개인 다각형 점
  const personalPoints = FACTORS.map((f, i) => getCoordinates(scores[f.key], i))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  // 평균 다각형 점
  const avgPoints = FACTORS.map((f, i) => getCoordinates(avgScores[f.key], i))
    .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  // 밸런스 총평 키워드 판별
  const sDiff = sScore - (avgScores.S || 70);
  const cDiff = cScore - (avgScores.C || 70);
  let balanceType = "전 역량 균형형";
  let balanceBadge = "bg-blue-50 text-blue-700 border-blue-200";

  if (sScore < 60) {
    balanceType = "안전 취약 (밀착 통제)";
    balanceBadge = "bg-red-50 text-red-700 border-red-200";
  } else if (sDiff >= 10 && cDiff >= 8) {
    balanceType = "안전·성실 우수형";
    balanceBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";
  } else if (sScore >= 80 && rScore >= 80) {
    balanceType = "규범·준법 모범형";
    balanceBadge = "bg-indigo-50 text-indigo-700 border-indigo-200";
  } else if (tScore >= 85) {
    balanceType = "협력·소통 중심형";
    balanceBadge = "bg-cyan-50 text-cyan-700 border-cyan-200";
  } else if (Object.values(scores).some((v) => v < 50)) {
    balanceType = "역량 불균형 주의";
    balanceBadge = "bg-amber-50 text-amber-700 border-amber-200";
  }

  // 등급 문자 변환
  const getGrade = (s: number) => (s >= 90 ? "S" : s >= 80 ? "A" : s >= 60 ? "B" : s >= 40 ? "C" : "D");
  const getGradeClass = (g: string) => {
    switch (g) {
      case "S": return "bg-indigo-600 text-white";
      case "A": return "bg-blue-600 text-white";
      case "B": return "bg-emerald-600 text-white";
      case "C": return "bg-amber-500 text-white";
      default: return "bg-red-500 text-white";
    }
  };

  // 백분위 2줄 표시 함수: 상위(줄바꿈)XX% 형태
  const getPercentileLines = (s: number) => {
    let label = "상위";
    let val = "25%";
    let valColor = "text-slate-700 font-bold";
    if (s >= 95) { label = "상위"; val = "2%"; valColor = "text-blue-700 font-black"; }
    else if (s >= 90) { label = "상위"; val = "7%"; valColor = "text-blue-600 font-black"; }
    else if (s >= 85) { label = "상위"; val = "15%"; valColor = "text-indigo-600 font-black"; }
    else if (s >= 80) { label = "상위"; val = "25%"; valColor = "text-slate-800 font-extrabold"; }
    else if (s >= 70) { label = "평균"; val = "수준"; valColor = "text-slate-600 font-bold"; }
    else if (s >= 60) { label = "하위"; val = "40%"; valColor = "text-amber-600 font-bold"; }
    else { label = "하위"; val = "15%"; valColor = "text-red-600 font-bold"; }

    return (
      <div className="flex flex-col items-center justify-center leading-none text-center">
        <span className="text-[8.5px] text-slate-400 font-medium">{label}</span>
        <span className={`text-[9.5px] mt-0.5 tabular-nums ${valColor}`}>{val}</span>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col justify-between">
      {/* 1. 상단: 6대 핵심 역량 방사형 Radar 차트 (가로·세로 완벽 중앙 정렬) */}
      <div className="relative flex flex-col items-center justify-center shrink-0 w-full" style={{ height: "225px" }}>
        {/* 범례 */}
        <div className="absolute top-1 right-1 flex items-center gap-2 text-[9px] font-bold z-10">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-[#002c5f] inline-block opacity-85"></span>
            <span className="text-[#002c5f]">본인</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-0.5 border-t-2 border-dashed border-red-500 inline-block"></span>
            <span className="text-red-500">평균</span>
          </div>
        </div>

        {/* SVG 방사형 다각형 */}
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
          {/* 그리드 동심 육각형 */}
          {gridLevels.map((lvl) => {
            const pts = FACTORS.map((_, i) => getCoordinates(lvl, i))
              .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
              .join(" ");
            return (
              <polygon
                key={lvl}
                points={pts}
                fill={lvl === 100 ? "#f8fafc" : "none"}
                stroke="#cbd5e1"
                strokeWidth={lvl === 100 || lvl === 60 ? "1.2" : "0.7"}
                strokeDasharray={lvl === 60 ? "3 3" : undefined}
              />
            );
          })}

          {/* 중심에서 뻗어나가는 6개 축 선 */}
          {FACTORS.map((_, i) => {
            const p = getCoordinates(100, i);
            return (
              <line
                key={i}
                x1={centerX}
                y1={centerY}
                x2={p.x}
                y2={p.y}
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            );
          })}

          {/* 전사 평균 폴리곤 (빨간 점선) */}
          <polygon
            points={avgPoints}
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />

          {/* 본인 점수 폴리곤 (네이비/블루 채우기) */}
          <polygon
            points={personalPoints}
            fill="#0284c7"
            fillOpacity="0.38"
            stroke="#002c5f"
            strokeWidth="2.5"
          />

          {/* 본인 점수 꼭짓점 마커 */}
          {FACTORS.map((f, i) => {
            const p = getCoordinates(scores[f.key], i);
            return (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="3"
                fill="#002c5f"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            );
          })}

          {/* 6개 축 텍스트 라벨 (가로·세로 중앙 정렬 및 서체 통일) */}
          {FACTORS.map((f, i) => {
            const angle = startAngle + i * angleStep;
            const labelR = radius + 20;
            const lx = centerX + labelR * Math.cos(angle);
            const ly = centerY + labelR * Math.sin(angle);
            const score = scores[f.key];
            const isSafety = f.key === "S";

            return (
              <g key={f.key} transform={`translate(${lx}, ${ly})`}>
                <text
                  x="0"
                  y="-4"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="10"
                  fontWeight="800"
                  fill={isSafety ? "#0369a1" : "#1e293b"}
                >
                  {f.name}
                </text>
                <text
                  x="0"
                  y="7.5"
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="10.5"
                  fontWeight="900"
                  fill={score >= 80 ? "#1d4ed8" : score >= 60 ? "#0f766e" : "#b91c1c"}
                >
                  {score}점
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* 2. 하단: 6대 핵심 역량군 정밀 통계 테이블 (사이 여백 최소화 및 완벽한 가로/세로 중앙 정렬) */}
      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white shadow-xs">
        {/* 상단 밸런스 헤더 */}
        <div className="bg-slate-50 border-b border-slate-200 px-2.5 py-1.5 flex justify-between items-center text-[10.5px] font-bold text-slate-700">
          <span className="flex items-center gap-1">
            <span>🎯</span> 6대 핵심 역량 정밀 진단
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${balanceBadge}`}>
            {balanceType}
          </span>
        </div>

        {/* 컬럼 헤더 (모든 컬럼 가로 중앙 정렬) */}
        <div className="bg-slate-100/80 border-b border-slate-200 px-1 py-1 flex items-center text-[9.5px] font-bold text-slate-600">
          <span className="w-[74px] shrink-0 text-center">역량군</span>
          <span className="w-[32px] shrink-0 text-center">등급</span>
          <span className="w-[38px] shrink-0 text-center">점수</span>
          <span className="w-[42px] shrink-0 text-center">전사대비</span>
          <span className="flex-1 text-center">백분위</span>
        </div>

        {/* 6개 데이터 행 (각 행 2줄 백분위, 가로 중앙 정렬, 정돈된 행 여백) */}
        <div className="divide-y divide-slate-100 text-[10.5px]">
          {FACTORS.map((f) => {
            const sc = scores[f.key];
            const gr = getGrade(sc);
            const isSafety = f.key === "S";
            const avg = avgScores[f.key];
            const diff = sc - avg;

            return (
              <div
                key={f.key}
                className={`flex items-center px-1 py-[5.5px] justify-between transition-colors ${
                  isSafety && sc < 60 ? "bg-red-50/70" : "hover:bg-slate-50/50"
                }`}
              >
                {/* 1. 역량명 & 코드 (가로·세로 중앙 정렬) */}
                <div className="w-[74px] shrink-0 flex items-center justify-center gap-1">
                  <span className="w-3 text-[9px] font-bold text-slate-400">
                    {f.key}
                  </span>
                  <span className="font-extrabold text-slate-800 tracking-tight text-[10.5px]">
                    {f.name}
                  </span>
                  {isSafety && (
                    <span className="text-[7.5px] font-bold px-0.5 py-0.2 bg-blue-100 text-blue-700 rounded-xs">
                      핵심
                    </span>
                  )}
                </div>

                {/* 2. 등급 (가로·세로 중앙 정렬) */}
                <div className="w-[32px] shrink-0 flex items-center justify-center">
                  <span className={`w-4 h-4 leading-[16px] text-center rounded text-[9px] font-bold ${getGradeClass(gr)}`}>
                    {gr}
                  </span>
                </div>

                {/* 3. 점수 (가로·세로 중앙 정렬) */}
                <div className="w-[38px] shrink-0 font-extrabold text-slate-900 tabular-nums text-[11px] text-center flex items-center justify-center">
                  {sc}점
                </div>

                {/* 4. 전사대비 차이 (가로·세로 중앙 정렬) */}
                <div className={`w-[42px] shrink-0 text-[9.5px] font-bold tabular-nums text-center flex items-center justify-center ${diff >= 0 ? "text-blue-600" : "text-slate-400"}`}>
                  {diff >= 0 ? `+${diff}` : diff}
                </div>

                {/* 5. 백분위 추정 (가로·세로 중앙 정렬, 상위/XX% 2줄 표시) */}
                <div className="flex-1 text-center flex items-center justify-center">
                  {getPercentileLines(sc)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
