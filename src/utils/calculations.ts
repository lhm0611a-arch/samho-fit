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
  diagnosis?: {
    l1: number;
    l2: number;
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

export function parseDateStrict(v: any): Date {
  if (!v) return new Date();
  let s = String(v).trim();
  let m = s.match(/^(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
  if (m) return new Date(parseInt(m[3]), parseInt(m[1]) - 1, parseInt(m[2]));
  if (/^\d{5}(\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    const excelEpoch = new Date(1899, 11, 30);
    excelEpoch.setDate(excelEpoch.getDate() + Math.floor(serial));
    return excelEpoch;
  }
  let d = new Date(s);
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
    }
  });

  const sub: Record<string, number> = {};
  Object.keys(c).forEach((k) => {
    sub[k] = c[k] > 0 ? Math.round(s[k] / c[k]) : 0;
  });

  const main: Record<string, number> = {
    C: Math.round(((sub.C1 || 0) + (sub.C2 || 0)) / 2),
    R: Math.round(((sub.R1 || 0) + (sub.R2 || 0)) / 2),
    S: Math.round(((sub.S1 || 0) + (sub.S2 || 0)) / 2),
    T: Math.round(((sub.T1 || 0) + (sub.T2 || 0)) / 2),
    E: Math.round(((sub.E1 || 0) + (sub.E2 || 0)) / 2),
    A: Math.round(((sub.A1 || 0) + (sub.A2 || 0)) / 2),
  };

  // [수정된 부분] 6대 역량을 모두 포함하되, 조선업 현장 특성에 맞춘 가중치 적용 (총합 6.0)
  const total = Math.round((main.C * 1.0 + main.R * 1.0 + main.S * 1.5 + main.T * 0.9 + main.E * 0.8 + main.A * 0.8) / 6);
  
  const crit = [sub.C1 || 0, sub.C2 || 0, sub.R1 || 0, sub.R2 || 0, sub.S1 || 0, sub.S2 || 0];
  const sFail = (sub.S1 || 0) < 60 || (sub.S2 || 0) < 60;
  const failCnt = crit.filter((v) => v < 60).length;
  const isCritFail = sFail || failCnt >= 2;

  let rG = "V1";
  const l1 = [85, 86, 87, 88].filter((i) => map[i] >= 4).length;
  const l2 = [93, 94].filter((i) => map[i] === 5).length;
  const kCnt = Object.values(map).filter((v) => v === 3).length;
  const fCnt = Object.values(map).filter((v) => v === 1 || v === 5).length;

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
  if (kCnt >= 65) rG = "V3";
  if (fCnt >= 75) rG = "V3";
  if (l1 === 4) rG = "V3";
  if (l2 === 2) rG = "V3";
  if (maxC >= 15) rG = "V3";
  if (maxC >= 30) rG = "V4";
  if (maxC >= 90) rG = "V5";

  let dec = "B1";
  if (rG === "V4" || rG === "V5") {
    dec = "D";
  } else if (rG === "V3") {
    if (total >= 85 && !isCritFail) dec = "B1";
    else dec = "C";
  } else if (isCritFail) {
    dec = "C";
  } else if (total >= 91 && (rG === "V1" || rG === "V2") && main.R >= 88 && main.S >= 88 && !isCritFail) {
    dec = "S";
  } else if (total >= 81 && (rG === "V1" || rG === "V2")) {
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
    diagnosis: { l1, l2, maxC, sFail, failCnt },
  };
}

export function generateReportComment(d: any): string {
  const scores = d.details || {};
  const diag = d.diagnosis || {};
  const comments: string[] = [];
  
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

  let mainDesc = "";
  if (baseCode === "S") mainDesc = "조직 적응력과 직무 수행 역량이 매우 탁월한 최상위 인재군입니다.";
  else if (baseCode === "A") mainDesc = "대부분의 역량이 우수하며, 조직 생활에 긍정적인 영향을 미칠 것으로 기대됩니다.";
  else if (baseCode === "B1") mainDesc = "직무 수행에 필요한 기본적인 소양을 갖추고 있어, 현장 적응에 큰 무리가 없을 것으로 판단됩니다.";
  else if (baseCode === "B2") mainDesc = "직무 역량이 다소 평이하거나 소극적인 태도가 엿보여, 입사 후 지속적인 동기 부여와 관리가 필요합니다.";
  else if (baseCode === "C1") mainDesc = "일부 역량에서 뚜렷한 약점이나 신뢰도 이슈가 감지되어, 현장 배치 시 주의 깊은 검토와 멘토링이 요구됩니다.";
  else if (baseCode === "C2") mainDesc = "역량 점수가 현저히 낮아 현장 투입 시 부적응 및 안전 사고 발생 위험이 큽니다. 강도 높은 사전 교육이나 채용 재고가 필요합니다.";
  else if (baseCode === "D") mainDesc = "조직 부적응 위험이 매우 높거나 불성실한 응답 태도가 확연하여, 현장 투입이 심각하게 우려되는 인력입니다.";
  
  comments.push(mainDesc);

  // Tie-breaker priority: Safety > Attendance > Teamwork > Regulation > Adaptation > Emotion
  const priority = { S: 6, C: 5, T: 4, R: 3, A: 2, E: 1 };
  const getPri = (k: string) => priority[k.charAt(0) as keyof typeof priority] || 0;

  const sortedKeys = Object.keys(scores).sort((a, b) => {
    if (scores[b] !== scores[a]) return scores[b] - scores[a];
    return getPri(b) - getPri(a);
  });
  
  const topKey = sortedKeys[0];
  const topScore = scores[topKey];
  
  // For weakness, if scores are equal, we also want the most critical one to surface.
  // Wait, if sorting ascending for weakness, we want lower score first. If equal score, higher priority surfaces first.
  const weakSortedKeys = Object.keys(scores).sort((a, b) => {
    if (scores[a] !== scores[b]) return scores[a] - scores[b];
    return getPri(b) - getPri(a); // higher priority (like S) comes first if scores are equal
  });
  
  const weakKey = weakSortedKeys[0];
  const weakScore = scores[weakKey];

  const getStrength = (k: string) => {
    if (k.startsWith("S")) return "안전 수칙 준수 의지";
    if (k.startsWith("C")) return "근태 및 책임감";
    if (k.startsWith("R")) return "규정 준수와 정직성";
    if (k.startsWith("T")) return "동료와의 협력적 태도";
    if (k.startsWith("E")) return "감정 조절 및 스트레스 내성";
    if (k.startsWith("A")) return "새로운 업무 및 환경 적응력";
    return "기본 역량";
  };

  let detailDesc = "";
  if (["S", "A", "B1"].includes(baseCode)) {
    if (topScore >= 80) {
      detailDesc += `특히 <strong>${getStrength(topKey)}</strong>이(가) 두드러지게 우수하여, 현장에서 긍정적인 역할을 할 것으로 보입니다. `;
    }
    
    if (diag.sFail) {
      detailDesc += `<br><br>🚨 <strong class='text-red-600'>[안전 경고]</strong> 다만, 안전 관련 역량 점수가 기준치 미달입니다. 현장 투입 전 철저한 안전 교육이 반드시 선행되어야 합니다.`;
    } else if (weakScore < 60) {
      detailDesc += `다만, 상대적으로 <strong>${getStrength(weakKey)}</strong> 측면은 보완이 필요할 수 있으므로, 관리자의 세심한 지도가 권장됩니다.`;
    }
  } else if (["B2", "C1"].includes(baseCode)) {
    if (diag.sFail) {
      detailDesc += `<br><br>🚨 <strong class='text-red-600'>[안전 경고]</strong> 무엇보다 안전 관련 역량 점수가 낮아 위험 요인이 존재합니다. 투입 전 확실한 안전 확보 조치가 필요합니다. `;
    } else if (weakScore < 50) {
      detailDesc += `특히 <strong>${getStrength(weakKey)}</strong> 측면에서 상당한 취약점이 드러나, 이로 인한 현장 마찰이나 업무 지연이 우려됩니다. `;
    }
    
    if (topScore >= 80) {
      detailDesc += `비록 <strong>${getStrength(topKey)}</strong>에서는 긍정적인 면모를 보이나, 전반적인 약점 보완 관리가 우선되어야 합니다.`;
    }
  } else {
    if (diag.sFail) {
      detailDesc += `<br><br>🚨 <strong class='text-red-600'>[치명적 위험]</strong> 현장 안전수칙에 대한 기본 인식이 심각하게 결여되어 있어, 대형 사고 유발 가능성이 큽니다. `;
    }
    detailDesc += `전반적인 직무 역량 미달과 함께 <strong>${getStrength(weakKey)}</strong> 부족이 겹쳐, 원활한 직무 수행을 기대하기 어렵습니다.`;
  }
  
  if (detailDesc) {
    comments.push(detailDesc);
  }

  return comments.join(" ");
}

export function generateReliabilityComment(d: any): string {
  const diag = d.diagnosis || {};
  let msg = "";
  let isLow = false;

  if (d.reliability.includes("V1")) {
    msg = "응답의 일관성이 매우 높고, 자신을 투명하게 드러냈습니다. <strong class='text-blue-700'>결과의 신뢰도가 매우 높습니다.</strong>";
  } else if (d.reliability.includes("V2")) {
    msg = "전반적으로 일관된 응답을 보였으며, <strong class='text-blue-600'>결과 해석에 무리가 없는 양호한 수준</strong>입니다.";
  } else if (d.reliability.includes("V3")) {
    msg = "일부 응답에서 신뢰도를 저해할 수 있는 요인이 감지되었습니다. <strong class='text-amber-600'>결과 해석 시 일정 부분 주의가 필요</strong>합니다.";
    isLow = true;
  } else {
    msg = "응답의 일관성이 크게 결여되거나 극단적인 응답 패턴을 보여 <strong class='text-red-600'>본 결과를 객관적인 채용 근거로 전적으로 신뢰하기 어렵습니다.</strong>";
    isLow = true;
  }

  if (isLow) {
    const reasons: string[] = [];
    if (diag.l1 >= 3 || diag.l2 >= 1) reasons.push("자신을 지나치게 긍정적으로 포장(사회적 바람직성 편향)");
    if (diag.maxC >= 15) reasons.push("동일한 번호 연속 선택(불성실/찍기 응답)");
    if (d.isTooFast || diag.isTimeCut) reasons.push("비정상적으로 빠른 응답 속도(문항 미숙지/임의 응답)");
    
    if (reasons.length > 0) {
      msg += `<br><br>📌 <strong>주요 의심 사유: ${reasons.join(", ")}</strong><br><span class='text-[0.8rem] text-red-500 font-bold'>※ 면접 시 지원자의 실제 성향 및 태도에 대한 진위 여부를 반드시 재확인하시기 바랍니다.</span>`;
    }
  }
  return msg;
}
