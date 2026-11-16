import { QUESTIONS_FULL } from "../questions";

export interface AssessmentResult {
  id: string;
  name: string;
  company: string;
  date: string;
  total: number;
  reliability: string;
  decision: string;
  details: Record<string, number>;
  mainDetails: Record<string, number>;
  minScore: number;
  answers: Record<number, number>;
  isTooFast?: boolean;
  source: string;
  lang?: string;
  docId?: string;
  diagnosis?: {
    l1: number;
    l2: number;
    kCnt?: number;
    fCnt?: number;
    inconsistentCnt?: number;
    contradictCnt?: number;
    maxC: number;
    sFail: boolean;
    failCnt: number;
  };
}

export function formatCandidateName(name: string): string {
  if (!name) return "";
  return name.trim().toUpperCase();
}

export function formatCandidateId(id: string): string {
  if (!id) return "";
  let formatted = id.replace(/\s+/g, "");
  formatted = formatted.replace(/^([a-zA-Z]+)-?(\d+)$/, "$1-$2");
  return formatted.toUpperCase();
}

/**
 * 수험번호 자연 정렬 (Natural Sort):
 * 예: K-01, K-02, ..., K-99, K-100 순으로 자리수(2자리, 3자리 등)에 상관없이
 * 아라비아 숫자 오름차순으로 정확하게 정렬
 */
