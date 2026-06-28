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
  const c1Phrases = [
    "일부 역량에서 뚜렷한 약점이나 신뢰도 이슈가 감지되어, 현장 배치 시 주의 깊은 검토와 멘토링이 요구됩니다.",
    "전반적인 역량 점수가 평균을 밑돌고 있으며, 특히 특정 지표에서의 취약점이 두드러져 집중적인 관리 및 지도가 필수적입니다.",
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
    } else if (weakScore < 50) {
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
  let msg = "";
  let isLow = false;
  const seed = (d.total || 0) + (d.id ? d.id.charCodeAt(0) : 0);

  if (d.reliability.includes("V1")) {
    const p = [
      "응답의 일관성이 매우 높고, 자신을 투명하게 드러냈습니다. <strong class='text-blue-700'>결과의 신뢰도가 매우 높습니다.</strong>",
      "문항 전반에 걸쳐 솔직하고 일관성 있는 답변 패턴을 보였습니다. <strong class='text-blue-700'>본 검사 결과를 전적으로 신뢰하고 판단 근거로 활용하기에 충분합니다.</strong>",
      "자기 포장 없이 매우 객관적인 태도로 검사에 임하였습니다. <strong class='text-blue-700'>응답 내용의 신빙성이 아주 우수합니다.</strong>"
    ];
    msg = p[seed % p.length];
  } else if (d.reliability.includes("V2")) {
    const p = [
      "전반적으로 일관된 응답을 보였으며, <strong class='text-blue-600'>결과 해석에 무리가 없는 양호한 수준</strong>입니다.",
      "응답 과정에서 특별한 왜곡이나 모순이 발견되지 않았습니다. <strong class='text-blue-600'>결과를 있는 그대로 수용하고 참고할 수 있습니다.</strong>",
      "대부분의 문항에서 정상적인 응답 성향이 관찰되어, <strong class='text-blue-600'>분석 결과의 타당성이 입증되는 보통 이상의 신뢰도를 보입니다.</strong>"
    ];
    msg = p[seed % p.length];
  } else if (d.reliability.includes("V3")) {
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
