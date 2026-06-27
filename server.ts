import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import { QUESTIONS_FULL, MGMT_GUIDE } from "./src/questions";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Google Sheets Web App URL (Hardcoded in legacy code as fallback)
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzW9pXFz9Z1ZoR7fBFXSyWvhN8w1rjr5KHwbK9PAShO6RgFHreAaXWWcthMvf9M26xu/exec";

// 1. Google Sheets Proxy Endpoints (CORS Bypass)
app.post("/api/sheets-proxy", async (req, res) => {
  try {
    const payload = req.body;
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify(payload),
    });

    // Handle standard Google Apps Script redirects or empty responses
    if (response.status === 302 || response.status === 301) {
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        const redirectedResponse = await fetch(redirectUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
          },
          body: JSON.stringify(payload),
        });
        const text = await redirectedResponse.text();
        return res.status(redirectedResponse.status).send(text);
      }
    }

    const text = await response.text();
    res.status(response.status).send(text);
  } catch (error: any) {
    console.error("Sheets Proxy POST Error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

app.get("/api/sheets-proxy", async (req, res) => {
  try {
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "GET",
    });

    if (response.status === 302 || response.status === 301) {
      const redirectUrl = response.headers.get("location");
      if (redirectUrl) {
        const redirectedResponse = await fetch(redirectUrl);
        const text = await redirectedResponse.text();
        return res.status(redirectedResponse.status).send(text);
      }
    }

    const text = await response.text();
    res.status(response.status).send(text);
  } catch (error: any) {
    console.error("Sheets Proxy GET Error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// 2. Gemini AI Deep Analysis Report Generation with Robust Retry Logic
async function generateContentWithRetry(ai: any, params: any, retries = 3, delay = 1500): Promise<any> {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const errorStr = String(error.message || error);
    const isTransient = error.status === 503 || 
                        error.status === 429 || 
                        errorStr.includes("503") || 
                        errorStr.includes("429") || 
                        errorStr.includes("temporary") || 
                        errorStr.includes("high demand") || 
                        errorStr.includes("UNAVAILABLE") ||
                        errorStr.includes("overloaded");
    
    if (retries > 0 && isTransient) {
      console.warn(`[Gemini API Warning] Transient error occurred: ${errorStr}. Retrying in ${delay}ms... (Remaining retries: ${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return generateContentWithRetry(ai, params, retries - 1, delay * 2);
    }
    throw error;
  }
}

app.post("/api/generate-ai-report", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: true,
        message: "Gemini API Key is not configured on the server side. Please set GEMINI_API_KEY.",
      });
    }

    const { name, id, company, total, decision, reliability, details, answers } = req.body;

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    let sRes = "";
    if (answers) {
      const items: string[] = [];
      // Pass details of certain extreme answers to help AI build precise profile
      Object.entries(answers).forEach(([qid, v]) => {
        if (v === 1 || v === 5) {
          const qText = QUESTIONS_FULL.find((q) => q.id === Number(qid))?.kr || "알 수 없는 문항";
          items.push(`- [문항 ${qid}] "${qText}": ${v}점`);
        }
      });
      if (items.length > 0) {
        sRes = "\n[주요 응답 패턴 (1점/5점 극단적 문항)]\n" + items.slice(0, 15).join("\n");
      }
    }

    const prompt = `당신은 HD현대삼호의 외국인 인력(E-7-3 용접, 도장, 전기 등) 전담 채용 전문가이자, 현장 생산 관리자(반장/직장)를 밀착 지원하는 인사 컨설턴트입니다.
제공된 후보자의 인성검사 12개 하위 역량 데이터와 1점/5점 극단적 응답 패턴을 종합적으로 분석하여, 실제 조선업 현장에 즉시 적용할 수 있는 '생산 현장 맞춤형 심층 분석 보고서'를 작성하십시오.

[특별 지시: 전문성과 가독성의 조화]
보고서의 전문적인 무게감을 유지하기 위해 깊이 있는 분석은 '격식 있는 줄글(서술형)'로 작성하고, 관리자가 즉각적으로 확인해야 할 요약 지침이나 액션 플랜은 '개조식(글머리 기호)'을 혼합하여 전문성과 가독성을 모두 확보하십시오.
불필요한 외국어(영어) 표현을 배제하고 현장 작업자가 이해하기 쉬운 우리말 위주로 작성하십시오.
중요한 핵심 단어나 수치는 **굵은 글씨** 처리하여 가독성을 높이십시오.

[출력 지침 - 매우 중요!!!]
- "HD현대삼호의 현장 생산 경쟁력을 책임지는...", "노고에 감사드립니다", "보고서를 제출합니다"와 같은 인사말, 서론, 안내 문구를 **절대** 쓰지 마십시오. 
- 답변의 첫 글자는 반드시 \`> **[종합 판정 요약]**\` 기호로 곧바로 시작해야 합니다. 어떠한 미사여구도 덧붙이지 마십시오.
- 아래 지정된 [보고서 양식] 구조를 완벽하게 준수하십시오.
- 어조는 객관적이고 전문적인 보고서 톤(~함, ~임, ~요망됨, ~판단됨)을 철저히 유지하십시오.

[보고서 양식]

> **[종합 판정 요약]**
(후보자의 전반적 성향, 현장 적합도, 잠재적 리스크를 종합하여 4~5문장의 전문적이고 짜임새 있는 줄글로 깊이 있게 서술)

### 🎯 생산 관리자 핵심 브리핑
(현장에서 이 직원을 다룰 때 명심해야 할 3가지 핵심 지침. 지침 제목은 개조식으로, 부연 설명은 1~2문장의 간결한 줄글로 작성)
* **[지침 1 제목]**: (구체적 상황과 이유를 포함한 설명)
* **[지침 2 제목]**: (구체적 상황과 이유를 포함한 설명)
* **[지침 3 제목]**: (구체적 상황과 이유를 포함한 설명)

### 📊 현장 밀착형 다면 평가
(각 지표마다 조선소 현장에 맞는 구체적인 상황을 가정하여, 2~3문장의 전문적인 줄글로 심도 있게 분석)

| 평가 지표 | 강점 (현장 관점) | 보완점 (현장 관점) |
|:---|:---|:---|
| **작업 지시 이행 및 성실도 (C1/C2/R1)** | (관련 강점을 줄글로 상세히 서술) | (관련 약점을 줄글로 상세히 서술) |
| **현장 안전 민감도 (S1/S2)** | (보호구 착용 습관, 위험 인지 및 사고 예방 성향 등) | ... |
| **팀워크 및 현장 융화력 (T1/T2/A2)** | (한국인 관리자 및 타 국적 동료들과의 화합 능력을 입체적으로 분석) | ... |
| **스트레스 내성 및 위기 대처 (E1/E2/A1)** | (고강도 육체 노동, 납기 압박 시의 감정 통제력 등) | ... |

### ⚠️ 잠재 리스크 및 발현 조건
(특정 위험 상황을 눈에 띄게 정리하되, 상황 묘사는 구체적인 줄글로 작성. 항목 구분이 필요하면 '<br>' 태그 사용)

| 리스크 명칭 | 발현 조건 | 선제적 대처법 |
|:---|:---|:---|
| **(리스크 1: 명칭)** | (어떤 특정 현장 상황에서 갈등이나 사고로 이어지는지 2문장 내외의 줄글로 상세 묘사) | (관리자의 즉각적이고 구체적인 대응 방안) |
| **(리스크 2: 명칭)** | ... | ... |

### 🛠️ 맞춤형 현장 배치 및 실행 계획
(아래 5가지 관리 지표에 대해 '생산 관리자 관점의 실행 지침'을 개조식 명사형 종결로 간결하게 작성하십시오. 줄바꿈이 필요한 경우 반드시 '<br>' 태그를 사용하십시오)

| 관리 지표 | 생산 관리자 관점의 실행 지침 |
|:---|:---|
| **최적 직무/배치** | - (조건 1)<br>- (조건 2) |
| **효과적 소통/지시** | - (소통법 1)<br>- (소통법 2) |
| **리스크 통제 방안** | - (체크리스트 1)<br>- (체크리스트 2) |
| **동기부여 및 근태** | - (보상/동기부여 방식 1)<br>- (근태 관리법) |
| **추천 멘토(사수)** | - (최적의 사수 성향)<br>- (매칭 이유) |
| **장기 육성 방향** | - (6개월 뒤 기대 역할)<br>- (1년 뒤 잠재력) |

후보자 정보: 이름: ${name}, 수험번호: ${id}, 업체명: ${company}, 종합점수: ${total}점, 종합등급: ${decision}, 응답 신뢰도 판별: ${reliability}.
세부역량: 근태/시간(C1):${details?.C1}, 책임감(C2):${details?.C2}, 규정준수(R1):${details?.R1}, 정직성(R2):${details?.R2}, 협력태도(T1):${details?.T1}, 갈등관리(T2):${details?.T2}, 감정조절(E1):${details?.E1}, 인내심(E2):${details?.E2}, 안전수칙(S1):${details?.S1}, 위험인지(S2):${details?.S2}, 학습능력(A1):${details?.A1}, 조직적응(A2):${details?.A2}.
${sRes}

반드시 가독성 높은 마크다운 형식으로 응답해 주십시오.`;

    const aiResponse = await generateContentWithRetry(ai, {
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({ success: true, text: aiResponse.text });
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// 3. Vite Middleware integration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
