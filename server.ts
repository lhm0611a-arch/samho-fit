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

    const prompt = `당신은 HD현대삼호(HD HYUNDAI SAMHO)의 외국인 기능인력(E-7-3 용접, 선각 취부, 선박 도장, 의장 배관, 전기 등) 전담 수석 채용 평가위원이자, 현장 생산 관리자(반장/직장/공정장)를 밀착 지원하는 최고 인사 컨설턴트입니다.
제공된 후보자의 인성검사 12대 세부 역량 점수, 종합 점수 및 등급, 안전 과락 여부, 응답 신뢰도 판별 결과 및 극단적 응답 패턴을 종합적으로 분석하여, 실제 현대삼호 조선소 생산 현장에 즉각 적용할 수 있는 '생산 현장 맞춤형 AI 심층 분석 리포트'를 작성하십시오.

[핵심 톤앤매너 및 지침]
1. 톤앤매너: 본 보고서는 '인성검사 평가 결과 보고서(HD HYUNDAI SAMHO DX_PRO)'와 완벽한 시각적·문체적 일체감을 유지해야 합니다. 최고 경영진과 현장 관리자가 신뢰할 수 있는 공정하고 객관적인 공식 보고서 어조(~함, ~임, ~요망됨, ~판단됨, ~확인 요망)를 철저히 지키십시오.
2. 조선업 현장 현실 반영: 조선소 건조 현장의 위험 요소(밀폐구역 유해가스, 고소 족장 추락, 블록 이동 및 크레인 협착, 화기 화재) 및 4대 골든룰 준수, 한국인 직·반장과의 작업 소통, 다국적 동료와의 숙소·현장 융화도를 구체적으로 다루십시오.
3. 엄격하고 균형 잡힌 평가:
   - S, A 등급(80점 이상): 우수 역량을 객관적으로 명시하되, 방심이나 과신으로 인한 취약점을 짚으십시오.
   - B1, B2 등급(60~79점): '보통 수준' 또는 '보완 필요 인력'임을 명확히 하고, **절대 무조건적인 칭찬을 금지**하며, 12개 지표 중 취약 지표(점수가 낮은 부분)를 냉정하게 지적하십시오.
   - C1, C2, D 등급(59점 이하) 또는 안전 과락(S1/S2 60점 미만) 또는 신뢰도 결격: 위험/요주의 인력으로 규정하고, 현장 사고 발생 우려와 채용 보류/부적격 사유를 명백히 경고하십시오.
4. 출력 규정:
   - 서두에 "인사말", "안녕하세요", "제출합니다" 등의 잡다한 안내 문구를 **절대** 쓰지 마십시오.
   - 첫 시작은 반드시 \`> 📌 **[종합 판정 요약]**\` 블록으로 즉시 시작하십시오.
   - 아래 지정된 [보고서 표준 양식]의 섹션 넘버링과 제목, 테이블 양식을 정확히 준수하십시오.
   - 중요한 핵심 키워드, 수치, 공정명, 행동 특성은 **굵은 글씨** 처리하십시오.

[보고서 표준 양식]

> 📌 **[종합 판정 요약]**
> (후보자의 전반적 인성 프로파일, 종합 점수/등급과 연계된 현장 적합도, 안전 의식 수준, 잠재적 리스크 요인을 압축하여 4~5문장의 완성도 높은 공식 줄글로 엄정하게 서술)

### 1. 생산 관리자(반장/직장) 핵심 브리핑
* **[지침 1: 현장 작업 지시 및 소통법]**: (후보자의 학습능력/수용 태도에 맞춘 구체적 지시 전달 요령과 피드백 방식)
* **[지침 2: 근태 및 규율 관리 수칙]**: (근태/책임감/규정준수 지표를 고려한 반장의 밀착 점검 포인트)
* **[지침 3: 갈등 예방 및 동료 융화 가이드]**: (다국적 동료 및 내국인 기장과의 원만한 관계 형성을 위한 지도 방안)

### 2. 6대 핵심 역량군 및 세부 지표 정밀 진단
| 핵심 역량군 (지표 코드) | 현장 강점 요인 (조선소 관점) | 현장 보완 및 주의 요인 (관리자 관점) |
|:---|:---|:---|
| **작업 실행 및 성실도 (C1/C2)** | (근태/시간 준수 및 책임감 관련 강점을 구체적 상황으로 서술) | (납기 압박이나 고강도 작업 시 발생 가능한 성실성 저하 요인) |
| **사내 규정 준수 및 윤리성 (R1/R2)** | (안전수칙, 절차 준수 및 정직성 강점 서술) | (임의 판단이나 편법 작업 가능성 진단) |
| **현장 안전 민감도 (S1/S2)** | (보호구 100% 착용, TBM 참여 및 위험 인지 강점) | (반복 작업 시 안전 불감증이나 부주의 발생 가능성) |
| **팀워크 및 현장 융화력 (T1/T2)** | (반장 지시 수용성 및 동료 협업 강점) | (언어 장벽이나 문화 차이로 인한 갈등 소지) |
| **정서 안정 및 인내심 (E1/E2)** | (고온/혹한/야간/잔업 등 열악한 환경 속 감정 조절 강점) | (피로 누적 시 돌발 행동이나 감정적 위축 가능성) |
| **학습 능력 및 환경 적응 (A1/A2)** | (도면 이해, 한국어 습득 및 한국 조선소 적응 강점) | (신규 공정 투입 시 학습 지연이나 적응 스트레스 요인) |

### 3. 현장 안전 수칙 준수 & 잠재 리스크 심층 평가
| 잠재 리스크 명칭 | 현장 발현 상황 및 조건 | 선제적 통제 및 반장 조치 가이드 |
|:---|:---|:---|
| **(리스크 1: 명칭)** | (밀폐구역 환기 미실시, 고소작업 안전고리 미체결, 용접 화기 취급 부주의 등 구체적 발현 조건) | (반장의 현장 순찰 체크포인트 및 즉각적인 교정 조치) |
| **(리스크 2: 명칭)** | (소통 부재로 인한 작업 오류, 피로 누적으로 인한 무단 이탈, 동료와의 마찰 등) | (작업 전 TBM 및 1:1 면담을 통한 사전 예방책) |

### 4. 실무 면접관용 심층 검증 질문 (STAR 기법)
* **[면접 검증 질문 1]**: "(후보자의 가장 낮은 점수 지표나 1점/5점 극단 문항을 파고드는 실제 현장 질문)"<br>- **검증 의도**: (무엇을 검증하기 위함인지 명시)<br>- **관찰 포인트**: (답변 시 태도, 구체성, 책임 회피 여부 판별 기준)
* **[면접 검증 질문 2]**: "(조선소 고강도 작업 및 안전 수칙 준수와 관련된 구체적 상황 질문)"<br>- **검증 의도**: (의도 서술)<br>- **관찰 포인트**: (관찰 포인트 서술)
* **[면접 검증 질문 3]**: "(다국적 동료 또는 한국인 반장과의 갈등/의견 불일치 해결 경험 질문)"<br>- **검증 의도**: (의도 서술)<br>- **관찰 포인트**: (관찰 포인트 서술)

### 5. 최적 공정 부서 배치 및 조기 정착 실행 계획
| 관리 지표 | 생산 관리자(반장/직장) 관점의 실행 지침 |
|:---|:---|
| **최적 추천 직무/공정** | - (추천 공정 1: 예. 블록 대조립 선각 취부/자동용접 등)<br>- (비추천 또는 주의 공정 및 사유) |
| **효과적 소통 및 작업 지시** | - (시각 자료/표준작업지도서 활용 등 소통 원칙)<br>- (작업 완료 후 상호 확인 절차) |
| **리스크 통제 방안** | - (안전 4대 골든룰 집중 점검 항목)<br>- (1일 1회 이상 안전 점검 요령) |
| **동기부여 및 근태 관리** | - (초기 정착을 위한 격려 및 성과 인정 방식)<br>- (지각/조퇴 방지 및 일일 건강 상태 확인) |
| **추천 멘토(사수) 매칭** | - (적합한 사수의 성향 및 경력 조건)<br>- (동일 출신국 선배 또는 인내심 있는 한국인 숙련공 매칭) |
| **중장기 육성 로드맵** | - (3개월 차: 표준 안전수칙 체질화 및 기본 공정 독자 수행)<br>- (6개월~1년 차: 복합 공정 투입 및 신규 입국자 멘토링 역할) |

후보자 상세 데이터:
- 성명: ${name}, 수험번호: ${id}, 협력사: ${company}
- 종합점수: ${total}점, 종합등급: ${decision}, 신뢰도 판별: ${reliability}
- 12대 세부역량 점수 (100점 만점):
  * 근태/시간엄수(C1): ${details?.C1}점, 업무책임감(C2): ${details?.C2}점
  * 사내규정준수(R1): ${details?.R1}점, 직무정직성(R2): ${details?.R2}점
  * 팀워크/협업(T1): ${details?.T1}점, 갈등관리(T2): ${details?.T2}점
  * 감정조절(E1): ${details?.E1}점, 인내심(E2): ${details?.E2}점
  * 안전수칙준수(S1): ${details?.S1}점, 위험상황인지(S2): ${details?.S2}점
  * 직무학습능력(A1): ${details?.A1}점, 조직환경적응(A2): ${details?.A2}점
${sRes}

위 서식에 맞춰 가독성 높고 격식 있는 공식 보고서 형식으로 작성해 주십시오.`;

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
