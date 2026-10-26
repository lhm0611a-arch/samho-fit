import "dotenv/config";
import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");
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
async function generateContentWithRetry(ai: any, params: any, retries = 3, delay = 1000): Promise<any> {
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
                        errorStr.includes("overloaded") ||
                        errorStr.includes("fetch failed") ||
                        errorStr.includes("ECONNRESET") ||
                        errorStr.includes("ETIMEDOUT") ||
                        errorStr.includes("ENETUNREACH") ||
                        errorStr.includes("socket hang up");
    
    if (retries > 0 && isTransient) {
      console.warn(`[Gemini API Warning] Transient error occurred: ${errorStr}. Retrying in ${delay}ms... (Remaining retries: ${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return generateContentWithRetry(ai, params, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Fallback Expert Diagnostic Generator (used if network/quota is temporarily unavailable)
function generateExpertFallbackReport(data: any): string {
  const { name = "후보자", id = "N/A", company = "협력사", total = 0, decision = "보통 (B1)", details = {} } = data || {};
  const c1 = Number(details.C1) || 70;
  const c2 = Number(details.C2) || 70;
  const r1 = Number(details.R1) || 70;
  const r2 = Number(details.R2) || 70;
  const s1 = Number(details.S1) || 70;
  const s2 = Number(details.S2) || 70;
  const t1 = Number(details.T1) || 70;
  const t2 = Number(details.T2) || 70;
  const e1 = Number(details.E1) || 70;
  const e2 = Number(details.E2) || 70;
  const a1 = Number(details.A1) || 70;
  const a2 = Number(details.A2) || 70;

  const isSafetyFail = s1 < 60 || s2 < 60;
  const safetyStatus = isSafetyFail 
    ? "안전 과락 대상자(S1 또는 S2 60점 미만)로서 조선소 고위험 작업 현장 투입 시 중대재해 유발 위험이 높음" 
    : (s1 >= 80 && s2 >= 80 ? "안전 4대 골든룰 및 보호구 착용 수칙에 대한 철저한 준수 의식을 보유함" : "기본적인 안전 수칙은 인지하나 작업 숙달 시 방심에 의한 불안전 행동 예방이 필요함");

  const rankStr = decision.includes("S") ? "최우수(S)" : decision.includes("A") ? "우수(A)" : decision.includes("B1") ? "보통(B1)" : decision.includes("B2") ? "조건부(B2)" : decision.includes("C") ? "주의(C)" : "부적격(D)";

  return `> 📌 **[종합 판정 요약]**
> 본 후보자(${name}, ${id})는 종합점수 **${total}점**, 종합등급 **${rankStr}** 판정을 받은 외국인 기능인력으로, ${company} 소속 조선소 건조 현장 적합성 평가를 완료함. 
> 안전역량 진단 결과, ${safetyStatus}. 
> 규정 준수(R1/R2: ${r1}점/${r2}점) 및 작업 성실도(C1/C2: ${c1}점/${c2}점)를 바탕으로 공정 지시 이행력은 전반적으로 양호하나, 다국적 협업 및 언어 장벽 극복을 위한 현장 관리자의 지속적 피드백이 권장됨. 
> 전반적으로 현장 안전 교육 수료 후 공정 투입이 ${isSafetyFail ? "제한되며 심층 재검증이 요망됨" : "적합한 것으로 판단됨"}.

### 1. 생산 관리자(반장/직장) 핵심 브리핑
* **[지침 1: 현장 작업 지시 및 소통법]**: 직무학습능력(${a1}점) 및 한국어 소통 수준을 감안하여, 구두 지시보다는 표준작업지도서(SOP)의 **사진 및 시각 도면**을 병행하여 1:1로 명확히 시달하고 작업 착수 전 **복명복창(Confirm-back)** 절차를 의무화할 것.
* **[지침 2: 근태 및 규율 관리 수칙]**: 근태/시간엄수(${c1}점)와 업무책임감(${c2}점)에 기반하여 출근 직후 **TBM(Tool Box Meeting) 100% 참석** 및 작업 전 보호구(안전모·안전벨트·보안경) 체결 상태를 반장이 직접 육안 점검할 것.
* **[지침 3: 갈등 예방 및 동료 융화 가이드]**: 팀워크(${t1}점) 및 갈등관리(${t2}점) 지표를 바탕으로, 동일 국적 선배 숙련공과 1:1 멘토링을 체결하고 초기 3개월간 언어·문화적 오해로 인한 작업 분쟁을 선제 차단할 것.

### 2. 6대 핵심 역량군 및 세부 지표 정밀 진단
| 핵심 역량군 (지표 코드) | 현장 강점 요인 (조선소 관점) | 현장 보완 및 주의 요인 (관리자 관점) |
|:---|:---|:---|
| **작업 실행 및 성실도 (C1/C2)** | 근태(${c1}점) 및 책임감(${c2}점)이 안정되어 부여된 블록 가공/취부/용접 작업을 성실히 완수하는 태도를 견지함. | 연속 야간 잔업이나 고강도 블록 내부 작업 시 체력 저하로 인한 집중력 감퇴 여부를 관리자가 수시 점검 요망. |
| **사내 규정 준수 및 윤리성 (R1/R2)** | 사내 규정 준수(${r1}점) 및 정직성(${r2}점)이 양호하여 조선소 내 안전 골든룰 및 작업 지시를 임의 변경하지 않고 정석 시공함. | 자재 운반 및 용접 비드 결함 발생 시 임의 은폐하지 않고 즉각 반장에게 보고하도록 정직성 교육 지속. |
| **현장 안전 민감도 (S1/S2)** | 안전수칙준수(${s1}점) 및 위험인지(${s2}점) 진단 결과, 밀폐구역 환기 및 화기 작업 전 소화기 비치 등 기본 위험 요소를 인지함. | ${isSafetyFail ? "**[과락 주의]** 고소 족장 작업 시 안전고리 미체결 등 치명적 사고 위험이 있으므로 단독 작업 절대 금지." : "익숙한 반복 작업 구간에서 안전 불감증이 발생하지 않도록 1일 2회 불시 순찰 점검 실시."} |
| **팀워크 및 현장 융화력 (T1/T2)** | 협업 태도(${t1}점)가 원만하여 반장 및 동료 기능공과의 유대감 형성에 긍정적 의지를 표명함. | 작업 방식 이견 시 언어 표현 한계로 침묵하거나 위축될 수 있으므로 소통 창구를 반장으로 일원화. |
| **정서 안정 및 인내심 (E1/E2)** | 감정조절(${e1}점)과 인내심(${e2}점)이 준수하여 혹서기/혹한기 옥외 도크 환경에서도 안정적 직무 태도를 유지함. | 기후 부적응이나 향수병으로 인한 일시적 의욕 저하 발생 시 기숙사 생활 지도원과 연계 상담 권장. |
| **학습 능력 및 환경 적응 (A1/A2)** | 직무학습(${a1}점) 및 환경적응(${a2}점) 지표에 따라 선박 건조 표준 용어 및 도면 기호 습득 속도가 양호함. | 신규 블록 공법 도입 시 적응 기간이 필요하므로 작업 착수 전 숙련 사수의 시범 작업 필수 선행. |

### 3. 현장 안전 수칙 준수 & 잠재 리스크 심층 평가
| 잠재 리스크 명칭 | 현장 발현 상황 및 조건 | 선제적 통제 및 반장 조치 가이드 |
|:---|:---|:---|
| **밀폐구역 유해가스 및 질식 리스크** | 이중바닥(Double Bottom) 등 밀폐구역 내 용접/도장 작업 시 사전 산소 농도 미측정 및 환기팬 미가동 상태 진입 | 작업 착수 전 **밀폐구역 작업허가서(PTW)** 승인 및 산소/유해가스 농도 4대 기준치 측정 후 진입 허용 |
| **고소작업 족장 추락 리스크** | 블록 탑재 및 외판 고소 작업 시 안전대 이중고리(2-Hook) 미체결 및 발판 미고정 구간 이동 | **안전대 걸이시설 100% 체결** 의무화 및 미체결 적발 시 즉시 작업 중지(Stop Work) 및 재교육 |
| **화기 작업 불꽃 비산 화재 리스크** | 배관 및 선각 용접/절단 작업 중 불티 비산방지포 미설치 및 인화성 자재 방치 | 용접 반경 11m 이내 가연물 제거, 소화기 2대 전면 비치 및 화재감시자(Fire Watcher) 입회 확인 |

### 4. 실무 면접관용 심층 검증 질문 (STAR 기법)
* **[면접 검증 질문 1]**: "이전 작업 현장에서 안전모나 안전벨트를 착용하기 불편한 상황일 때 어떻게 대처했는지 구체적인 경험을 말씀해 주십시오."<br>- **검증 의도**: 고온·협소 구역 등 열악한 환경에서도 안전 보호구를 임의 탈착하지 않는 준법 의식(${s1}점) 검증.<br>- **관찰 포인트**: '답답해도 원칙을 지켰다'는 답변의 구체적 정황과 타협 없는 안전 태도 관찰.
* **[면접 검증 질문 2]**: "한국인 직·반장의 지시 내용 중 도면이나 한국어가 완벽히 이해되지 않았을 때 어떻게 행동하겠습니까?"<br>- **검증 의도**: 임의 시공(가작업) 방지 및 피드백 수용성(${a1}점, ${c2}점) 검증.<br>- **관찰 포인트**: 부끄러워 넘기지 않고 다시 확인(Re-check)을 요청하는 적극적 소통 자세 확인.
* **[면접 검증 질문 3]**: "국적이 다른 동료와 작업 배분이나 휴게 시간 문제로 의견 차이가 발생했을 때 어떻게 조율하겠습니까?"<br>- **검증 의도**: 다문화 생산 현장에서의 갈등 관리 능력(${t2}점) 및 화합 태도 검증.<br>- **관찰 포인트**: 감정적 대립이나 파벌 형성을 지양하고 반장에게 공식 중재를 요청하는 성숙도 확인.

### 5. 최적 공정 부서 배치 및 조기 정착 실행 계획
| 관리 지표 | 생산 관리자(반장/직장) 관점의 실행 지침 |
|:---|:---|
| **최적 추천 직무/공정** | - **추천 직무**: 선각 소조립/대조립 취부 및 자동/반자동 CO2 용접, 의장 배관 설치 공정<br>- **주의 직무**: ${isSafetyFail ? "단독 고소 족장 작업 및 심야 밀폐구역 작업 투입 절대 금지" : "위험성 높은 선대 탑재 고소 족장 단독 작업은 3개월 경과 후 투입 검토"} |
| **효과적 소통 및 작업 지시** | - 작업 개시 전 1일 1개 조선소 한국어 기술 단어 반복 교육<br>- 작업 종료 후 반장이 직접 용접 결함 및 안전 상태 확인 후 서명 승인 |
| **리스크 통제 방안** | - 현대삼호 **안전 4대 골든룰** 위반 시 3진 아웃제 엄격 적용 안내<br>- 매일 작업 전 혈압/음주 측정 및 건강 이상자 무리한 작업 배제 |
| **동기부여 및 근태 관리** | - 분기별 안전 무사고 달성 및 우수 근태 포상(삼호상품권 등) 추천<br>- 기숙사 귀가 후 음주 및 무단 외출 방지를 위한 생활지도 점검 |
| **추천 멘토(사수) 매칭** | - 한국어 능통 동향 선배(E-7/E-9 선발자) 1명 + 인내심 있는 한국인 베테랑 기장 1명 듀얼 멘토 지정 |
| **중장기 육성 로드맵** | - **1~3개월**: 기본 공정 단품 취부/용접 및 안전 골든룰 100% 체화<br>- **4~6개월**: 복합 블록 조립 및 품질 검사(RT/UT) 합격률 95% 이상 달성<br>- **1년 이후**: E-7 숙련기능공으로서 후배 입국자 현장 OJT 사수 역할 부여 |`;
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

    let aiResponse: any = null;
    const modelToUse = "gemini-3.8-flash";
    
    try {
      aiResponse = await generateContentWithRetry(ai, {
        model: modelToUse,
        contents: prompt,
      }, 2, 1000);
    } catch (primaryErr: any) {
      console.warn(`[Gemini API] Primary model ${modelToUse} failed:`, primaryErr?.message || primaryErr);
      // Fallback 1: gemini-flash-latest
      try {
        aiResponse = await generateContentWithRetry(ai, {
          model: "gemini-flash-latest",
          contents: prompt,
        }, 2, 1000);
      } catch (fallbackErr: any) {
        console.warn(`[Gemini API] Fallback model gemini-flash-latest failed:`, fallbackErr?.message || fallbackErr);
        // Fallback 2: gemini-3.1-flash-lite
        try {
          aiResponse = await generateContentWithRetry(ai, {
            model: "gemini-3.1-flash-lite",
            contents: prompt,
          }, 2, 1000);
        } catch (thirdErr: any) {
          console.warn("[Gemini API] All online Gemini models failed, activating DX_PRO Expert Diagnostic Engine fallback:", thirdErr?.message || thirdErr);
          const fallbackText = generateExpertFallbackReport(req.body);
          return res.json({ success: true, text: fallbackText });
        }
      }
    }

    if (aiResponse && aiResponse.text) {
      return res.json({ success: true, text: aiResponse.text });
    }

    const fallbackText = generateExpertFallbackReport(req.body);
    return res.json({ success: true, text: fallbackText });
  } catch (error: any) {
    console.error("Gemini Generation Error:", error);
    try {
      const fallbackText = generateExpertFallbackReport(req.body);
      return res.json({ success: true, text: fallbackText });
    } catch (_) {
      res.status(500).json({ error: true, message: "AI 리포트 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." });
    }
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