export function compareCandidateId(idA?: string, idB?: string): number {
  if (!idA && !idB) return 0;
  if (!idA) return 1;
  if (!idB) return -1;

  const aFormatted = formatCandidateId(idA);
  const bFormatted = formatCandidateId(idB);

  // 1. Natural sort (numeric: true를 통해 문자열 내 숫자를 아라비아 숫자값으로 비교)
  const cmp = aFormatted.localeCompare(bFormatted, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  if (cmp !== 0) return cmp;

  // 2. 숫자가 같을 경우(예: K-01 vs K-1) 안정적 정렬
  return idA.localeCompare(idB);
}

export function getRecordKey(r: AssessmentResult, idx?: number): string {
  if (!r) return `rec_${idx ?? Math.random()}`;
  if (r.docId) return `doc_${r.docId}`;
  const idPart = formatCandidateId(r.id || "");
  const namePart = formatCandidateName(r.name || "");
  const datePart = (r.date || "").replace(/[^0-9]/g, "");
  const companyPart = (r.company || "").replace(/[^a-zA-Z0-9가-힣]/g, "");
  const sourcePart = (r.source || "").replace(/[^a-zA-Z0-9가-힣]/g, "");
  const idxPart = idx !== undefined ? `_${idx}` : "";
  return `${idPart}_${namePart}_${datePart}_${companyPart}_${sourcePart}${idxPart}`;
}

export function parseDateStrict(v: any): Date {
  if (!v) return new Date();
  const s = String(v).trim();
  if (!s || s === "-") return new Date();

  // 1. ISO format (e.g., 2026-01-30T15:00:00.000Z)
  if (s.includes("T") && !isNaN(Date.parse(s))) {
    return new Date(s);
  }

  // 시간(HH:mm[:ss])이 문자열 앞이나 뒤에 함께 포함된 경우 추출하여 유실 방지
  const timeMatch = s.match(/(?:^|\s)(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  const hh = timeMatch ? parseInt(timeMatch[1], 10) : 0;
  const mm = timeMatch ? parseInt(timeMatch[2], 10) : 0;
  const ss = timeMatch && timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;

  // 2. YYYY-MM-DD or YYYY.MM.DD or YYYY/MM/DD (Korean or standard formats)
  let m = s.match(/(\d{4})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10), hh, mm, ss);
  }

  // 3. DD/MM/YYYY or DD-MM-YYYY (e.g., "09:56:16 31/1/2026" or "31/01/2026")
  m = s.match(/(\d{1,2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{4})/);
  if (m) {
    const first = parseInt(m[1], 10);
    const second = parseInt(m[2], 10);
    const year = parseInt(m[3], 10);
    return new Date(year, second - 1, first, hh, mm, ss);
  }

  // 4. Excel numeric serial date
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    const excelEpoch = new Date(1899, 11, 30);
    excelEpoch.setDate(excelEpoch.getDate() + Math.floor(serial));
    return excelEpoch;
  }

  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  return new Date();
}

export function getStandardDate(): string {
  const n = new Date();
  return `${n.getFullYear()}.${String(n.getMonth() + 1).padStart(2, "0")}.${String(n.getDate()).padStart(2, "0")}`;
}

export function formatDate(dStr: string, includeTime = false): string {
  if (!dStr || dStr === "-") return "-";
  const o = parseDateStrict(dStr);
  const base = `${o.getFullYear()}.${String(o.getMonth() + 1).padStart(2, "0")}.${String(o.getDate()).padStart(2, "0")}`;
  if (includeTime) {
    const hours = String(o.getHours()).padStart(2, "0");
    const minutes = String(o.getMinutes()).padStart(2, "0");
    return `${base} ${hours}:${minutes}`;
  }
  return base;
}

export function getYYYYMMDD(d: any): string {
  return formatDate(d, false);
}

export function calculateAll(name: string, map: Record<number, number>): Omit<AssessmentResult, "id" | "company" | "date" | "source"> {
  const s: Record<string, number> = { C1: 0, C2: 0, R1: 0, R2: 0, S1: 0, S2: 0, T1: 0, T2: 0, E1: 0, E2: 0, A1: 0, A2: 0 };
  const c: Record<string, number> = { C1: 0, C2: 0, R1: 0, R2: 0, S1: 0, S2: 0, T1: 0, T2: 0, E1: 0, E2: 0, A1: 0, A2: 0 };

  // 세부 영역별 정방향/역방향 문항 모순(문항 미숙지 일괄 마킹) 탐지용 누적기
  const posStats: Record<string, { sum: number; cnt: number }> = {};
  const revStats: Record<string, { sum: number; cnt: number }> = {};

  const ansArr: number[] = [];
  Object.keys(map)
    .map(Number)
    .sort((a, b) => a - b)
    .forEach((k) => ansArr.push(map[k]));

  QUESTIONS_FULL.forEach((q) => {
    if (map[q.id] !== undefined && q.type !== "REL") {
      const raw = map[q.id];
      const val = q.rev ? 6 - raw : raw;
      const norm = ((val - 1) / 4) * 100;
      s[q.type] += norm;
      c[q.type]++;

      if (q.rev) {
        if (!revStats[q.type]) revStats[q.type] = { sum: 0, cnt: 0 };
        revStats[q.type].sum += norm;
        revStats[q.type].cnt++;
      } else {
        if (!posStats[q.type]) posStats[q.type] = { sum: 0, cnt: 0 };
        posStats[q.type].sum += norm;
        posStats[q.type].cnt++;
      }
    }
  });

  const sub: Record<string, number> = {};
  let contradictCnt = 0;
  Object.keys(c).forEach((k) => {
    sub[k] = c[k] > 0 ? Math.round(s[k] / c[k]) : 0;

    // 동일 영역 내 정방향 평균과 역방향 평균의 차이가 60점 이상이면 정·역문항 자기모순 카운트
    if (posStats[k]?.cnt && revStats[k]?.cnt) {
      const pAvg = posStats[k].sum / posStats[k].cnt;
      const rAvg = revStats[k].sum / revStats[k].cnt;
      if (Math.abs(pAvg - rAvg) >= 60) {
        contradictCnt++;
      }
    }
  });

  const main: Record<string, number> = {
    C: Math.round(((sub.C1 || 0) + (sub.C2 || 0)) / 2),
    R: Math.round(((sub.R1 || 0) + (sub.R2 || 0)) / 2),
    S: Math.round(((sub.S1 || 0) + (sub.S2 || 0)) / 2),
    T: Math.round(((sub.T1 || 0) + (sub.T2 || 0)) / 2),
    E: Math.round(((sub.E1 || 0) + (sub.E2 || 0)) / 2),
    A: Math.round(((sub.A1 || 0) + (sub.A2 || 0)) / 2),
  };

  // 6대 역량을 모두 포함하되, 조선업 현장 특성에 맞춘 가중치 적용 (총합 6.0)
  const total = Math.round((main.C * 1.0 + main.R * 1.0 + main.S * 1.5 + main.T * 0.9 + main.E * 0.8 + main.A * 0.8) / 6);

  // 안전 영역 핵심 역문항(58: 보호구 미착용, 61: 안전규칙 무시, 66: 위험 경시, 69: 작업 중 장난) 4개 중 3개 이상에 4~5점(동의) 마킹 시 평균 희석 방지를 위해 안전 과락 처리
  const safetyRevFail = [58, 61, 66, 69].filter((id) => map[id] >= 4).length >= 3;

  const crit = [sub.C1 || 0, sub.C2 || 0, sub.R1 || 0, sub.R2 || 0, sub.S1 || 0, sub.S2 || 0];
  const sFail = (sub.S1 || 0) < 60 || (sub.S2 || 0) < 60 || safetyRevFail;
  const failCnt = crit.filter((v) => v < 60).length;
  const isCritFail = sFail || failCnt >= 2;

  // 비핵심 역량(T, E, A) 포함 12개 세부 역량 중 중립점(50점) 미만인 심각한 결격 요인 존재 여부 (S/A 등급 제한용)
  const hasSevereSubWeakness = Object.values(sub).some((v) => v < 50);

  let rG = "V1";
  const l1 = [85, 86, 87, 88].filter((i) => map[i] >= 4).length;
  const l2 = [93, 94].filter((i) => map[i] === 5).length;
  const kCnt = Object.values(map).filter((v) => v === 3).length;

  // [정합성 보완 1] 허구 문항(85~88, 93~94)에 솔직하게 '1점(전혀 아니다)'으로 응답한 것은 과장/극단 편향이 아니므로 fCnt 모수에서 차감하여 진성 고득점자가 V3로 강등되는 역설 방지
  const rawFCnt = Object.values(map).filter((v) => v === 1 || v === 5).length;
  const honestRelOnes = [85, 86, 87, 88, 93, 94].filter((i) => map[i] === 1).length;
  const fCnt = rawFCnt - honestRelOnes;

  // [정합성 보완 2] 89~92번(REL, rev:true)과 앞쪽 동형 역량 문항(2, 47, 83, 26번) 간의 응답 일관성(Pair Consistency) 검증
  const consistencyPairs: Array<{ a: number; b: number; sameDir: boolean }> = [
    { a: 2, b: 89, sameDir: true },   // 일을 미룸 (C1 rev:true <-> REL rev:true)
    { a: 47, b: 90, sameDir: true },  // 기분 나쁠 때 태도 (E1 rev:true <-> REL rev:true)
    { a: 83, b: 91, sameDir: true },  // 타인과 일할 때 불편함 (A2 rev:true <-> REL rev:true)
    { a: 26, b: 92, sameDir: false }, // 실수 인정 (R2 rev:false <-> REL rev:true)
  ];
  const inconsistentCnt = consistencyPairs.filter(({ a, b, sameDir }) => {
    if (map[a] === undefined || map[b] === undefined) return false;
    const diff = sameDir ? Math.abs(map[a] - map[b]) : Math.abs(map[a] - (6 - map[b]));
    return diff >= 3; // 동일 내용 문항에 3점 이상 차이 나면 비일관 응답으로 판정
  }).length;

  let maxC = 1;
  let curC = 1;
  if (ansArr.length > 0) {
    let p = ansArr[0];
    for (let i = 1; i < ansArr.length; i++) {
      if (ansArr[i] === p) {
        curC++;
        maxC = Math.max(maxC, curC);
      } else {
        p = ansArr[i];
        curC = 1;
      }
    }
  }

  if (l1 >= 3) rG = "V2";
  if (l2 >= 1) rG = "V2";
  if (inconsistentCnt >= 2 || contradictCnt >= 3) rG = "V2";
  if (kCnt >= 65) rG = "V3";
  if (fCnt >= 75) rG = "V3";
  if (l1 === 4) rG = "V3";
  if (l2 === 2) rG = "V3";
  if (l1 >= 3 && l2 >= 1) rG = "V3"; // l1(3개 이상)과 l2(1개 이상) 동시 과장 시 V3
  if (inconsistentCnt >= 3 || contradictCnt >= 5) rG = "V3";
  if (maxC >= 15) rG = "V3";
  if (maxC >= 30) rG = "V4";
  if (maxC >= 90) rG = "V5";

  let dec = "B1";
  if (rG === "V4" || rG === "V5") {
    dec = "D";
  } else if (rG === "V3") {
    if (total >= 85 && !isCritFail && !hasSevereSubWeakness) dec = "B1";
    else dec = "C";
  } else if (isCritFail) {
    dec = "C";
  } else if (total >= 91 && (rG === "V1" || rG === "V2") && main.R >= 88 && main.S >= 88 && !isCritFail && !hasSevereSubWeakness) {
    dec = "S";
  } else if (total >= 81 && (rG === "V1" || rG === "V2") && !hasSevereSubWeakness) {
    dec = "A";
  } else if (total < 66) {
    dec = "B2";
  } else {
    dec = "B1";
  }

  if (dec === "C") {
    if (total < 50) dec = "C2";
    else dec = "C1";
  }

  const gMap: Record<string, string> = {
    S: "최우수 (S)",
    A: "우수 (A)",
    B1: "보통 (B1)",
    B2: "관찰요망 (B2)",
    C1: "주의 (C1)",
    C2: "위험 (C2)",
    D: "부적격 (D)",
  };

  const rMap: Record<string, string> = {
    V1: "매우 높음 (V1)",
    V2: "양호 (V2)",
    V3: "주의 요망 (V3)",
    V4: "위험 (V4)",
    V5: "해석 불가 (V5)",
  };

  return {
    name,
    total,
    reliability: rMap[rG] || rG,
    decision: gMap[dec] || dec,
    details: sub,
    mainDetails: main,
    minScore: Math.min(...crit),
    answers: map,
    diagnosis: { l1, l2, kCnt, fCnt, inconsistentCnt, contradictCnt, maxC, sFail, failCnt },
  };
}

export function generateReportComment(d: any): string {
  const scores = d.details || {};
  const diag = d.diagnosis || {};
  const comments: string[] = [];
  const seed = (d.total || 0) + (d.id ? d.id.charCodeAt(0) : 0);
  
  let baseCode = "B1";
  if (d.decision.includes("(")) {
    const match = d.decision.match(/\(([^)]+)\)/);
    baseCode = match ? match[1] : d.decision;
  } else {
    baseCode = d.decision;
  }
  baseCode = baseCode.replace(/[^A-Z0-9]/g, "");
  
  if (baseCode === "C") {
    baseCode = d.total < 50 ? "C2" : "C1";
  } else if (baseCode === "B") {
    baseCode = d.total < 66 ? "B2" : "B1";
  }

  // 역량 과락 없이 순수하게 신뢰도(V3) 이슈로 인해 C1으로 분류된 고득점자(total >= 66) 구분
  const isV3OnlyC1 =
    baseCode === "C1" &&
    !diag.sFail &&
    (diag.failCnt || 0) < 2 &&
    (d.total || 0) >= 66 &&
    String(d.reliability || "").includes("V3");

  const sPhrases = [
    "조직 적응력과 직무 수행 역량이 매우 탁월한 최상위 인재군입니다.",
    "업무에 대한 헌신과 책임감이 돋보이며, 현장의 리더로 성장할 잠재력을 지닌 최우수 인력입니다.",
    "안정적인 정서와 탁월한 성실성을 바탕으로 어떤 현장에서도 즉각적으로 기여할 수 있는 핵심 인재입니다."
  ];
  const aPhrases = [
    "대부분의 역량이 우수하며, 조직 생활에 긍정적인 영향을 미칠 것으로 기대됩니다.",
    "전반적인 직무 소양이 탄탄하여 현장 규정을 잘 준수하고 동료들과 무난하게 협력할 수 있는 우수 인력입니다.",
    "안정적인 업무 수행 능력과 적응력을 고루 갖추어 성공적인 현장 투입이 예상되는 양호한 후보자입니다."
  ];
  const b1Phrases = [
    "직무 수행에 필요한 기본적인 소양을 갖추고 있어, 현장 적응에 큰 무리가 없을 것으로 판단됩니다.",
    "조선업 현장에 필요한 기본 요건을 충족하고 있으며, 적절한 업무 지시가 주어질 경우 제 몫을 다할 인력입니다.",
    "특별한 결격 사유 없이 보편적인 수준의 역량을 보유하고 있어, 표준적인 교육 후 무난한 업무 수행이 기대됩니다."
  ];
  const b2Phrases = [
    "직무 역량이 다소 평이하거나 소극적인 태도가 엿보여, 입사 후 지속적인 동기 부여와 관리가 필요합니다.",
    "기본적인 역할 수행은 가능하나, 일부 영역에서 소극적이거나 불안정한 모습이 관찰되므로 정기적인 면담과 관심이 요망됩니다.",
    "현장 투입은 가능하지만 특정 스트레스 요인이나 갈등 상황에 다소 취약할 수 있으므로, 초기 적응 기간 동안 세심한 배려가 필요합니다."
  ];
  const c1Phrases = isV3OnlyC1
    ? [
        "표면적인 직무 역량 점수는 양호하나 응답 신뢰도 이슈(과장 또는 편향 응답)가 감지되어, 현장 배치 전 면접을 통한 진위 확인이 요구됩니다.",
        "역량 지표 수치는 평균 이상이나 자신을 방어적으로 포장하거나 일관성 없이 응답한 흔적이 있어, 실무 면접을 통한 교차 검증이 필수적입니다.",
        "응답 패턴의 왜곡 가능성으로 인해 주의 등급으로 분류되었습니다. 결과 수치를 그대로 수용하기보다 면접에서 실제 태도를 재확인하시기 바랍니다."
      ]
    : [
        "일부 역량에서 뚜렷한 약점이나 신뢰도 이슈가 감지되어, 현장 배치 시 주의 깊은 검토와 멘토링이 요구됩니다.",
        "전반적인 역량 점수가 평균을 밑돌거나 특정 핵심 지표에서의 취약점이 두드러져 집중적인 관리 및 지도가 필수적입니다.",
        "직무 적합성 측면에서 우려되는 부분이 존재하므로, 채용 시 해당 인원의 약점을 보완할 수 있는 적절한 부서 배치 및 멘토링 방안이 마련되어야 합니다."
      ];
  const c2Phrases = [
    "역량 점수가 현저히 낮아 현장 투입 시 부적응 및 안전 사고 발생 위험이 큽니다. 강도 높은 사전 교육이나 채용 재고가 필요합니다.",
    "조직 적응력과 책임감 등 핵심 지표가 전반적으로 매우 저조하여, 통상적인 현장 업무 수행에 큰 어려움이 따를 것으로 판단됩니다.",
    "심각한 수준의 직무 역량 결여가 나타나며, 특히 현장에서 요구되는 기본 수칙 준수마저 위태로울 수 있어 채용 및 배치에 극도로 신중해야 합니다."
  ];
  const dPhrases = [
    "조직 부적응 위험이 매우 높거나 불성실한 응답 태도가 확연하여, 현장 투입이 심각하게 우려되는 인력입니다.",
    "다수의 평가 지표에서 기준치를 크게 하회하며, 현장 질서를 훼손할 위험 요인을 내포하고 있어 원칙적으로 채용을 권장하지 않습니다.",
    "극단적으로 낮은 점수 분포와 부적응적 특성을 보이며, 관리자의 통제를 벗어날 소지가 크므로 강력한 채용 배제 고려 대상입니다."
  ];

  let mainDesc = "";
  if (baseCode === "S") mainDesc = sPhrases[seed % sPhrases.length];
  else if (baseCode === "A") mainDesc = aPhrases[seed % aPhrases.length];
  else if (baseCode === "B1") mainDesc = b1Phrases[seed % b1Phrases.length];
  else if (baseCode === "B2") mainDesc = b2Phrases[seed % b2Phrases.length];
  else if (baseCode === "C1") mainDesc = c1Phrases[seed % c1Phrases.length];
  else if (baseCode === "C2") mainDesc = c2Phrases[seed % c2Phrases.length];
  else if (baseCode === "D") mainDesc = dPhrases[seed % dPhrases.length];
  
  comments.push(mainDesc);

  // Tie-breaker priority: 핵심 과락 역량(S > C > R)이 일반 역량(T > A > E)보다 항상 우선하도록 정렬
  const priority = { S: 6, C: 5, R: 4, T: 3, A: 2, E: 1 };
  const getPri = (k: string) => priority[k.charAt(0) as keyof typeof priority] || 0;

  const sortedKeys = Object.keys(scores).sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    return getPri(b) - getPri(a);
  });
  
  const topKey = sortedKeys[0];
  const topScore = scores[topKey];
  
  const weakSortedKeys = Object.keys(scores).sort((a, b) => {
    if (scores[a] !== scores[b]) return scores[a] - scores[b];
    return getPri(b) - getPri(a);
  });

  // 핵심 과락 역량(C1, C2, R1, R2, S1, S2) 중 60점 미만 과락이 존재할 경우, 과락 원인이 된 핵심 역량을 최우선 약점으로 지목
  const critKeys = ["C1", "C2", "R1", "R2", "S1", "S2"];
  const failedCritKeys = critKeys
    .filter((k) => scores[k] !== undefined && scores[k] < 60)
    .sort((a, b) => (scores[a] !== scores[b] ? scores[a] - scores[b] : getPri(b) - getPri(a)));

  const weakKey = failedCritKeys.length > 0 ? failedCritKeys[0] : weakSortedKeys[0];
  const weakScore = scores[weakKey];

  const factorNames: Record<string, string> = {
    C1: "근태 및 시간 관리",
    C2: "책임감",
    R1: "규정 준수",
    R2: "정직성",
    T1: "협력적 태도",
    T2: "갈등 관리",
    E1: "감정 조절",
    E2: "스트레스 관리",
    S1: "안전 수칙 준수",
    S2: "위험 인지 능력",
    A1: "학습 능력",
    A2: "조직 적응력"
  };

  const getStrength = (k: string) => factorNames[k] || "기본 역량";

  let detailDesc = "";
  if (["S", "A", "B1"].includes(baseCode)) {
    if (topScore >= 80) {
      const p1 = [
        `특히 <strong>${getStrength(topKey)}</strong>이(가) 두드러지게 우수하여, 현장에서 긍정적인 역할을 할 것으로 보입니다. `,
        `그 중에서도 <strong>${getStrength(topKey)}</strong> 지표가 상당히 뛰어나, 본인의 강점을 바탕으로 원활한 업무 수행이 기대됩니다. `,
        `무엇보다 <strong>${getStrength(topKey)}</strong> 측면에서 훌륭한 강점을 보이고 있어, 이를 적극적으로 활용하면 조직 내 생산성 향상에 기여할 것입니다. `
      ];
      detailDesc += p1[seed % p1.length];
    }
    
    if (diag.sFail) {
      const p2 = [
        `<br><br>🚨 <strong class='text-red-600'>[안전 경고]</strong> 다만, 안전 관련 역량 점수가 기준치 미달입니다. 현장 투입 전 철저한 안전 교육이 반드시 선행되어야 합니다.`,
        `<br><br>🚨 <strong class='text-red-600'>[안전 경고]</strong> 한편, 기초적인 안전 수칙 준수 의식이 부족한 것으로 나타나, 현장 배치 시 사고 예방을 위한 특별 관리가 강력히 요구됩니다.`,
        `<br><br>🚨 <strong class='text-red-600'>[안전 경고]</strong> 하지만 위험 인지 및 안전 영역의 취약성이 감지되었으므로, 작업 투입 초기부터 엄격한 안전 통제와 주기적인 교육 훈련이 필수적입니다.`
      ];
      detailDesc += p2[(seed + 1) % p2.length];
    } else if (weakScore < 60) {
      const p3 = [
        `다만, 상대적으로 <strong>${getStrength(weakKey)}</strong> 측면은 보완이 필요할 수 있으므로, 관리자의 세심한 지도가 권장됩니다.`,
        `그러나 <strong>${getStrength(weakKey)}</strong> 지표는 다소 낮게 측정되었으므로, 이 부분에 대한 피드백과 역량 개발 지원이 뒷받침되어야 합니다.`,
        `아울러 <strong>${getStrength(weakKey)}</strong> 부분에서 다소 아쉬운 면모가 관찰되므로, 동료 및 상급자의 지속적인 멘토링이 현장 적응을 도울 것입니다.`
      ];
      detailDesc += p3[(seed + 2) % p3.length];
    }
  } else if (["B2", "C1"].includes(baseCode)) {
    if (diag.sFail) {
      const p1 = [
        `<br><br>🚨 <strong class='text-red-600'>[안전 경고]</strong> 무엇보다 안전 관련 역량 점수가 낮아 위험 요인이 존재합니다. 투입 전 확실한 안전 확보 조치가 필요합니다. `,
        `<br><br>🚨 <strong class='text-red-600'>[안전 경고]</strong> 특히 안전 의식이 크게 결여되어 있어, 잠재적인 사고 위험성을 최소화하기 위해 강도 높은 현장 밀착 감독이 수반되어야 합니다. `,
        `<br><br>🚨 <strong class='text-red-600'>[안전 경고]</strong> 최우선적으로 안전 수칙 준수에 대한 경각심이 매우 부족하므로, 현장 내 안전 통제선을 철저히 준수하도록 관리해야 합니다. `
      ];
      detailDesc += p1[seed % p1.length];
    } else if (weakScore < 50 || (baseCode === "C1" && failedCritKeys.length >= 2)) {
      const p2 = [
        `특히 <strong>${getStrength(weakKey)}</strong> 측면에서 상당한 취약점이 드러나, 이로 인한 현장 마찰이나 업무 지연이 우려됩니다. `,
        `무엇보다 <strong>${getStrength(weakKey)}</strong> 부분의 저하가 두드러지게 나타나며, 현장에서 예상치 못한 갈등이나 스트레스로 작용할 수 있습니다. `,
        `가장 취약한 <strong>${getStrength(weakKey)}</strong> 영역에 대해서는 채용 시 혹은 배치 시점에 실무진의 주의 깊은 확인 및 사전 관리가 집중적으로 이루어져야 합니다. `
      ];
      detailDesc += p2[(seed + 1) % p2.length];
    }
    
    if (topScore >= 80) {
      const p3 = [
        `비록 <strong>${getStrength(topKey)}</strong>에서는 긍정적인 면모를 보이나, 전반적인 약점 보완 관리가 우선되어야 합니다.`,
        `<strong>${getStrength(topKey)}</strong> 영역이 우수하게 나타나 일말의 긍정적 잠재력을 지니고 있으나, 타 역량의 결핍이 더 시급한 과제입니다.`,
        `그나마 <strong>${getStrength(topKey)}</strong> 지표에서 일정 수준 이상의 점수를 확보하였으나, 단점 극복을 위한 노력이 병행되지 않으면 현장 적응에 제약이 따를 수 있습니다.`
      ];
      detailDesc += p3[(seed + 2) % p3.length];
    }
  } else {
    if (diag.sFail) {
      const p1 = [
        `<br><br>🚨 <strong class='text-red-600'>[치명적 위험]</strong> 현장 안전수칙에 대한 기본 인식이 심각하게 결여되어 있어, 대형 사고 유발 가능성이 큽니다. `,
        `<br><br>🚨 <strong class='text-red-600'>[치명적 위험]</strong> 안전 불감증이 극히 우려되는 수준으로, 현장 내 다른 작업자들의 안전까지 위협할 수 있는 잠재적 폭탄이 될 수 있습니다. `,
        `<br><br>🚨 <strong class='text-red-600'>[치명적 위험]</strong> 직무 미달뿐만 아니라 안전에 대한 극단적인 무신경함이 돋보여, 어떠한 형태의 현장 작업 투입도 심히 제고되어야 합니다. `
      ];
      detailDesc += p1[seed % p1.length];
    }
    
    const p2 = [
      `전반적인 직무 역량 미달과 함께 <strong>${getStrength(weakKey)}</strong> 부족이 겹쳐, 원활한 직무 수행을 기대하기 어렵습니다.`,
      `극심한 <strong>${getStrength(weakKey)}</strong> 결여와 함께 대부분의 역량이 하위권에 머물러 있어, 조직 차원의 막대한 관리 비용이 초래될 수 있습니다.`,
      `조선업 현장의 기본적인 협업 및 <strong>${getStrength(weakKey)}</strong>조차 달성하기 벅찬 상태로 판단되어 현업 기여도가 매우 불투명합니다.`
    ];
    detailDesc += p2[(seed + 1) % p2.length];
  }
  
  if (detailDesc) {
    comments.push(detailDesc);
  }

  return comments.join(" ");
}

