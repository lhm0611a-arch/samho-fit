import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { initializeApp as initFirebaseApp } from "firebase/app";
import { getFirestore as initFirestore, collection, getDocs, addDoc, doc, deleteDoc, updateDoc, query, where } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";
import { QUESTIONS_FULL, MGMT_GUIDE } from "./src/questions";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Server-side Firebase Firestore instance
let serverFirestoreDb: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const serverApp = initFirebaseApp(config, "serverAdminApp");
    serverFirestoreDb = initFirestore(serverApp, config.firestoreDatabaseId || "ai-studio-hdhyundaisamhoe7-96fa749c-627d-4eb8-9077-f1dccc79da5c");
    console.log("Server Firestore instance connected successfully");
  }
} catch (e) {
  console.warn("Failed to init server Firestore instance:", e);
}

// 0. Firestore Server Endpoints (100% Reliable, zero client-side blocker)
app.get("/api/firestore-data", async (req, res) => {
  try {
    if (!serverFirestoreDb) {
      return res.json([]);
    }
    const snap = await getDocs(collection(serverFirestoreDb, "assessments"));
    const list: any[] = [];
    snap.forEach((d) => {
      list.push({ docId: d.id, ...d.data() });
    });
    res.json(list);
  } catch (error: any) {
    console.error("Firestore GET Error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

app.post("/api/firestore-data", async (req, res) => {
  try {
    if (!serverFirestoreDb) {
      return res.status(500).json({ error: true, message: "Firestore not initialized" });
    }
    const payload = req.body;
    const docRef = await addDoc(collection(serverFirestoreDb, "assessments"), {
      ...payload,
      timestamp: new Date().toISOString()
    });
    res.json({ success: true, docId: docRef.id });
  } catch (error: any) {
    console.error("Firestore POST Error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

app.put("/api/firestore-data/:id", async (req, res) => {
  try {
    if (!serverFirestoreDb) {
      return res.status(500).json({ error: true, message: "Firestore not initialized" });
    }
    const docId = req.params.id;
    const updates = req.body;
    await updateDoc(doc(serverFirestoreDb, "assessments", docId), updates);
    res.json({ success: true, docId });
  } catch (error: any) {
    console.error("Firestore PUT Error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// Update by candidate ID or custom query
app.post("/api/firestore-data/update-by-query", async (req, res) => {
  try {
    if (!serverFirestoreDb) {
      return res.status(500).json({ error: true, message: "Firestore not initialized" });
    }
    const { candidateId, updates } = req.body;
    if (!candidateId || !updates) {
      return res.status(400).json({ error: true, message: "candidateId and updates required" });
    }
    const q = query(collection(serverFirestoreDb, "assessments"), where("id", "==", candidateId));
    const snapshot = await getDocs(q);
    const updatedIds: string[] = [];
    for (const docItem of snapshot.docs) {
      await updateDoc(doc(serverFirestoreDb, "assessments", docItem.id), updates);
      updatedIds.push(docItem.id);
    }
    res.json({ success: true, updatedCount: updatedIds.length, updatedIds });
  } catch (error: any) {
    console.error("Firestore Query Update Error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

app.delete("/api/firestore-data/:id", async (req, res) => {
  try {
    if (!serverFirestoreDb) {
      return res.status(500).json({ error: true, message: "Firestore not initialized" });
    }
    const docId = req.params.id;
    await deleteDoc(doc(serverFirestoreDb, "assessments", docId));
    res.json({ success: true });
  } catch (error: any) {
    console.error("Firestore DELETE Error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// --- 24-Hour QR Access Token Management Endpoints ---
interface QRTokenItem {
  docId?: string;
  token: string;
  code: string;
  title: string;
  company?: string;
  examDate?: string;
  createdAt: string;
  expiresAt: string;
  createdTimestamp: number;
  expiresTimestamp: number;
  isActive: boolean;
  usedCount: number;
}

const QR_STORAGE_FILE = path.join(process.cwd(), "qr_tokens_cache.json");
let localQrTokens: QRTokenItem[] = [];
try {
  if (fs.existsSync(QR_STORAGE_FILE)) {
    localQrTokens = JSON.parse(fs.readFileSync(QR_STORAGE_FILE, "utf-8"));
  }
} catch (e) {
  localQrTokens = [];
}

const saveLocalQrTokens = () => {
  try {
    fs.writeFileSync(QR_STORAGE_FILE, JSON.stringify(localQrTokens, null, 2), "utf-8");
  } catch (e) {
    console.warn("Failed to write local QR storage:", e);
  }
};

function generateQrTokenData(title?: string, company?: string, examDate?: string): QRTokenItem {
  const now = Date.now();
  const expiresTimestamp = now + 24 * 60 * 60 * 1000; // Exact 24 Hours
  const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit access code fallback
  const token = `HD-QR-${new Date(now).toISOString().slice(0,10).replace(/-/g,"")}-${randomSuffix}`;
  const targetCompany = company?.trim() || "HD현대삼호 협력사";
  const targetDate = examDate?.trim() || new Date(now).toISOString().slice(0, 10);

  return {
    token,
    code,
    title: title || `${targetCompany} E-7 인성검사 (${targetDate})`,
    company: targetCompany,
    examDate: targetDate,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(expiresTimestamp).toISOString(),
    createdTimestamp: now,
    expiresTimestamp: expiresTimestamp,
    isActive: true,
    usedCount: 0
  };
}

// 1. Get currently active QR token or create one if none exists
app.get("/api/qr-tokens/active", async (req, res) => {
  try {
    const now = Date.now();
    let activeToken: any = null;

    // A. Check from Firestore
    if (serverFirestoreDb) {
      try {
        const snap = await getDocs(collection(serverFirestoreDb, "qr_tokens"));
        const list: any[] = [];
        snap.forEach((d) => {
          list.push({ docId: d.id, ...d.data() });
        });
        
        // Find valid active tokens sorted by createdAt desc
        const validTokens = list
          .filter((t) => t.isActive !== false && t.expiresTimestamp > now)
          .sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));

        if (validTokens.length > 0) {
          activeToken = validTokens[0];
        }
      } catch (err) {
        console.warn("Firestore active QR fetch warning:", err);
      }
    }

    // B. Check from Local Cache if not found in Firestore
    if (!activeToken) {
      const validLocal = localQrTokens
        .filter((t) => t.isActive !== false && t.expiresTimestamp > now)
        .sort((a, b) => b.createdTimestamp - a.createdTimestamp);
      if (validLocal.length > 0) {
        activeToken = validLocal[0];
      }
    }

    // C. If no active token exists at all, automatically issue a new initial 24h token
    if (!activeToken) {
      activeToken = generateQrTokenData();
      localQrTokens.unshift(activeToken);
      saveLocalQrTokens();

      if (serverFirestoreDb) {
        try {
          const docRef = await addDoc(collection(serverFirestoreDb, "qr_tokens"), activeToken);
          activeToken.docId = docRef.id;
        } catch (e) {
          console.warn("Failed to auto-persist initial QR token:", e);
        }
      }
    }

    const remainingMs = Math.max(0, activeToken.expiresTimestamp - now);
    res.json({
      success: true,
      token: activeToken,
      remainingMs,
      remainingHours: (remainingMs / (1000 * 60 * 60)).toFixed(1),
      isExpired: remainingMs <= 0
    });
  } catch (error: any) {
    console.error("Active QR error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// 2. Generate a new 24-hour QR token (Admin Triggered with company and examDate)
app.post("/api/qr-tokens/generate", async (req, res) => {
  try {
    const { title, company, examDate } = req.body || {};
    const newToken = generateQrTokenData(title, company, examDate);

    // Save to local cache
    localQrTokens.unshift(newToken);
    saveLocalQrTokens();

    // Save to Firestore
    if (serverFirestoreDb) {
      try {
        const docRef = await addDoc(collection(serverFirestoreDb, "qr_tokens"), newToken);
        newToken.docId = docRef.id;
      } catch (e) {
        console.warn("Failed to save QR token to Firestore:", e);
      }
    }

    res.json({
      success: true,
      token: newToken,
      remainingMs: 24 * 60 * 60 * 1000,
      message: "새로운 24시간 인성검사 QR 코드가 발급되었습니다."
    });
  } catch (error: any) {
    console.error("Generate QR error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// 3. Verify a QR token or 6-digit access code (Used by candidate entrance)
app.post("/api/qr-tokens/verify", async (req, res) => {
  try {
    const { token, code } = req.body || {};
    const queryVal = (token || code || "").trim();
    if (!queryVal) {
      return res.status(400).json({
        valid: false,
        reason: "EMPTY",
        message: "QR 코드 접속 정보가 필요합니다."
      });
    }

    const now = Date.now();
    let foundToken: any = null;

    // Look up in Firestore first
    if (serverFirestoreDb) {
      try {
        const snap = await getDocs(collection(serverFirestoreDb, "qr_tokens"));
        snap.forEach((d) => {
          const data = d.data();
          if (data.token === queryVal || data.code === queryVal) {
            foundToken = { docId: d.id, ...data };
          }
        });
      } catch (e) {
        console.warn("Firestore verify query error:", e);
      }
    }

    // Look up in local cache
    if (!foundToken) {
      foundToken = localQrTokens.find((t) => t.token === queryVal || t.code === queryVal);
    }

    if (!foundToken && queryVal.startsWith("HD-QR-")) {
      foundToken = localQrTokens.find((t) => t.token === queryVal);
    }

    if (!foundToken) {
      return res.status(404).json({
        valid: false,
        reason: "NOT_FOUND",
        message: "유효하지 않은 QR 코드입니다."
      });
    }

    if (foundToken.isActive === false) {
      return res.status(403).json({
        valid: false,
        reason: "REVOKED",
        message: "만료 또는 파괴된 QR 코드입니다."
      });
    }

    if (now > foundToken.expiresTimestamp) {
      return res.status(403).json({
        valid: false,
        reason: "EXPIRED",
        message: "QR 코드 접속 유효기간(24시간)이 만료되었습니다.",
        expiresAt: foundToken.expiresAt,
      });
    }

    // Valid token! Update usage count
    foundToken.usedCount = (foundToken.usedCount || 0) + 1;
    saveLocalQrTokens();
    if (serverFirestoreDb && foundToken.docId) {
      updateDoc(doc(serverFirestoreDb, "qr_tokens", foundToken.docId), {
        usedCount: foundToken.usedCount
      }).catch(() => {});
    }

    const remainingMs = foundToken.expiresTimestamp - now;
    res.json({
      valid: true,
      token: foundToken.token,
      code: foundToken.code,
      title: foundToken.title,
      company: foundToken.company || "HD현대삼호 협력사",
      examDate: foundToken.examDate || new Date(foundToken.createdTimestamp || now).toISOString().slice(0, 10),
      createdAt: foundToken.createdAt,
      expiresAt: foundToken.expiresAt,
      remainingMs,
      remainingHours: (remainingMs / (1000 * 60 * 60)).toFixed(1)
    });
  } catch (error: any) {
    console.error("Verify QR error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// 4. Revoke / Deactivate a QR Token
app.post("/api/qr-tokens/revoke", async (req, res) => {
  try {
    const { token, docId } = req.body || {};
    if (serverFirestoreDb && docId) {
      await updateDoc(doc(serverFirestoreDb, "qr_tokens", docId), { isActive: false });
    }
    localQrTokens = localQrTokens.map((t) => (t.token === token || t.docId === docId ? { ...t, isActive: false } : t));
    saveLocalQrTokens();

    res.json({ success: true, message: "QR 코드가 성공적으로 파괴/비활성화되었습니다." });
  } catch (error: any) {
    console.error("Revoke QR error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

// 5. List all QR tokens history
app.get("/api/qr-tokens/list", async (req, res) => {
  try {
    const now = Date.now();
    let list: any[] = [];
    if (serverFirestoreDb) {
      try {
        const snap = await getDocs(collection(serverFirestoreDb, "qr_tokens"));
        snap.forEach((d) => {
          list.push({ docId: d.id, ...d.data() });
        });
      } catch (e) {
        console.warn("Firestore list error:", e);
      }
    }

    if (list.length === 0) {
      list = [...localQrTokens];
    }

    // Merge and compute status
    const formatted = list
      .map((t) => {
        const isExp = now > (t.expiresTimestamp || 0);
        const remainingMs = Math.max(0, (t.expiresTimestamp || 0) - now);
        return {
          ...t,
          status: !t.isActive ? "REVOKED" : isExp ? "EXPIRED" : "ACTIVE",
          remainingMs,
          remainingHours: (remainingMs / (1000 * 60 * 60)).toFixed(1)
        };
      })
      .sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));

    res.json({ success: true, tokens: formatted });
  } catch (error: any) {
    console.error("List QR error:", error);
    res.status(500).json({ error: true, message: error.message });
  }
});

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
    // Resolve Gemini API Key (support GEMINI_API_KEY, GOOGLE_API_KEY, or VITE_GEMINI_API_KEY)
    let apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.VITE_GEMINI_API_KEY;
    // Fallback to apiKey only if it's NOT the Firebase Web API key
    if (!apiKey && process.env.apiKey && !process.env.apiKey.startsWith("AIzaSyC_fQq")) {
      apiKey = process.env.apiKey;
    }

    if (!apiKey) {
      return res.status(400).json({
        error: true,
        message: "Gemini API Key is not configured on the server side. Please set GEMINI_API_KEY in environment variables.",
      });
    }

    const maskedKey = apiKey.length > 8 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : "***";
    console.log(`[AI Report] Using API key: ${maskedKey}`);

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
* 점수 판단 절대 가이드: 
  - S, A 등급(총점 80점 이상): 우수인력. 긍정적 잠재력 위주로 서술하되, 약점도 간략히 언급.
  - B1, B2 등급(총점 60~79점): 평이하거나 다소 부족한 보통 이하 인력. **절대 과장된 칭찬이나 '매우 우수하다'는 표현을 금지**하고, 평이한 역량임을 명시하며 보완해야 할 취약점(낮은 점수 지표)을 중심으로 엄격하게 분석하세요. 70점대는 '보통 수준이나 개선이 필요함'으로 간주합니다.
  - C1, C2, D 등급(총점 59점 이하 또는 신뢰도/과락): 주의/위험군. 치명적 결함을 위주로 현장 부적응 가능성을 경고하세요.
${sRes}

반드시 가독성 높은 마크다운 형식으로 응답해 주십시오.`;

    let aiResponse;
    const modelToUse = "gemini-3.8-flash";
    
    try {
      aiResponse = await generateContentWithRetry(ai, {
        model: modelToUse,
        contents: prompt,
      });
    } catch (primaryErr: any) {
      console.warn(`[Gemini API] Primary model ${modelToUse} failed:`, primaryErr?.message || primaryErr);
      // Try fallback model if transient or quota error
      try {
        aiResponse = await generateContentWithRetry(ai, {
          model: "gemini-flash-latest",
          contents: prompt,
        }, 2, 2000);
      } catch (fallbackErr: any) {
        console.warn(`[Gemini API] Fallback model gemini-flash-latest failed:`, fallbackErr?.message || fallbackErr);
        try {
          aiResponse = await generateContentWithRetry(ai, {
            model: "gemini-3.1-flash-lite",
            contents: prompt,
          }, 2, 2000);
        } catch (thirdErr) {
          throw thirdErr || fallbackErr || primaryErr;
        }
      }
    }

    res.json({ success: true, text: aiResponse.text });
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);

    const errStr = String(error?.message || error || "");
    let userFriendlyMsg = "AI 리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";

    if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("Quota exceeded") || errStr.includes("quota")) {
      userFriendlyMsg = "Google Gemini API 사용량 한도(분당 요청 초과, HTTP 429)에 도달했습니다.\n무료 티어 호출 한도(분당 5회)로 인한 일시적인 제한이므로, 약 30~40초 후 다시 [AI 심층 분석 리포트 생성] 버튼을 눌러주세요.";
    } else if (errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("overloaded")) {
      userFriendlyMsg = "Gemini AI 서버가 일시적으로 혼잡합니다. 10~20초 후 다시 시도해 주세요.";
    } else if (errStr.includes("API Key") || errStr.includes("API_KEY")) {
      userFriendlyMsg = "서버 측 Gemini API 키 설정이 올바르지 않거나 누락되었습니다.";
    } else {
      // Try to parse raw JSON error if present
      try {
        const jsonMatch = errStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed?.error?.message) {
            userFriendlyMsg = `AI 서비스 응답 오류: ${parsed.error.message}`;
          }
        }
      } catch (_) {}
    }

    res.status(500).json({ error: true, message: userFriendlyMsg });
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