export function generateReliabilityComment(d: any): string {
  const diag = d.diagnosis || {};
  const ans = d.answers || {};
  const isFast = Boolean(d.isTooFast || diag.isTimeCut);
  let msg = "";
  let isLow = false;
  const seed = (d.total || 0) + (d.id ? d.id.charCodeAt(0) : 0);

  if (d.reliability.includes("V1") && !isFast) {
    const p = [
      "응답의 일관성이 매우 높고, 자신을 투명하게 드러냈습니다. <strong class='text-blue-700'>결과의 신뢰도가 매우 높습니다.</strong>",
      "문항 전반에 걸쳐 솔직하고 일관성 있는 답변 패턴을 보였습니다. <strong class='text-blue-700'>본 검사 결과를 전적으로 신뢰하고 판단 근거로 활용하기에 충분합니다.</strong>",
      "자기 포장 없이 매우 객관적인 태도로 검사에 임하였습니다. <strong class='text-blue-700'>응답 내용의 신빙성이 아주 우수합니다.</strong>"
    ];
    msg = p[seed % p.length];
  } else if (d.reliability.includes("V2") && !isFast) {
    const p = [
      "전반적으로 일관된 응답을 보였으며, <strong class='text-blue-600'>결과 해석에 무리가 없는 양호한 수준</strong>입니다.",
      "응답 과정에서 특별한 왜곡이나 모순이 발견되지 않았습니다. <strong class='text-blue-600'>결과를 있는 그대로 수용하고 참고할 수 있습니다.</strong>",
      "대부분의 문항에서 정상적인 응답 성향이 관찰되어, <strong class='text-blue-600'>분석 결과의 타당성이 입증되는 보통 이상의 신뢰도를 보입니다.</strong>"
    ];
    msg = p[seed % p.length];
  } else if (d.reliability.includes("V3") || isFast) {
    const p = [
      "일부 응답에서 신뢰도를 저해할 수 있는 요인이 감지되었습니다. <strong class='text-amber-600'>결과 해석 시 일정 부분 주의가 필요</strong>합니다.",
      "자신을 다소 방어적으로 표현하거나 불규칙하게 응답한 흔적이 일부 발견됩니다. <strong class='text-amber-600'>평가 결과를 맹신하기보다는 참고 자료로 활용할 것을 권장</strong>합니다.",
      "응답 패턴에서 일관성 저하 조짐이 미세하게 엿보입니다. <strong class='text-amber-600'>면접 과정 등을 통해 지원자의 실제 성향을 교차 검증하는 것이 좋습니다.</strong>"
    ];
    msg = p[seed % p.length];
    isLow = true;
  } else {
    const p = [
      "응답의 일관성이 크게 결여되거나 극단적인 응답 패턴을 보여 <strong class='text-red-600'>본 결과를 객관적인 채용 근거로 전적으로 신뢰하기 어렵습니다.</strong>",
      "무작위 응답이나 의도적인 자기 포장이 심각하게 의심되는 패턴이 도출되었습니다. <strong class='text-red-600'>검사 결과의 신빙성이 극도로 낮아 채용 판단 기준으로의 사용을 유보해야 합니다.</strong>",
      "문항에 대한 성실한 답변이 이루어지지 않아 평가 척도들이 심각하게 왜곡되었을 가능성이 큽니다. <strong class='text-red-600'>본 리포트 수치는 무효화 가능성을 염두에 두어야 합니다.</strong>"
    ];
    msg = p[seed % p.length];
    isLow = true;
  }

  if (isLow) {
    // 과거 저장된 DB 레코드(diag.kCnt, diag.fCnt가 없는 경우)와도 완벽히 호환되도록 fallback 처리
    const kCntVal =
      diag.kCnt !== undefined ? diag.kCnt : Object.values(ans).filter((v) => v === 3).length;
    const honestOnes = [85, 86, 87, 88, 93, 94].filter((i) => ans[i] === 1).length;
    const fCntVal =
      diag.fCnt !== undefined
        ? diag.fCnt
        : Object.values(ans).filter((v) => v === 1 || v === 5).length - honestOnes;

    const reasons: string[] = [];
    if (diag.l1 >= 3 || diag.l2 >= 1) reasons.push("자신을 지나치게 긍정적으로 포장(사회적 바람직성 편향)");
    if (kCntVal >= 65) reasons.push("중립('보통') 문항 과다 선택(중심화 경향/판단 유보)");
    if (fCntVal >= 75) reasons.push("양극단('매우 그렇다/전혀 아니다') 과다 선택(극단적 응답 편향)");
    if ((diag.inconsistentCnt || 0) >= 3 || (diag.contradictCnt || 0) >= 5) {
      reasons.push("동일·유사 문항 간 앞뒤 모순 응답(일관성 결여)");
    }
    if (diag.maxC >= 15) reasons.push("동일한 번호 연속 선택(불성실/찍기 응답)");
    if (isFast) reasons.push("비정상적으로 빠른 응답 속도(문항 미숙지/임의 응답)");
    
    if (reasons.length > 0) {
      msg += `<br><br>📌 <strong>주요 의심 사유: ${reasons.join(", ")}</strong><br><span class='text-[0.8rem] text-red-500 font-bold'>※ 면접 시 지원자의 실제 성향 및 태도에 대한 진위 여부를 반드시 재확인하시기 바랍니다.</span>`;
    }
  }
  return msg;
}

export interface BehavioralDescriptor {
  desc: string;
  tag: string;
  tagColor: string;
  isCrit: boolean;
}

export function getBehavioralDescriptor(key: string, score: number, seed = 0): BehavioralDescriptor {
  const pick = (arr: string[]) => arr[Math.abs(seed + score + key.charCodeAt(0) + (key.charCodeAt(1) || 0)) % arr.length];

  // 7개 세분화 점수 구간 (95+, 90~94, 85~89, 80~84, 70~79, 60~69, 60미만) + 후보자별 다변화 소견
  switch (key) {
    case "C1": // 근태/시간
      if (score >= 95) return {
        desc: pick([
          "작업 시작 전 공구·장비 사전 점검 및 출결 무결점, 최상위 근면성 보유",
          "일과 시간 철저 엄수 및 작업 준비 완료 상태로 지각·자리이탈 전무함",
          "정해진 공정 시간표를 완벽히 준수하며 솔선수범하는 모범적 출결 태도"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "작업 준비 철저 및 출결 완벽, 지각·조퇴 없는 높은 시간 관리 역량",
          "아침 TBM 및 조회 시간 엄수, 일과 중 작업 집중도와 시간 활용 탁월",
          "규칙적인 생활 습관으로 일일 공정 일정을 차질 없이 소화하는 성실함"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "출퇴근 시간 엄수 및 업무 준비 성실, 안정적인 일일 근태 리듬 유지",
          "휴게 시간과 작업 시간을 명확히 구분하며 성실한 출결 태도를 보임",
          "일정 관리 의식이 양호하여 공정 투입 시간 및 마감 기한을 잘 지킴"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "통상적인 작업 일과 준수 양호, 잔업·특근 시 컨디션 및 집중도 관리 권장",
          "기본 출결 규정은 무난히 이행하나 연속 작업 시 시간 배분 점검 필요",
          "표준 작업 시간은 준수하나 교대 및 기상 악화 시 출결 리듬 확인 요망"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "기본 근태 기준선은 충족하나 휴게 시간 후 복귀 지연 방지 지도 권장",
          "환경 변화에 따라 작업 준비가 늦어질 수 있어 일일 조회 시 점검 요망",
          "출결 의식이 다소 느슨해질 소지가 있어 반장의 정기적 시간 환기 필요"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "지각·무단이탈 등 근태 불안정 우려, 출퇴근 및 작업 시간 밀착 감독 필수",
          "작업 준비 지연 및 일과 중 자리비움 소지, 엄격한 출결 체크리스트 적용",
          "시간 엄수 의식 미흡으로 공정 차질 우려, 초기 근태 규율 집중 교육 요망"
        ]),
        tag: "주의", tagColor: "bg-amber-50 text-amber-700 border-amber-200", isCrit: false
      };

    case "C2": // 업무책임감
      if (score >= 95) return {
        desc: pick([
          "부여된 블록·공정을 끝까지 완수하며 품질 결함 제로를 추구하는 장인정신",
          "어려운 난공정도 회피 없이 책임 완수하고 자주 검사까지 철저히 이행함",
          "높은 직무 사명감으로 할당량 이상을 정확히 마무리하는 핵심 신뢰 인력"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "맡은 공정 끝까지 완수, 높은 사명감과 철저한 작업 품질 기준 준수",
          "본인 담당 구역의 용접·취부·도장 마감 상태를 스스로 재점검하는 책임감",
          "작업 완결성이 매우 뛰어나며 후속 공정에 피해가 없도록 깔끔히 처리함"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "자신이 맡은 구역 책임 완수, 작업 완료 후 정리정돈 및 재확인 습관 우수",
          "주어진 일일 작업량을 성실히 완수하며 품질 기준을 지키려는 태도 양호",
          "업무 회피 없이 본인의 역할을 꾸준히 수행하여 반장의 신뢰도가 높음"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "부여된 기본 과업 수행 무난, 작업 종료 전 최종 마감 상태 확인 권장",
          "통상적인 공정 책임감은 양호하나 까다로운 구간 작업 시 중간 점검 필요",
          "지시받은 범위 내 업무는 수행하나 자발적 마무리 정리는 독려가 요망됨"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "단순 반복 작업은 소화하나 피로 누적 시 마무리 품질 저하 방지 지도 필요",
          "과업 완수 의지가 다소 수동적이므로 명확한 일일 목표량 부여 및 확인 권장",
          "책임 소재가 모호할 때 소극적일 수 있어 개인별 담당 구역 지정이 효과적"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "난공정 직면 시 업무 회피·마무리 미흡 우려, 단계별 철저한 검수 체계 필수",
          "과업 완수 책임감 저조로 재작업 발생 소지, 반장의 수시 결과물 확인 요망",
          "작업 뒷정리 및 품질 마감 소홀 가능성, 명확한 작업 지시와 완료 점검 필요"
        ]),
        tag: "주의", tagColor: "bg-amber-50 text-amber-700 border-amber-200", isCrit: false
      };

    case "R1": // 규정준수
      if (score >= 95) return {
        desc: pick([
          "작업표준서(WPS) 및 사내 규정 100% 준수, 임의 변경 없는 원칙주의 태도",
          "현장 통제선·작업 허가 절차를 엄격히 지키며 타 작업자의 모범이 됨",
          "관리자 지시와 표준 작업 공정을 한 치의 오차 없이 이행하는 준법 정신"
        ]),
        tag: "모범", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "사내 표준 매뉴얼 및 관리자 지시 철저 준수, 임의 공정 변경 일절 배제",
          "정해진 작업 절차와 기숙사·사내 생활 규율을 흔들림 없이 성실히 준수함",
          "편법을 쓰지 않고 표준 공법을 고수하여 공정 안정성을 높이는 모범 인력"
        ]),
        tag: "모범", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "작업 표준 및 사내 규정 준수 태도 우수, 정해진 작업 지침 성실히 이행",
          "반장의 작업 지시권을 존중하며 현장 질서와 절차를 안정적으로 따름",
          "사내 보안·출입·작업 규정을 잘 숙지하고 일탈 없이 준수하는 양호한 태도"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "표준 매뉴얼 준수 보통, 작업 숙련 후 본인 임의 방식 작업 방지 지도 권장",
          "기본 사내 규율은 따르나 바쁜 공정 상황에서 절차 생략 없도록 환기 필요",
          "대체로 지시에 순응하나 세부 작업 표준서 기준을 반복 교육하면 효과적"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "통상적 규율은 준수하나 감독자 부재 시 편의 위주 작업 습관 경계 요망",
          "자국 작업 관행을 고집할 소지가 있어 현대삼호 표준 공법 사전 교육 필수",
          "규정 인식은 있으나 실천력이 다소 느슨할 수 있어 주기적 규율 점검 권장"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "[규정위반 우려] 작업 지시 불응 및 임의 편법 작업 가능성, 엄격 통제 필수",
          "[규율일탈 주의] 표준 절차 무시 및 독단적 행동 우려, 현장 규율 집중 감독",
          "[지시불이행 경계] 사내 규정 경시 성향 감지, 위반 시 즉각 교정 조치 요망"
        ]),
        tag: "위험", tagColor: "bg-red-100 text-red-700 border-red-300", isCrit: true
      };

    case "R2": // 정직성
      if (score >= 95) return {
        desc: pick([
          "작업 오류·자재 손망실 발생 시 즉시 자진 보고하는 최고 수준의 투명성",
          "거짓 변명 없이 작업 현황과 문제점을 있는 그대로 공유하는 높은 도덕성",
          "공구·자재 관리 및 작업 일지 기록에 있어 한 점 의혹 없는 정직한 태도"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "하자나 과실 발생 시 은폐 없이 즉시 보고, 투명하고 정직한 직무 태도",
          "본인의 실수를 솔직히 인정하고 신속히 수정 지시를 구하는 신뢰성 보유",
          "표리부동함 없이 일관되고 진실한 태도로 관리자와 동료의 신임이 두터움"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "작업 과정의 문제점 솔직 보고, 신뢰할 수 있는 작업 태도 및 정직성 유지",
          "자재·공구 사용 및 작업 진척도 보고가 투명하여 현장 관리가 수월함",
          "과실 책임을 타인에게 전가하지 않고 정직하게 소명하는 건전한 직업윤리"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "통상적인 직무 정직성 양호, 경미한 작업 오류도 즉시 보고토록 독려 권장",
          "전반적으로 솔직하나 질책에 대한 두려움으로 보고가 늦어지지 않게 배려",
          "기본 도덕성은 무난하며, 불량 발생 시 처벌보다 개선 중심 소통이 효과적"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "불리한 상황에서 방어적 변명 소지, 작업 결과를 눈으로 직접 확인 권장",
          "작업 미숙이나 작은 실수를 감추려 할 수 있어 심리적 안전감과 검수 병행",
          "구두 보고만 믿기보다 공정 중간 단계에서 실물 품질 검수를 진행할 것"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "[은폐 주의] 불량·실수 발생 시 임의 은폐 소지, 공정 단계별 교차 검수 필수",
          "[허위보고 경계] 작업 진척도 과장 및 책임 회피 우려, 철저한 실물 확인 요망",
          "[신뢰도 주의] 과실 축소·변명 경향 감지, 명확한 작업 이력 기록 관리 필요"
        ]),
        tag: "주의", tagColor: "bg-amber-50 text-amber-700 border-amber-200", isCrit: false
      };

    case "S1": // 안전수칙
      if (score >= 95) return {
        desc: pick([
          "안전모·안전벨트 100% 체결 및 4대 골든룰을 자율 실천하는 안전 모범 인력",
          "밀폐·고소·화기 작업 전 안전 허가 수칙을 철저히 준수하는 무재해 파수꾼",
          "감독자 유무와 무관하게 개인보호구 착용과 안전 절차를 완벽히 체질화함"
        ]),
        tag: "안전우수", tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "보호구 착용 및 안전 절차 철저 준수, 현장 안전 수칙의 엄격한 자율 실행",
          "TBM 안전 지시사항을 즉시 현장에 적용하며 위험한 지름길 작업을 거부함",
          "고소 족장 안전고리 체결 및 방진·방독 마스크 착용 습관이 매우 확고함"
        ]),
        tag: "안전우수", tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "안전 장구 완벽 착용 및 기본 안전 규칙 준수, 현장 사고 예방 의식 우수",
          "작업 전 안전 점검에 적극 동참하며 정해진 안전 통로와 수칙을 잘 지킴",
          "보호구 착용 상태가 양호하고 관리자의 안전 지적을 즉각 수용·시정함"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "기본 보호구 착용 양호, 납기 압박 시 안전 절차 생략 없도록 지속 환기",
          "안전 규정 인지는 무난하나 더위·답답함으로 보호구 해이해지지 않게 점검",
          "통상적 안전 수칙은 준수하나 반복 작업 시 방심하지 않도록 일일 TBM 강조"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "안전 기준선은 통과했으나 작업 편의를 위해 안전고리 미체결 등 불시 점검 요망",
          "수칙 중요성은 아나 실천이 다소 수동적이므로 반장의 현장 순찰 지도 필수",
          "익숙한 공정에서 안전 장구 착용을 소홀히 할 수 있어 시작 전 맞점검 권장"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "[안전과락 🚨] 보호구 미착용 및 안전불감증 심각, 고위험 투입 금지·재교육 필수",
          "[안전과락 🚨] 안전 수칙 경시 및 임의 작업 위험 높음, 밀착 통제 및 특별 관리",
          "[안전과락 🚨] 중대재해 유발 우려가 큰 안전 의식 미달, 단독 작업 절대 배제"
        ]),
        tag: "과락", tagColor: "bg-red-100 text-red-700 border-red-300", isCrit: true
      };

    case "S2": // 위험인지
      if (score >= 95) return {
        desc: pick([
          "크레인 인양·밀폐구역·화기 주변 잠재 위험을 즉시 간파하고 선제 예방함",
          "작업장 주변 이상 징후(가스·불티·족장 불량) 감지력이 탁월한 방어적 작업자",
          "돌발 위험 상황 시 즉각 작업중지권을 행사하고 동료를 대피시키는 판단력"
        ]),
        tag: "위험예지", tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "작업장 주변 위험 요인 사전 감지 및 능동적 예방, 방어적 작업 습관 체화",
          "협착·추락·낙하물 위험 반경을 사전에 파악하여 안전 거리를 철저히 확보함",
          "위험 예지 훈련(KYT) 이해도가 높고 복합 공정 간 간섭 위험을 잘 식별함"
        ]),
        tag: "위험예지", tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "협착·낙하·화재 위험요인 사전 식별 우수, 신속하고 적절한 위험 회피 행동",
          "작업 환경의 변화를 주의 깊게 살피며 위험 구역 접근을 스스로 경계함",
          "비상 대피 경로와 소화기 위치 등 현장 안전 시설을 숙지하고 침착히 대응함"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "일반적 위험 인지는 무난, 선각 블록 내부·밀폐구역 투입 전 위험요소 브리핑 권장",
          "눈에 보이는 위험은 회피하나 상하 동시 작업 등 복합 위험은 사전 고지 필요",
          "돌발 상황 대처는 보통 수준으로, 신규 작업장 이동 시 위험 포인트 안내 요망"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "작업 몰두 시 주변 크레인·지게차 이동 인지 지연 소지, 2인 1조 신호수 동행 권장",
          "잠재 위험 식별이 다소 둔감할 수 있어 고소·밀폐 작업 시 사수 동반 배치 필요",
          "비상 상황 시 당황할 수 있으므로 픽토그램 안전 표지 및 비상 신호 반복 숙지"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "[위험인지 과락 🚨] 위험 상황 식별 심각 미흡, 고소·밀폐·단독 작업 투입 절대 금지",
          "[위험인지 과락 🚨] 주변 위험 요소 무감각 및 부주의 우려, 상시 감시자 배치 필수",
          "[위험인지 과락 🚨] 돌발 위험 대처 능력 결여, 저위험 단순 공정 제한 배치 및 재검증"
        ]),
        tag: "과락", tagColor: "bg-red-100 text-red-700 border-red-300", isCrit: true
      };

    case "T1": // 협력태도
      if (score >= 95) return {
        desc: pick([
          "한국인 기장·다국적 동료와 완벽히 호흡하며 팀 공동 작업을 이끄는 협업 핵심",
          "동료의 작업 고충을 먼저 돕고 2인 1조 및 분임조 작업에서 최고의 시너지 발휘",
          "상호 존중과 적극적 지원 태도로 현장 팀 분위기를 밝고 활기차게 주도함"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "팀원 간 능동적 협업 및 지원, 원활한 공동 작업 수행과 상호 존중 태도 탁월",
          "공동 자재 운반·블록 정합 등 협동 공정에서 솔선수범하며 원만하게 융화됨",
          "본인 작업 완료 후 지체된 동료 구간을 자발적으로 지원하는 높은 협동심"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "동료와의 협조 태도 양호, 팀 공동 목표 달성을 위해 성실히 호흡을 맞춤",
          "타 국적 작업자들과도 편견 없이 어울리며 현장 협업 지시를 잘 수행함",
          "분임조 내 역할 분담을 명확히 수용하고 동료와 원활하게 손발을 맞춤"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "팀 단위 공동 작업 무난히 소화, 다국적 동료 간 적극적 의사소통 장려 권장",
          "지시받은 협업 과업은 수행하나 먼저 나서기보다 수동적으로 협조하는 편임",
          "친숙한 동료와는 잘 협력하나 타 공정·타 국적 작업자와는 교류 확대 필요"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "단독 작업 선호 경향이 다소 있어, 2인 1조 협업 시 명확한 역할 구분이 필요함",
          "동료 지원에 다소 소극적일 수 있으므로 공동 목표 의식 고취 및 팀 융화 유도",
          "소통 부족으로 협업 타이밍이 어긋날 수 있어 작업 전 신호 체계 사전 합의 권장"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "[개인주의 주의] 공동 작업 회피 및 협조 미흡, 팀워크 마찰 방지를 위한 관리 필요",
          "[협업부족 경계] 독단적 작업 성향으로 팀 호흡 저해 우려, 명확한 역할 통제 요망",
          "[융화미흡 주의] 동료 간 배려 부족 및 고립 우려, 초기 팀 적응 밀착 모니터링"
        ]),
        tag: "주의", tagColor: "bg-amber-50 text-amber-700 border-amber-200", isCrit: false
      };

    case "T2": // 갈등관리
      if (score >= 95) return {
        desc: pick([
          "언어·문화 차이로 인한 오해를 성숙하게 풀어내며 다국적 팀 내 중재자 역할 수행",
          "작업 방식 이견 발생 시 감정 대립 없이 반장 중재와 타협을 이끄는 포용력",
          "현장 및 기숙사 내 동료 간 사소한 마찰도 원만하게 포용하는 탁월한 친화력"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "의견 대립 시 유연하고 성숙한 조율 능력 발휘, 다문화 동료와의 화합력 탁월",
          "상대방의 입장을 경청하고 양보할 줄 알아 현장 내 대인 관계 마찰이 전무함",
          "거친 현장 분위기 속에서도 예의를 지키며 원만한 팀 인간관계를 유지함"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "현장 마찰 발생 시 원만한 해결 노력, 타인의 의견 경청 및 수용 태도 우수",
          "동료나 상급자와의 이견을 대화로 풀어가며 불필요한 감정 소모를 자제함",
          "다문화 집단 생활에서 규칙을 존중하고 타인을 배려하여 갈등 유발이 적음"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "갈등 시 대립보다 침묵·회피 경향, 오해가 쌓이지 않게 반장의 주기적 소통 권장",
          "평소 관계는 무난하나 작업 간섭 발생 시 공정장이 작업 경계를 명확히 조율할 것",
          "문화적 차이로 인한 서운함을 내색하지 않을 수 있어 정기 고충 면담이 유익함"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "의견 충돌 시 고집을 부리거나 위축될 수 있어, 반장의 즉각적인 중재 개입 필요",
          "직설적 지적에 방어적일 수 있으므로 작업 교정 시 시범 위주의 코칭이 효과적",
          "특정 국적·동료끼리만 뭉치지 않도록 공정 배치 시 인력 조합에 유의할 것"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "[현장마찰 주의] 의견 충돌 시 감정 대립·소통 단절 우려, 반장의 밀착 중재 필수",
          "[대인갈등 경계] 지적 수용성 부족 및 동료 마찰 소지, 온화하고 명확한 지시 요망",
          "[불화요인 주의] 다문화 집단 생활 및 작업장 내 언쟁 우려, 사전 갈등 예방 관리"
        ]),
        tag: "주의", tagColor: "bg-amber-50 text-amber-700 border-amber-200", isCrit: false
      };

    case "E1": // 감정조절
      if (score >= 95) return {
        desc: pick([
          "돌발 공정 지연이나 강한 압박 속에서도 흔들림 없는 평정심과 침착성 유지",
          "거친 현장 어투나 긴박한 상황에서도 감정적 동요 없이 냉철하게 작업 수행",
          "자기 통제력이 매우 뛰어나 충동적 행동이나 안전 실수를 일절 유발하지 않음"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "압박 상황에서도 평정심 유지, 충동적 언행 제어 및 정서적 통제력 탁월",
          "감정 기복이 거의 없어 매일 일관된 작업 품질과 안정적인 안전 태도를 보임",
          "상급자의 엄격한 피드백에도 감정적으로 반응하지 않고 침착하게 수용함"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "작업 중 감정적 동요 적음, 침착하고 안정적인 태도로 현장 업무 진행",
          "스트레스 상황에서도 화를 내거나 당황하지 않고 차분히 본연의 업무에 집중함",
          "정서적 안정감이 양호하여 주변 동료들에게도 편안하고 차분한 인상을 줌"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "일반적 정서 통제력 유지, 혹서·혹한 및 연속 잔업 시 감정적 피로도 배려 요망",
          "평소에는 차분하나 작업 재수정 요구가 반복될 때 사기 저하 방지 격려 권장",
          "보통 수준의 감정 조절력을 지녔으며, 공개 질책보다 1:1 피드백이 효과적임"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "납기 독촉이나 피로 누적 시 다소 예민해질 수 있어 작업 완급 조절 및 휴식 지도",
          "언어 소통 답답함으로 위축되거나 조급해질 수 있으니 천천히 명확하게 지시할 것",
          "감정 기복이 작업 부주의로 이어지지 않도록 일일 조회 시 표정·컨디션 확인 권장"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "[감정조절 주의] 불만·흥분 시 충동적 언행 및 작업 거칠어짐 우려, 온화한 면담 필수",
          "[정서불안 경계] 압박 상황에서 감정 통제 저하 및 부주의 사고 위험, 세심한 관리",
          "[충동성 주의] 급한 성격이나 감정 기복으로 인한 현장 트러블 주의, 멘토 밀착 케어"
        ]),
        tag: "주의", tagColor: "bg-amber-50 text-amber-700 border-amber-200", isCrit: false
      };

    case "E2": // 인내심
      if (score >= 95) return {
        desc: pick([
          "옥외 고강도 육체노동 및 혹서·혹한 환경에서도 지치지 않는 강인한 정신력과 끈기",
          "장시간 반복 용접·그라인딩·도장 작업에서도 끝까지 집중력을 잃지 않는 지구력",
          "높은 회복탄력성으로 타국 생활의 고충과 작업 부하를 거뜬히 이겨내는 강인함"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "작업 부하 및 스트레스에 대한 회복탄력성 우수, 지속적인 직무 지구력 발휘",
          "힘든 선각·블록 공정에서도 중도 포기나 불평 없이 묵묵히 과업을 돌파함",
          "육체적·정신적 스트레스 내성이 강해 장기 근속 및 안정적 현장 정착이 기대됨"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "고강도 현장 환경 적응력 양호, 어려운 작업 여건에서도 포기하지 않고 인내함",
          "조선소 특유의 소음·분진·고열 환경을 잘 감내하며 꾸준한 작업 페이스를 유지함",
          "스트레스를 건전하게 해소하며 타국 근무 환경에서도 흔들림 없이 성실히 근무함"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "표준적 스트레스 감내도 보유, 계절별 기후 변화 및 초과근무 적응 여부 모니터링",
          "일반 공정 부하는 무난히 견디나 고난도 작업 연속 배정 시 적절한 휴식 안배 권장",
          "초기 향수병이나 체력 저하가 오지 않도록 입국 후 1~3개월 차 생활 면담이 유익함"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "장시간 고강도 작업 시 피로 호소 가능성, 단계적으로 작업 강도를 높여갈 것",
          "스트레스 누적 시 의욕이 저하될 수 있어 작은 성취에도 긍정적 격려가 필요함",
          "밀폐·협소 구역 장기 작업 시 답답함을 느낄 수 있으므로 순환 작업 배치를 권장"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "[번아웃 위험] 고강도 환경 부적응 및 조기 이탈 우려, 작업 강도 조절·고충 상담 필수",
          "[지구력 부족] 직무 스트레스 취약 및 중도 포기 위험, 초기 정착 집중 케어 요망",
          "[이탈방지 주의] 육체적·심리적 피로 감내력 저조, 멘토 배정 및 정기 고충 해소 필요"
        ]),
        tag: "주의", tagColor: "bg-amber-50 text-amber-700 border-amber-200", isCrit: false
      };

    case "A1": // 학습능력
      if (score >= 95) return {
        desc: pick([
          "선박 도면·작업표준서 및 신규 장비 조작법을 즉각 흡수하여 응용하는 탁월한 습득력",
          "한국어 현장 용어와 선종별 특수 기법을 빠르게 익혀 단기간 내 숙련공 성장 기대",
          "한 번 교육받은 안전·품질 지침을 완벽히 숙지하여 현장에 즉시 구현하는 영민함"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "신규 공정 및 장비 조작 신속 습득, 작업 지침 이해도와 현장 실행력 탁월",
          "사수의 시범 작업을 주의 깊게 관찰하여 핵심 요령을 빠르게 본인의 것으로 만듦",
          "새로운 블록 구조나 변경된 도면 지시도 막힘없이 이해하고 정확하게 작업함"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "새로운 기술 및 작업 지침 습득 빠름, 현장 작업 노하우 이해 및 응용력 우수",
          "기초 직무 교육 및 OJT 내용을 잘 소화하며 현장 용어 습득 속도가 양호함",
          "모르는 부분은 적극적으로 질문하여 배우려는 학습 열의와 직무 수용성이 좋음"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "기본 기능 습득 양호, 현대삼호 특화 공정 투입 시 1~2회 시범 시연 후 작업 권장",
          "일상적 작업 지시는 무난히 이해하나 복잡한 도면·치수 작업은 재확인 절차 필요",
          "실기 위주 반복 숙달 시 안정적 성과가 기대되며 시청각 매뉴얼 병행이 효과적임"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "구두 설명만으로는 지시 오해 소지가 있어, 샘플 시연 및 모국어 작업표준서 활용 권장",
          "신규 공법 습득에 다소 시간이 걸리므로 초기에는 정형화된 단일 공정 배치가 유리함",
          "이해하지 못해도 '알겠다'고 답할 수 있어 작업 착수 초기 10분간 수행 상태 확인 필수"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "[학습지체 주의] 작업 지시 이해 지연 및 오작업 우려, 시각 매뉴얼·시범 교육 필수",
          "[숙달지연 경계] 신규 장비·도면 해독 미흡 가능성, 단순 공정 배치 및 반복 OJT 요망",
          "[소통오류 주의] 지시 내용 임의 해석 위험, 작업 전후 사수의 1:1 확인 점검 필수"
        ]),
        tag: "주의", tagColor: "bg-amber-50 text-amber-700 border-amber-200", isCrit: false
      };

    case "A2": // 조직적응
      if (score >= 95) return {
        desc: pick([
          "한국 조선소 위계질서와 현장 문화를 빠르게 체득하고 반장·동료와 두터운 신뢰 구축",
          "기숙사 공동생활 및 사내 식당·통근버스 등 한국 생활 환경에 완벽히 융화되는 친화력",
          "높은 타문화 수용성과 긍정적 마인드로 신입 외국인 근로자들의 현장 정착 롤모델이 됨"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 90) return {
        desc: pick([
          "조선소 현장 규율 및 조직 문화 빠른 체득, 관리자와의 신뢰 관계 구축 탁월",
          "한국식 작업 지시 문화와 팀 분위기를 존중하며 이질감 없이 현장에 빠르게 녹아듦",
          "생활 환경 변화에 대한 적응력이 뛰어나 초기 이탈 위험 없이 안정적 정착 기대"
        ]),
        tag: "최우수", tagColor: "bg-indigo-50 text-indigo-700 border-indigo-200", isCrit: false
      };
      if (score >= 80) return {
        desc: pick([
          "회사 방침 및 현장 환경 적극 적응, 한국인 관리자 및 조직 내 융화력 우수",
          "기숙사 규율과 현장 예절을 잘 지키며 한국 생활 및 음식·기후에 무난히 적응함",
          "소속감과 직장 애착심이 양호하여 성실하게 장기 근속할 가능성이 높은 인력"
        ]),
        tag: "우수", tagColor: "bg-blue-50 text-blue-700 border-blue-200", isCrit: false
      };
      if (score >= 70) return {
        desc: pick([
          "현장 생활 적응 양호, 초기 한국어 소통 지원 및 동일 국적 선배 멘토링 연결 권장",
          "기본 조직 순응도는 무난하나 낯선 환경 긴장 해소를 위해 반장의 따뜻한 관심 필요",
          "작업장 적응은 양호하며 기숙사 생활이나 식습관 등 초기 정착 애로사항만 점검 요망"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      if (score >= 60) return {
        desc: pick([
          "한국 조선소 특유의 빠른 작업 템포에 긴장할 수 있어 초기 4주간 온보딩 배려 필요",
          "언어 장벽으로 인해 소외감을 느끼지 않도록 현장 픽토그램 및 통역 앱 활용 권장",
          "문화적 차이로 인한 오해 방지를 위해 한국 현장 예절과 안전 문화를 친절히 안내할 것"
        ]),
        tag: "보통", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false
      };
      return {
        desc: pick([
          "[조직부적응 주의] 집단 생활 및 한국 조선소 환경 부적응 우려, 전담 멘토 배정 필수",
          "[초기이탈 경계] 문화·언어 장벽으로 인한 고립 위험, 입국 초기 밀착 상담 및 케어",
          "[현장융화 주의] 조직 규율 및 위계 적응 지연 소지, 동일 국적 우수 선배와 페어링 필수"
        ]),
        tag: "주의", tagColor: "bg-amber-50 text-amber-700 border-amber-200", isCrit: false
      };

    default:
      return { desc: "현장 작업 수행 양호", tag: "양호", tagColor: "bg-slate-100 text-slate-700 border-slate-200", isCrit: false };
  }
}

export function getValidityScaleDetails(d: any) {
  const diag = d.diagnosis || {};
  const ans = d.answers || {};
  const isFast = Boolean(d.isTooFast || diag.isTimeCut);

  const kCntVal = diag.kCnt !== undefined ? diag.kCnt : Object.values(ans).filter((v) => v === 3).length;
  const honestOnes = [85, 86, 87, 88, 93, 94].filter((i) => ans[i] === 1).length;
  const fCntVal = diag.fCnt !== undefined ? diag.fCnt : Object.values(ans).filter((v) => v === 1 || v === 5).length - honestOnes;

  const v1IsWarn = (diag.inconsistentCnt || 0) >= 3 || (diag.contradictCnt || 0) >= 5;
  const v2IsWarn = (diag.l1 || 0) >= 3 || (diag.l2 || 0) >= 1;
  const v3IsWarn = kCntVal >= 65 || fCntVal >= 75;
  const v4IsWarn = (diag.maxC || 0) >= 15 || isFast;

  return [
    {
      code: "V1",
      name: "일관성 척도",
      status: v1IsWarn ? "주의" : "정상",
      statusColor: v1IsWarn ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-700 bg-emerald-50 border-emerald-200",
      desc: v1IsWarn ? "모순 응답 감지" : "답변 논리 일관",
    },
    {
      code: "V2",
      name: "사회적 바람직성",
      status: v2IsWarn ? "주의" : "정상",
      statusColor: v2IsWarn ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-700 bg-emerald-50 border-emerald-200",
      desc: v2IsWarn ? "과도한 자기포장" : "솔직한 자기표현",
    },
    {
      code: "V3",
      name: "응답 편향도",
      status: v3IsWarn ? "주의" : "정상",
      statusColor: v3IsWarn ? "text-amber-600 bg-amber-50 border-amber-200" : "text-emerald-700 bg-emerald-50 border-emerald-200",
      desc: v3IsWarn ? "극단/중립 쏠림" : "고른 척도 분포",
    },
    {
      code: "V4",
      name: "응답 성실도",
      status: v4IsWarn ? "위험" : "정상",
      statusColor: v4IsWarn ? "text-red-700 bg-red-50 border-red-200" : "text-emerald-700 bg-emerald-50 border-emerald-200",
      desc: v4IsWarn ? "줄세우기/속도과속" : "성실 숙독 완료",
    },
  ];
}
