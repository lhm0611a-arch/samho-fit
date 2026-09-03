import { useState, useEffect, useRef, useMemo } from "react";
import { 
  Shield, 
  Activity, 
  Check, 
  Search, 
  ArrowLeft, 
  ArrowRight,
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  Trash2, 
  QrCode, 
  LogOut, 
  Calendar, 
  Award, 
  AlertCircle,
  Edit3,
  X,
  Lock,
  Clock,
  KeyRound,
  Zap,
  Sparkles
} from "lucide-react";
import * as XLSX from "xlsx";
import QRCode from "qrcode";

import { QUESTIONS_FULL, GUIDE_TEXTS, MGMT_GUIDE } from "./questions";
import { 
  calculateAll, 
  formatDate, 
  getStandardDate, 
  getYYYYMMDD, 
  parseDateStrict,
  generateReportComment, 
  generateReliabilityComment,
  formatCandidateId,
  formatCandidateName,
  compareCandidateId,
  getRecordKey,
  AssessmentResult 
} from "./utils/calculations";
import { MainChart } from "./components/MainChart";
import { AIReport } from "./components/AIReport";
import { TotalReport } from "./components/TotalReport";
import { QRManagementModal } from "./components/QRManagementModal";
import { QRAuthGateModal } from "./components/QRAuthGateModal";
import { QRExpiredView } from "./components/QRExpiredView";
import { AdminTestSimulatorModal } from "./components/AdminTestSimulatorModal";
import { firestoreDb } from "./firebase";
import { collection, addDoc, getDocs, doc, deleteDoc, updateDoc, query, where } from "firebase/firestore";

const LOCAL_DB_KEY = "HD_E7_FINAL_V30";

const UI_TEXT = {
  kr: {
    title: "응시자 정보 입력",
    companyLabel: "소속 업체명 (COMPANY)",
    firstNameLabel: "이름 (FIRST NAME)",
    lastNameLabel: "성 (LAST NAME / 선택)",
    idLabel: "수험번호 (CANDIDATE ID)",
    companyPlaceholder: "소속 업체명을 입력하세요",
    firstNamePlaceholder: "예: 길동 (외자인 경우 이름만 입력)",
    lastNamePlaceholder: "예: 홍 (선택사항)",
    idPlaceholder: "예: TM-001, A-01",
    abort: "취소 (ABORT)",
    proceed: "다음 (PROCEED)",
    langSelect: "언어 선택 (SELECT LANGUAGE)"
  },
  vn: {
    title: "Thông tin ứng viên",
    companyLabel: "Tên công ty / Cơ quan",
    firstNameLabel: "Tên (FIRST NAME)",
    lastNameLabel: "Họ & Tên đệm (LAST NAME)",
    idLabel: "Số báo danh",
    companyPlaceholder: "Nhập tên công ty",
    firstNamePlaceholder: "VD: Văn A",
    lastNamePlaceholder: "VD: Nguyễn",
    idPlaceholder: "VD: TM-001, A-01",
    abort: "HỦY (ABORT)",
    proceed: "TIẾP TỤC (PROCEED)",
    langSelect: "CHỌN NGÔN NGỮ"
  },
  id: {
    title: "Informasi Peserta",
    companyLabel: "Nama Perusahaan / Agensi",
    firstNameLabel: "Nama Lengkap / Nama Depan (NAME)",
    lastNameLabel: "Nama Belakang / Marga (Opsional)",
    idLabel: "Nomor Peserta",
    companyPlaceholder: "Masukkan Nama Perusahaan",
    firstNamePlaceholder: "Contoh: SUGIANTO / JOKO",
    lastNamePlaceholder: "Opsional (kosongkan jika nama tunggal)",
    idPlaceholder: "Contoh: TM-001, A-01",
    abort: "BATAL (ABORT)",
    proceed: "LANJUT (PROCEED)",
    langSelect: "PILIH BAHASA"
  },
  en: {
    title: "CANDIDATE IDENTIFICATION",
    companyLabel: "COMPANY / AGENCY",
    firstNameLabel: "FIRST NAME / FULL NAME",
    lastNameLabel: "LAST NAME (OPTIONAL)",
    idLabel: "CANDIDATE ID",
    companyPlaceholder: "Enter Company Name",
    firstNamePlaceholder: "e.g. John (or Single Name)",
    lastNamePlaceholder: "e.g. Doe (Optional)",
    idPlaceholder: "e.g. TM-001, A-01",
    abort: "ABORT",
    proceed: "PROCEED",
    langSelect: "SELECT LANGUAGE"
  },
  np: {
    title: "उम्मेदवार जानकारी",
    companyLabel: "कम्पनीको नाम (COMPANY / AGENCY)",
    firstNameLabel: "पहिलो नाम (FIRST NAME)",
    lastNameLabel: "थर (LAST NAME)",
    idLabel: "उम्मेदवार आईडी (CANDIDATE ID)",
    companyPlaceholder: "कम्पनीको नाम प्रविष्ट गर्नुहोस्",
    firstNamePlaceholder: "उदाहरण: राम",
    lastNamePlaceholder: "उदाहरण: शर्मा",
    idPlaceholder: "उदाहरण: TM-001, A-01",
    abort: "रद्द गर्नुहोस् (ABORT)",
    proceed: "अगाडि बढ्नुहोस् (PROCEED)",
    langSelect: "भाषा छान्नुहोस् (SELECT LANGUAGE)"
  }
};

export default function App() {
  // Navigation & Core States
  const [currentView, setCurrentView] = useState<string>("home");
  const [lang, setLang] = useState<string>("kr");
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  
  // Participant Info
  const [candidateInfo, setCandidateInfo] = useState<{
    firstName: string;
    lastName: string;
    id: string;
    company: string;
    date: string;
  }>({
    firstName: "",
    lastName: "",
    id: "",
    company: "",
    date: "",
  });

  // Timer & Test Flow
  const [remainingTime, setRemainingTime] = useState<number>(1800); // 30 minutes
  const [shuffledIndices, setShuffledIndices] = useState<number[]>([]);
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Database / Dashboard States
  const [localData, setLocalData] = useState<AssessmentResult[]>([]);
  const [firebaseData, setFirebaseData] = useState<AssessmentResult[]>([]);
  const [sheetData, setSheetData] = useState<AssessmentResult[]>([]);
  const [fileData, setFileData] = useState<AssessmentResult[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterGrade, setFilterGrade] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("");
  const [sortKey, setSortKey] = useState<string>("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");

  // Detailed Report & Admin password
  const [viewingResult, setViewingResult] = useState<AssessmentResult | null>(null);
  const [adminPassword, setAdminPassword] = useState<string>("");

  // Candidate Edit Modal States
  const [editingResult, setEditingResult] = useState<AssessmentResult | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    id: "",
    company: "",
    date: "",
    lang: "kr",
  });
  const [isSavingEdit, setIsSavingEdit] = useState<boolean>(false);

  // Modals & UI indicators
  const [toast, setToast] = useState<{ message: string; type: "info" | "error" } | null>(null);
  const [customModal, setCustomModal] = useState<{ title: string; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [isKakaotalk, setIsKakaotalk] = useState<boolean>(false);

  // QR 24-Hour Access Security States
  const [qrAuthStatus, setQrAuthStatus] = useState<"CHECKING" | "AUTHORIZED" | "UNAUTHORIZED" | "EXPIRED">("CHECKING");
  const [qrTokenInfo, setQrTokenInfo] = useState<any>(null);
  const [qrAuthError, setQrAuthError] = useState<string | null>(null);
  const [showQrAdminModal, setShowQrAdminModal] = useState<boolean>(false);
  const [showAuthGateModal, setShowAuthGateModal] = useState<boolean>(false);
  const [showAdminSimulator, setShowAdminSimulator] = useState<boolean>(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [qrRemainingStr, setQrRemainingStr] = useState<string>("");

  // Toast Helper
  const showToast = (message: string, type: "info" | "error" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // QR 24-Hour Access Verification on App Load
  useEffect(() => {
    const verifyInitialQrAccess = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get("qr") || urlParams.get("token") || urlParams.get("code") || urlParams.get("access_code");
        
        let tokenToVerify = urlToken;
        if (!tokenToVerify) {
          const stored = sessionStorage.getItem("hd_e7_qr_session");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              tokenToVerify = parsed.token || parsed.code;
            } catch (e) {
              sessionStorage.removeItem("hd_e7_qr_session");
            }
          }
        }

        if (!tokenToVerify) {
          setQrAuthStatus("UNAUTHORIZED");
          return;
        }

        const res = await fetch("/api/qr-tokens/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: tokenToVerify, code: tokenToVerify })
        });
        const data = await res.json();

        if (data.valid) {
          setQrAuthStatus("AUTHORIZED");
          setQrTokenInfo(data);
          if (data.company) {
            setCandidateInfo((prev) => ({
              ...prev,
              company: data.company,
              date: data.examDate || prev.date || new Date().toISOString().slice(0, 10),
            }));
          }
          sessionStorage.setItem("hd_e7_qr_session", JSON.stringify(data));
          // Clean URL parameter without reloading page
          if (urlToken) {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          sessionStorage.removeItem("hd_e7_qr_session");
          if (data.reason === "EXPIRED") {
            setQrAuthStatus("EXPIRED");
            setQrAuthError(data.message || "QR 코드 24시간 접속 유효기간이 만료되었습니다.");
            setQrTokenInfo({ expiresAt: data.expiresAt });
          } else {
            setQrAuthStatus("UNAUTHORIZED");
            setQrAuthError(data.message);
          }
        }
      } catch (err) {
        console.warn("Initial QR verification failed:", err);
        setQrAuthStatus("UNAUTHORIZED");
      }
    };

    verifyInitialQrAccess();
  }, []);

  // Update live countdown for 24-hour QR session
  useEffect(() => {
    if (qrAuthStatus !== "AUTHORIZED" || !qrTokenInfo?.expiresAt) return;
    const updateRemaining = () => {
      const expTime = new Date(qrTokenInfo.expiresAt).getTime();
      const diff = expTime - Date.now();
      if (diff <= 0) {
        setQrAuthStatus("EXPIRED");
        setQrAuthError("24시간 접속 유효기간이 만료되었습니다. 관리자에게 새 QR 코드를 요청하세요.");
        sessionStorage.removeItem("hd_e7_qr_session");
      } else {
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setQrRemainingStr(`${h}시간 ${m}분 남음`);
      }
    };
    updateRemaining();
    const interval = setInterval(updateRemaining, 30000);
    return () => clearInterval(interval);
  }, [qrAuthStatus, qrTokenInfo]);

  // Prevent Navigation / Refresh Guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (currentView === "assessment") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentView]);

  // Network connection listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // 1. Load all local storage records (including historical version keys to prevent any loss)
  const loadAllLocalStorageData = () => {
    const allFound: AssessmentResult[] = [];
    const knownKeys = [
      LOCAL_DB_KEY,
      "HD_E7_FINAL_V30",
      "HD_E7_FINAL_V29",
      "HD_E7_FINAL_V20",
      "HD_E7_FINAL_V1",
      "HD_E7_RESULTS",
      "HD_E7_LOCAL_DB"
    ];

    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith("HD_E7") || k.includes("FINAL") || k.includes("RESULT"))) {
        if (!knownKeys.includes(k)) knownKeys.push(k);
      }
    }

    knownKeys.forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (item && (item.id || item.name)) {
                allFound.push({
                  ...item,
                  source: item.source || "로컬 저장소",
                  date: item.date || getStandardDate(),
                });
              }
            });
          }
        }
      } catch (e) {
        console.warn("Storage load error:", key, e);
      }
    });

    // Deduplicate local items
    const map = new Map<string, AssessmentResult>();
    allFound.forEach((item) => {
      const k = `${formatCandidateId(item.id)}_${formatCandidateName(item.name)}_${getYYYYMMDD(item.date)}`;
      if (!map.has(k)) {
        map.set(k, item);
      } else {
        const existing = map.get(k)!;
        if (Object.keys(item.answers || {}).length >= Object.keys(existing.answers || {}).length) {
          map.set(k, item);
        }
      }
    });

    const mergedLocals = Array.from(map.values());
    setLocalData(mergedLocals);
    if (mergedLocals.length > 0) {
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(mergedLocals));
    }
    return mergedLocals;
  };

  // 2. Fetch directly from Firebase Firestore (Server Endpoint + Client SDK Fallback)
  const fetchFirestoreData = async (): Promise<AssessmentResult[]> => {
    const fbRecords: AssessmentResult[] = [];

    // Method A: Server-Side Firestore Proxy (Instant, CORS-free, 100% reliable)
    try {
      const res = await fetch("/api/firestore-data");
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list) && list.length > 0) {
          list.forEach((d: any) => {
            if (d && (d.name || d.id)) {
              fbRecords.push({
                ...d,
                name: formatCandidateName(d.name || ""),
                id: formatCandidateId(d.id || ""),
                company: d.company || "-",
                date: d.date ? formatDate(d.date) : getStandardDate(),
                total: typeof d.total === "number" ? d.total : parseFloat(d.total) || 0,
                reliability: d.reliability || "-",
                decision: d.decision || "-",
                details: d.details || {},
                mainDetails: d.mainDetails || {},
                minScore: typeof d.minScore === "number" ? d.minScore : 0,
                answers: d.answers || {},
                source: "클라우드(Firebase)",
                docId: d.docId || d.id,
              });
            }
          });
          const fbMap = new Map<string, AssessmentResult>();
          fbRecords.forEach((item) => {
            const key = item.docId || `${item.id}_${item.name}_${getYYYYMMDD(item.date)}`;
            fbMap.set(key, item);
          });
          const uniqueFb = Array.from(fbMap.values());
          setFirebaseData(uniqueFb);
          return uniqueFb;
        }
      }
    } catch (apiErr) {
      console.warn("Server Firestore proxy notice:", apiErr);
    }

    // Method B: Client-Side Firestore SDK (with timeout safeguard)
    try {
      const clientFetch = async () => {
        const querySnapshot = await getDocs(collection(firestoreDb, "assessments"));
        querySnapshot.forEach((docSnap) => {
          const d = docSnap.data() as any;
          if (d && (d.name || d.id)) {
            fbRecords.push({
              ...d,
              name: formatCandidateName(d.name || ""),
              id: formatCandidateId(d.id || ""),
              company: d.company || "-",
              date: d.date ? formatDate(d.date) : getStandardDate(),
              total: typeof d.total === "number" ? d.total : parseFloat(d.total) || 0,
              reliability: d.reliability || "-",
              decision: d.decision || "-",
              details: d.details || {},
              mainDetails: d.mainDetails || {},
              minScore: typeof d.minScore === "number" ? d.minScore : 0,
              answers: d.answers || {},
              source: "클라우드(Firebase)",
              docId: docSnap.id
            });
          }
        });
      };
      await Promise.race([
        clientFetch(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 2000))
      ]);
    } catch (err) {
      console.warn("Firebase client query notice:", err);
    }

    // Deduplicate by docId or Candidate Key
    const fbMap = new Map<string, AssessmentResult>();
    fbRecords.forEach((item) => {
      const key = item.docId || `${item.id}_${item.name}_${getYYYYMMDD(item.date)}`;
      fbMap.set(key, item);
    });

    const uniqueFb = Array.from(fbMap.values());
    setFirebaseData(uniqueFb);
    return uniqueFb;
  };

  // 3. Fetch from Google Sheets Web App via Server Proxy
  const fetchGoogleSheetsData = async (): Promise<AssessmentResult[]> => {
    try {
      const res = await fetch("/api/sheets-proxy");
      if (!res.ok) {
        console.warn("Sheets proxy returned non-OK status:", res.status);
        return [];
      }
      const text = await res.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        return [];
      }
      const rows = Array.isArray(parsed) ? parsed : (parsed.data || []);
      const syncedRecords: AssessmentResult[] = [];

      rows.forEach((rawRow: any) => {
        let row: any = { ...rawRow };
        // Unpack embedded JSON object from any column (e.g. column "95", "JSON", "PAYLOAD")
        for (const [k, v] of Object.entries(rawRow)) {
          if (typeof v === "string" && v.trim().startsWith("{") && v.trim().endsWith("}")) {
            try {
              const parsedJson = JSON.parse(v.trim());
              row = { ...row, ...parsedJson };
            } catch {}
          }
        }

        const keys = Object.keys(row);
        const findKey = (targets: string[]) => 
          keys.find((k) => targets.some((t) => k.replace(/[\s\r\n]/g, "").toUpperCase().includes(t.toUpperCase())));
        
        const nameKey = findKey(["이름", "성명", "NAME"]);
        const candidateName = nameKey && row[nameKey] ? row[nameKey] : (row.name || "");
        const idKey = findKey(["ID", "응시번호", "CANDIDATE", "수험번호"]);
        const candidateId = idKey && row[idKey] ? row[idKey] : (row.id || "");

        if (!candidateName && !candidateId) return;

        // Extract raw answers Q1 - Q94
        const answers: Record<number, number> = {};
        for (let q = 1; q <= 94; q++) {
          const qKey = keys.find((k) => {
            const c = k.replace(/[\s\r\n]/g, "").toUpperCase();
            return c === "Q" + q || c === "문항" + q || c === String(q);
          });
          if (qKey && row[qKey] !== undefined && row[qKey] !== "") {
            const val = parseInt(row[qKey], 10);
            if (!isNaN(val) && val >= 1 && val <= 5) {
              answers[q] = val;
            }
          }
        }

        // Extract dimension details
        const det: Record<string, number> = {};
        const detMap = {
          C1: ["C1", "근태"], C2: ["C2", "책임"], R1: ["R1", "규정"], R2: ["R2", "정직"],
          T1: ["T1", "협력"], T2: ["T2", "갈등"], E1: ["E1", "감정"], E2: ["E2", "인내"],
          S1: ["S1", "안전"], S2: ["S2", "위험"], A1: ["A1", "학습"], A2: ["A2", "조직"]
        };

        Object.entries(detMap).forEach(([k, targets]) => {
          const matched = findKey(targets);
          if (matched && row[matched] !== undefined && row[matched] !== "") {
            det[k] = parseFloat(row[matched]) || 0;
          } else if (row.details && row.details[k] !== undefined) {
            det[k] = parseFloat(row.details[k]) || 0;
          } else if (row[k] !== undefined && typeof row[k] !== "object") {
            det[k] = parseFloat(row[k]) || 0;
          } else {
            det[k] = 0;
          }
        });

        const compKey = findKey(["업체", "소속", "COMPANY", "AGENCY"]);
        const totalKey = findKey(["종합점수", "총점", "TOTAL"]);
        const relKey = findKey(["신뢰도", "RELIABILITY"]);
        const decKey = findKey(["판정", "등급", "종합등급", "GRADE", "DECISION"]);
        const dateKey = findKey(["일시", "날짜", "DATE", "TIME", "응시일자", "응시일시"]);

        const rawDate = (dateKey && row[dateKey]) ? row[dateKey] : (row.date || getStandardDate());
        const parsedDate = formatDate(rawDate);

        let totalScore = totalKey && row[totalKey] ? parseFloat(row[totalKey]) : (typeof row.total === "number" ? row.total : parseFloat(row.total) || 0);
        let decision = decKey && row[decKey] ? row[decKey] : (row.decision || "-");
        let reliability = relKey && row[relKey] ? row[relKey] : (row.reliability || "-");

        if ((!totalScore || totalScore === 0) && Object.keys(answers).length >= 50) {
          const computed = calculateAll(candidateName, answers);
          totalScore = computed.total;
          decision = computed.decision;
          reliability = computed.reliability;
        }

        const calculatedMin = Math.min(...Object.values(det).filter((v) => v > 0), 100);

        syncedRecords.push({
          source: "클라우드(시트)",
          company: compKey && row[compKey] ? row[compKey] : (row.company || "-"),
          name: formatCandidateName(candidateName),
          id: formatCandidateId(candidateId || "-"),
          total: totalScore,
          reliability: reliability,
          decision: decision,
          details: det,
          mainDetails: {
            C: Math.round(((det.C1 || 0) + (det.C2 || 0)) / 2),
            R: Math.round(((det.R1 || 0) + (det.R2 || 0)) / 2),
            S: Math.round(((det.S1 || 0) + (det.S2 || 0)) / 2),
            T: Math.round(((det.T1 || 0) + (det.T2 || 0)) / 2),
            E: Math.round(((det.E1 || 0) + (det.E2 || 0)) / 2),
            A: Math.round(((det.A1 || 0) + (det.A2 || 0)) / 2),
          },
          minScore: calculatedMin,
          date: parsedDate,
          answers: answers,
        });
      });

      setSheetData(syncedRecords);
      return syncedRecords;
    } catch (err) {
      console.warn("Google Sheets sync notice:", err);
      return [];
    }
  };

  // 4. Synchronize all cloud sources (Firebase & Google Sheets) in parallel
  const syncAllCloudData = async (manual = false) => {
    setSyncing(true);
    try {
      loadAllLocalStorageData();
      const [fbRes, sheetRes] = await Promise.allSettled([
        fetchFirestoreData(),
        fetchGoogleSheetsData()
      ]);

      const fbCount = fbRes.status === "fulfilled" ? fbRes.value.length : 0;
      const sheetCount = sheetRes.status === "fulfilled" ? sheetRes.value.length : 0;

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;
      setLastSyncTime(timeStr);

      if (manual) {
        showToast(`클라우드 동기화 완료 (Firebase: ${fbCount}건, 구글시트: ${sheetCount}건)`);
      }
    } catch (err: any) {
      console.error("Sync all cloud error:", err);
      if (manual) showToast("동기화 중 오류 발생: " + err.message, "error");
    } finally {
      setSyncing(false);
    }
  };

  // Initial mount: check in-app browser & auto-load data
  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/kakaotalk|line|instagram|fbav/i.test(ua)) {
      setIsKakaotalk(true);
    }
    loadAllLocalStorageData();
    // Fetch cloud data automatically in background
    syncAllCloudData(false);
  }, []);

  // Auto-refresh when entering admin dashboard
  useEffect(() => {
    if (currentView === "admin-dashboard" || currentView === "total-report") {
      syncAllCloudData(false);
    }
  }, [currentView]);

  // Sync Timer
  useEffect(() => {
    if (currentView === "assessment") {
      timerIntervalRef.current = setInterval(() => {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(timerIntervalRef.current!);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [currentView]);

  // Load question order (Shuffle)
  const initializeTestOrder = (isResume: boolean, resumeAnswers?: Record<number, number>, resumeIndex?: number, resumeTime?: number) => {
    if (isResume && resumeAnswers) {
      setUserAnswers(resumeAnswers);
      setCurrentQIndex(resumeIndex || 0);
      setRemainingTime(resumeTime || 1800);
      const storedOrder = localStorage.getItem("E7_SHUFFLED_ORDER");
      if (storedOrder) {
        try {
          setShuffledIndices(JSON.parse(storedOrder));
        } catch (e) {
          generateNewShuffledOrder();
        }
      } else {
        generateNewShuffledOrder();
      }
    } else {
      generateNewShuffledOrder();
    }
  };

  const generateNewShuffledOrder = () => {
    const order = Array.from({ length: QUESTIONS_FULL.length }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    setShuffledIndices(order);
    localStorage.setItem("E7_SHUFFLED_ORDER", JSON.stringify(order));
  };

  // Start Assessment or Resume check
  const handleInitializeSystem = () => {
    // If not authorized via 24-hour QR token and not authenticated admin, show QR Auth Gate Modal
    if (qrAuthStatus !== "AUTHORIZED" && !isAdminAuthenticated) {
      setShowAuthGateModal(true);
      return;
    }

    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.warn("Fullscreen request failed", err));
      }
    } catch (e) {
      console.warn(e);
    }
    
    const temp = localStorage.getItem("E7_TEMP_DATA");
    if (temp) {
      try {
        const parsed = JSON.parse(temp);
        setConfirmModal({
          message: "이전에 진행 중이던 검사 내역이 있습니다. 이어서 하시겠습니까?",
          onConfirm: () => {
            if (parsed.info) setCandidateInfo(parsed.info);
            setLang(parsed.lang || "kr");
            initializeTestOrder(true, parsed.answers, parsed.idx, parsed.time);
            setCurrentView("assessment");
            setConfirmModal(null);
          },
        });
        return;
      } catch (e) {
        localStorage.removeItem("E7_TEMP_DATA");
      }
    }
    setCurrentView("login");
  };

  const startNewTest = () => {
    initializeTestOrder(false);
    setUserAnswers({});
    setCurrentQIndex(0);
    setRemainingTime(1800);
    setCurrentView("assessment");
  };

  // Choose Answer on Likert Scale
  const handleSelectAnswer = (value: number) => {
    if (isNavigating) return;
    setIsNavigating(true);

    const realIdx = shuffledIndices[currentQIndex];
    const q = QUESTIONS_FULL[realIdx];
    const updated = { ...userAnswers, [q.id]: value };
    setUserAnswers(updated);

    // Save temporary data locally
    localStorage.setItem(
      "E7_TEMP_DATA",
      JSON.stringify({
        answers: updated,
        idx: currentQIndex,
        time: remainingTime,
        info: candidateInfo,
        lang: lang,
      })
    );

    if (currentQIndex < QUESTIONS_FULL.length - 1) {
      setTimeout(() => {
        setCurrentQIndex((prev) => prev + 1);
        setIsNavigating(false);
      }, 200);
    } else {
      setIsNavigating(false);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((prev) => prev - 1);
    }
  };

  // Auto Submit when Timer hits 0
  const handleAutoSubmit = () => {
    submitAssessment(true);
  };

  // Manual Submit
  const handleManualSubmit = () => {
    const realIdx = shuffledIndices[currentQIndex];
    const lastQ = QUESTIONS_FULL[realIdx];
    if (!userAnswers[lastQ.id]) {
      showToast("마지막 문항에 답변해주세요.", "error");
      return;
    }
    submitAssessment(false);
  };

  // Core Submit logic
  const submitAssessment = async (auto = false) => {
    setCurrentView("upload");
    const elapsedTime = 1800 - remainingTime;
    
    // Core Scoring calculations (Supports both single name/mononym and full names)
    const fullName = [candidateInfo.lastName, candidateInfo.firstName].filter(Boolean).join(" ").trim();
    const computed = calculateAll(fullName, userAnswers);
    let finalReliability = computed.reliability;
    let isTooFast = false;

    if (elapsedTime < 300) {
      if (computed.reliability.includes("V1") || computed.reliability.includes("V2")) {
        finalReliability = "주의 요망 (V3) - 속독 응답";
      }
      isTooFast = true;
    }

    const payload: AssessmentResult = {
      ...computed,
      id: candidateInfo.id,
      company: candidateInfo.company,
      date: getStandardDate(),
      reliability: finalReliability,
      isTooFast,
      source: "기기 직접 응시",
      lang: lang,
    };

    // 1. Save locally
    const currentLocals = [...localData, payload];
    setLocalData(currentLocals);
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(currentLocals));

    // Clear temporary cache
    localStorage.removeItem("E7_TEMP_DATA");
    localStorage.removeItem("E7_SHUFFLED_ORDER");

    // 2. Submit to Firebase (Firestore) and Google Sheets via secure proxy
    if (isOnline) {
      const saveToCloud = async () => {
        const sheetPayload = {
          date: payload.date,
          name: payload.name,
          id: payload.id,
          company: payload.company,
          source: "클라우드(시트)",
          total: payload.total,
          reliability: payload.reliability,
          decision: payload.decision,
          minScore: payload.minScore,
          ...payload.details,
        };
        // Flatten answers for Q1 - Q94 cols
        for (let i = 1; i <= 94; i++) {
          (sheetPayload as any)["Q" + i] = payload.answers[i] || "";
        }

        // Save to Firebase Firestore (Dual redundant: Server Endpoint + Client SDK)
        try {
          await fetch("/api/firestore-data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (apiFbErr) {
          console.warn("Server Firestore POST warning:", apiFbErr);
        }

        try {
          await addDoc(collection(firestoreDb, "assessments"), {
            ...payload,
            timestamp: new Date().toISOString()
          });
          console.log("Firebase document written");
        } catch (fbErr) {
          console.error("Error adding document to Firebase: ", fbErr);
        }

        try {
          await fetch("/api/sheets-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(sheetPayload),
          });
        } catch (sheetErr) {
          console.error("Error adding to Sheets: ", sheetErr);
        }
      };

      try {
        await Promise.race([
          saveToCloud(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000))
        ]);
      } catch (err) {
        console.warn("Save warning (timeout or error):", err);
      }
    }

    setTimeout(() => {
      setCurrentView("thankyou");
    }, 1000);
  };

  // Merge local, file, sheet, and firebase records removing duplicates safely
  const mergedData = useMemo(() => {
    const uniqueMap = new Map<string, AssessmentResult>();
    [...localData, ...fileData, ...sheetData, ...firebaseData].forEach((d) => {
      if (!d || (!d.id && !d.name)) return;
      const normId = formatCandidateId(d.id || "");
      const normName = formatCandidateName(d.name || "");
      const normDate = getYYYYMMDD(d.date || "");
      const key = `${normId}_${normName}_${normDate}`;

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, d);
      } else {
        const existing = uniqueMap.get(key)!;
        // Merge records: preserve docId, prefer richer answers & diagnosis
        const hasMoreAnswers = Object.keys(d.answers || {}).length >= Object.keys(existing.answers || {}).length;
        const merged: AssessmentResult = {
          ...existing,
          ...d,
          docId: d.docId || existing.docId,
          source: d.source || existing.source,
          answers: hasMoreAnswers ? d.answers : existing.answers,
          details: (d.details && Object.keys(d.details).length > 0) ? d.details : existing.details,
          mainDetails: (d.mainDetails && Object.keys(d.mainDetails).length > 0) ? d.mainDetails : existing.mainDetails,
        };
        uniqueMap.set(key, merged);
      }
    });
    return Array.from(uniqueMap.values());
  }, [localData, fileData, sheetData, firebaseData]);

  // Handle Search, Date and Grade Filters
  const filteredData = useMemo(() => {
    let list = [...mergedData];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) => 
        d.name.toLowerCase().includes(q) || 
        d.id.toLowerCase().includes(q) || 
        (d.company || "").toLowerCase().includes(q) || 
        (d.lang || "").toLowerCase().includes(q)
      );
    }
    if (filterDate) {
      list = list.filter((d) => getYYYYMMDD(d.date) === filterDate);
    }
    if (filterGrade !== "ALL") {
      list = list.filter((d) => d.decision.includes(filterGrade));
    }

    // Sorting
    list.sort((a, b) => {
      if (sortKey === "id") {
        const cmp = compareCandidateId(a.id, b.id);
        return sortOrder === "asc" ? cmp : -cmp;
      }
      let va = (a as any)[sortKey];
      let vb = (b as any)[sortKey];
      if (sortKey === "total") {
        va = parseFloat(va || 0);
        vb = parseFloat(vb || 0);
      } else if (sortKey === "date") {
        va = parseDateStrict(a.date).getTime();
        vb = parseDateStrict(b.date).getTime();
      } else {
        va = String(va || "").toLowerCase();
        vb = String(vb || "").toLowerCase();
      }
      return va < vb ? (sortOrder === "asc" ? -1 : 1) : va > vb ? (sortOrder === "asc" ? 1 : -1) : 0;
    });

    return list;
  }, [mergedData, searchQuery, filterDate, filterGrade, sortKey, sortOrder]);

  // Extract unique dates for filtering
  const uniqueDates = useMemo(() => {
    const dates = mergedData.map((d) => getYYYYMMDD(d.date)).filter((d) => d && d !== "-");
    return [...new Set(dates)].sort((a, b) => b.localeCompare(a));
  }, [mergedData]);

  // Sorting Header Trigger
  const triggerSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortOrder("desc");
    }
  };

  // Multi Delete Actions (Local & File data only)
  const handleDeleteSelected = () => {
    if (selectedKeys.length === 0) {
      showToast("삭제할 항목을 선택해주세요.", "error");
      return;
    }
    // Block sheet records
    const isSheetIncluded = filteredData.some(
      (d, idx) => selectedKeys.includes(getRecordKey(d, idx)) && d.source === "클라우드(시트)"
    );
    if (isSheetIncluded) {
      setCustomModal({
        title: "권한 제한",
        message: "클라우드(구글 시트)에 동기화된 내역은 대시보드에서 임의로 삭제할 수 없습니다. 시트 문서에서 삭제한 후 [SYNC] 버튼을 눌러주십시오.",
      });
      return;
    }

    setConfirmModal({
      message: `선택한 ${selectedKeys.length}개 항목을 삭제하시겠습니까?`,
      onConfirm: async () => {
        const remainingLocal = localData.filter((d, idx) => !selectedKeys.includes(getRecordKey(d, idx)));
        const remainingFile = fileData.filter((d, idx) => !selectedKeys.includes(getRecordKey(d, idx)));
        const remainingFirebase = firebaseData.filter((d, idx) => !selectedKeys.includes(getRecordKey(d, idx)));
        const remainingSheet = sheetData.filter((d, idx) => !selectedKeys.includes(getRecordKey(d, idx)));

        // Find if any are from Firestore and delete them
        const firestoreRecordsToDelete = firebaseData.filter((d, idx) => selectedKeys.includes(getRecordKey(d, idx)) && d.docId);
        for (const record of firestoreRecordsToDelete) {
          try {
            await fetch(`/api/firestore-data/${record.docId}`, { method: "DELETE" });
          } catch (e) {
            console.error("Failed to delete from Firestore", e);
          }
        }

        setFirebaseData(remainingFirebase);
        setLocalData(remainingLocal);
        setFileData(remainingFile);
        setSheetData(remainingSheet);
        localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(remainingLocal));
        setSelectedKeys([]);
        showToast("선택된 내역이 완전히 삭제되었습니다.");
        setConfirmModal(null);
      },
    });
  };

  const handleToggleRow = (key: string) => {
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedKeys(filteredData.map((d, idx) => getRecordKey(d, idx)));
    } else {
      setSelectedKeys([]);
    }
  };

  // Open Candidate Edit Modal
  const handleOpenEditModal = (item: AssessmentResult, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingResult(item);
    setEditForm({
      name: item.name || "",
      id: item.id || "",
      company: item.company || "",
      date: item.date || getStandardDate(),
      lang: item.lang || "kr",
    });
  };

  // Save Candidate Edit to Local DB and Firebase Firestore
  const handleSaveEdit = async () => {
    if (!editingResult) return;
    if (!editForm.name.trim()) {
      showToast("응시자 성명을 입력해주세요.", "error");
      return;
    }
    if (!editForm.id.trim()) {
      showToast("수험번호를 입력해주세요.", "error");
      return;
    }
    if (!editForm.company.trim()) {
      showToast("소속 업체명을 입력해주세요.", "error");
      return;
    }

    setIsSavingEdit(true);

    try {
      const updatedName = formatCandidateName(editForm.name);
      const updatedId = formatCandidateId(editForm.id);
      const updatedCompany = editForm.company.trim();
      const updatedDate = editForm.date.trim() || getStandardDate();
      const updatedLang = editForm.lang || editingResult.lang || "kr";

      const updatedRecord: AssessmentResult = {
        ...editingResult,
        name: updatedName,
        id: updatedId,
        company: updatedCompany,
        date: updatedDate,
        lang: updatedLang,
      };

      const isMatch = (d: AssessmentResult) => {
        if (editingResult.docId && d.docId) {
          return d.docId === editingResult.docId;
        }
        return (
          (d.id === editingResult.id && d.name === editingResult.name) ||
          (d.id === editingResult.id && d.company === editingResult.company) ||
          d.id === editingResult.id
        );
      };

      // 1. Update in firebaseData state immediately
      setFirebaseData((prev) => prev.map((d) => (isMatch(d) ? updatedRecord : d)));

      // 2. Update in localData and persist
      const newLocalData = localData.map((d) => (isMatch(d) ? updatedRecord : d));
      setLocalData(newLocalData);
      localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(newLocalData));

      // 3. Update in sheetData
      setSheetData((prev) => prev.map((d) => (isMatch(d) ? updatedRecord : d)));

      // 4. Update in fileData
      setFileData((prev) => prev.map((d) => (isMatch(d) ? updatedRecord : d)));

      // 5. Update Firebase Firestore (Server API with safe timeout)
      const firestorePayload = {
        name: updatedName,
        id: updatedId,
        company: updatedCompany,
        date: updatedDate,
        lang: updatedLang,
      };

      const cloudSavePromise = (async () => {
        try {
          if (editingResult.docId) {
            await fetch(`/api/firestore-data/${editingResult.docId}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(firestorePayload),
            });
          } else {
            // Find by candidateId query or save as new record
            const queryRes = await fetch("/api/firestore-data/update-by-query", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                candidateId: editingResult.id,
                updates: firestorePayload,
              }),
            });
            const queryJson = await queryRes.json().catch(() => ({}));
            if (!queryJson.updatedCount || queryJson.updatedCount === 0) {
              await fetch("/api/firestore-data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...updatedRecord, ...firestorePayload }),
              });
            }
          }
        } catch (apiErr) {
          console.warn("Server Firestore save warning:", apiErr);
        }
      })();

      await Promise.race([
        cloudSavePromise,
        new Promise((resolve) => setTimeout(resolve, 2000))
      ]);

      // 6. If viewingResult is currently active, update viewingResult
      if (
        viewingResult &&
        (viewingResult.id === editingResult.id || (editingResult.docId && viewingResult.docId === editingResult.docId))
      ) {
        setViewingResult(updatedRecord);
      }

      showToast("응시자 정보가 성공적으로 수정 및 저장되었습니다.");
      setEditingResult(null);
    } catch (err: any) {
      console.error(err);
      showToast("수정 저장 중 오류가 발생했습니다: " + err.message, "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Authenticate Admin Area
  const handleAdminAuth = () => {
    if (adminPassword === "3269") {
      setAdminPassword("");
      setIsAdminAuthenticated(true);
      setQrAuthStatus("AUTHORIZED");
      setCurrentView("admin-dashboard");
      syncAllCloudData(false);
      showToast("🔐 시스템 관리자 인증 완료", "info");
    } else {
      showToast("비밀번호가 올바르지 않습니다.", "error");
    }
  };

  // Instant Simulation: Fast-forward answers, calculate scores, and immediately view full report
  const handleInstantSimulate = async (simResult: AssessmentResult) => {
    // 1. Save to local data & localStorage
    const updatedLocals = [simResult, ...localData];
    setLocalData(updatedLocals);
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(updatedLocals));

    // 2. Open detailed report immediately
    setViewingResult(simResult);

    // 3. Save to Firebase Firestore in background
    if (isOnline) {
      try {
        await fetch("/api/firestore-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(simResult),
        });
        setFirebaseData((prev) => [simResult, ...prev]);
      } catch (e) {
        console.warn("Simulated test firestore save warning:", e);
      }
    }
  };

  // Direct Live Assessment from Admin Mode (Bypasses QR requirement)
  const handleDirectLiveTest = (info: { firstName: string; lastName: string; id: string; company: string; lang: string }) => {
    setCandidateInfo({
      firstName: info.firstName,
      lastName: info.lastName,
      id: info.id,
      company: info.company,
      date: new Date().toISOString().slice(0, 10),
    });
    setLang(info.lang || "kr");
    setIsAdminAuthenticated(true);
    setQrAuthStatus("AUTHORIZED");
    startNewTest();
  };

  // Excel/JSON Data Backup Imports
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    if (file.name.endsWith(".json")) {
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target?.result as string);
          const records = Array.isArray(parsed) ? parsed : [parsed];
          const mapped = records.map((r) => ({ ...r, source: "JSON 파일 백업" }));
          setFileData((prev) => [...prev, ...mapped]);
          showToast("JSON 백업 데이터 복구 완료");
        } catch {
          showToast("JSON 파일 형식이 올바르지 않습니다.", "error");
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (evt) => {
        try {
          const u8 = new Uint8Array(evt.target?.result as ArrayBuffer);
          const wb = XLSX.read(u8, { type: "array" });
          const sheetName = wb.SheetNames[0];
          const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1 });
          
          // Match standard headers and map
          let headerIdx = rawRows.findIndex(
            (r: any) => r && r.some((c: any) => String(c).match(/(총점|종합점수|Total)/i))
          );
          if (headerIdx !== -1) {
            const headers = rawRows[headerIdx] as string[];
            const parsedResults: AssessmentResult[] = [];
            
            const findColIndex = (targets: string[]) =>
              headers.findIndex((h) => targets.some((t) => String(h).toUpperCase().includes(t.toUpperCase())));

            const nameIdx = findColIndex(["성명", "이름", "Name"]);
            const compIdx = findColIndex(["업체", "소속", "Company", "Agency"]);
            const idIdx = findColIndex(["ID", "수험번호", "Candidate"]);
            const totalIdx = findColIndex(["종합점수", "총점", "Total"]);
            const decIdx = findColIndex(["판정", "등급", "Grade", "Decision"]);
            const relIdx = findColIndex(["신뢰도", "Reliability"]);
            const dateIdx = findColIndex(["일시", "날짜", "Date"]);

            for (let i = headerIdx + 1; i < rawRows.length; i++) {
              const r = rawRows[i] as any[];
              if (!r || !r[nameIdx]) continue;

              const details: Record<string, number> = {};
              ["C1", "C2", "R1", "R2", "T1", "T2", "E1", "E2", "S1", "S2", "A1", "A2"].forEach((k) => {
                const col = headers.findIndex((h) => String(h).toUpperCase() === k);
                if (col !== -1) {
                  details[k] = parseFloat(r[col]) || 0;
                }
              });

              const answers: Record<number, number> = {};
              for (let q = 1; q <= 94; q++) {
                const qKey = headers.findIndex((h) => {
                  if (!h) return false;
                  const c = String(h).replace(/\s/g, "").toUpperCase();
                  return c === "Q" + q || c === "문항" + q || c === String(q);
                });
                if (qKey !== -1) {
                  const val = parseInt(r[qKey]);
                  if (!isNaN(val) && val >= 1 && val <= 5) {
                    answers[q] = val;
                  }
                }
              }

              parsedResults.push({
                source: "Excel 업로드",
                name: formatCandidateName(String(r[nameIdx] || "")),
                id: formatCandidateId(String(r[idIdx] || "")),
                company: r[compIdx] || "-",
                total: parseFloat(r[totalIdx]) || 0,
                decision: r[decIdx] || "-",
                reliability: r[relIdx] || "-",
                details,
                mainDetails: {
                  C: Math.round(((details.C1 || 0) + (details.C2 || 0)) / 2),
                  R: Math.round(((details.R1 || 0) + (details.R2 || 0)) / 2),
                  S: Math.round(((details.S1 || 0) + (details.S2 || 0)) / 2),
                  T: Math.round(((details.T1 || 0) + (details.T2 || 0)) / 2),
                  E: Math.round(((details.E1 || 0) + (details.E2 || 0)) / 2),
                  A: Math.round(((details.A1 || 0) + (details.A2 || 0)) / 2),
                },
                minScore: Math.min(...Object.values(details)),
                date: r[dateIdx] || getStandardDate(),
                answers,
              });
            }
            setFileData((prev) => [...prev, ...parsedResults]);
            showToast("Excel 백업 데이터 로드 완료");
          } else {
            showToast("정상적인 엑셀 형식을 판별할 수 없습니다.", "error");
          }
        } catch {
          showToast("Excel 파일 로딩 실패", "error");
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // Export excel data
  const handleExcelExport = () => {
    if (filteredData.length === 0) {
      showToast("엑셀 파일로 출력할 데이터가 없습니다.", "error");
      return;
    }
    const worksheetData = filteredData.map((d) => {
      const flat = {
        업체명: d.company,
        국가: (d.lang || "N/A").toUpperCase(),
        수험번호: formatCandidateId(d.id),
        성명: formatCandidateName(d.name),
        응시일자: d.date,
        종합점수: d.total,
        종합등급: d.decision,
        신뢰판별: d.reliability,
        최저점수: d.minScore,
        ...d.details,
      };
      return flat;
    });
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assessment_List");
    XLSX.writeFile(wb, `E7_Samho_Personality_Assessment_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("엑셀 다운로드 완료");
  };

  // Local JSON Backup download
  const handleDownloadLocalBackup = () => {
    if (localData.length === 0) {
      showToast("백업할 로컬 데이터가 없습니다.", "error");
      return;
    }
    const jsonStr = JSON.stringify(localData);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `E7_Personality_Backup_Local.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("로컬 JSON 백업 다운로드 완료");
  };

  // QR code management modal trigger
  const handleShowQRCode = () => {
    setShowQrAdminModal(true);
  };

  const handlePrintReport = () => {
    const isInIframe = window.self !== window.top;
    if (isInIframe) {
      setConfirmModal({
        message: `💡 [안내] 현재 미리보기 화면(iframe) 내부에서는 브라우저 보안 정책에 의해 인쇄창 로드가 차단될 수 있습니다.\n\n해결 방법:\n1. 우측 상단의 '새 탭에서 열기' (↗) 버튼을 클릭해 주세요.\n2. 새 탭에서 결과 보고서 조회 후 [인쇄/PDF 저장]을 누르면 정상적으로 작동합니다.\n\n이대로 진행해 보시겠습니까?`,
        onConfirm: () => {
          setConfirmModal(null);
          showToast("인쇄 신호를 전송합니다...");
          setTimeout(() => {
            window.focus();
            window.print();
          }, 300);
        }
      });
      return;
    }

    showToast("인쇄 창을 로드합니다. '배경 그래픽 포함' 옵션을 켜주시면 디자인이 깔끔하게 나옵니다.");
    setTimeout(() => {
      window.focus();
      window.print();
    }, 500);
  };

  // Helper selectors
  const activeQuestion = useMemo(() => {
    if (shuffledIndices.length === 0) return null;
    return QUESTIONS_FULL[shuffledIndices[currentQIndex]];
  }, [shuffledIndices, currentQIndex]);

  // Unique average calculations for all dashboard items
  const averageStatistics = useMemo(() => {
    const list = [...mergedData].filter((d) => !d.reliability.includes("V4") && !d.reliability.includes("V5"));
    const baseline = list.length > 0 ? list : mergedData.length > 0 ? mergedData : [];
    
    const stats: Record<string, string> = {};
    const factors = ["C1", "C2", "R1", "R2", "T1", "T2", "E1", "E2", "S1", "S2", "A1", "A2"];
    
    factors.forEach((f) => {
      const vals = baseline.map((d) => d.details[f] || 0);
      const avg = vals.reduce((acc, cur) => acc + cur, 0) / (vals.length || 1);
      stats[f] = avg.toFixed(1);
    });
    return stats;
  }, [mergedData]);

  return (
    <div className="flex flex-col min-h-screen relative z-0 bg-[#0c1424]">
      {/* Universal Faint Shipyard Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat opacity-[0.35] pointer-events-none z-0 print:hidden" 
        style={{ backgroundImage: "url('/yard.png')" }} 
      />
      <div className="grid-pattern flex flex-col min-h-screen relative z-10">
        <div className="scanline" />

      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-[9999] bg-[#0c1424] border-l-4 border-[#0ea5e9] text-white py-3 px-6 rounded shadow-2xl animate-fade-in flex items-center gap-3 font-sans text-sm no-print">
          <AlertCircle className="w-5 h-5 text-[#0ea5e9]" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Kakaotalk warning modal */}
      {isKakaotalk && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[9999] flex flex-col items-center justify-center p-4">
          <div className="glass-premium cyber-bracket p-8 max-w-sm w-full text-center border-t border-t-yellow-500/50">
            <div className="text-4xl mb-4 text-yellow-500">⚠️</div>
            <h2 className="text-xl font-mono text-yellow-500 mb-4 tracking-widest font-bold">BROWSER ERROR</h2>
            <p className="text-sm font-sans mb-6 text-white/90 leading-relaxed">
              인앱 브라우저(카카오톡, 인스타 등)에서는 파일 내보내기, 인쇄, 차트 등이 정상 작동하지 않을 수 있습니다.
            </p>
            <div className="text-left space-y-3 mb-6 bg-black/50 p-4 rounded text-xs border border-white/10 font-sans text-slate-300">
              <p>1. 우측 상단 <span className="text-yellow-500">⋮</span> 또는 <span className="text-yellow-500">···</span> 버튼 클릭</p>
              <p>2. <span className="text-yellow-500">'다른 브라우저로 열기'</span> 또는 <span className="text-yellow-500">'브라우저에서 열기'</span> 선택</p>
              <p>3. Chrome 또는 Safari에서 정상 이용 가능</p>
            </div>
            <button
              onClick={() => setIsKakaotalk(false)}
              className="text-xs text-slate-500 underline hover:text-white transition cursor-pointer"
            >
              알림 닫고 계속하기
            </button>
          </div>
        </div>
      )}

      {/* Core Universal Modals */}
      {customModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className="glass-premium cyber-bracket p-8 max-w-sm w-full text-center">
            <div className="text-4xl mb-4 text-blue-400">ℹ️</div>
            <h3 className="text-lg font-mono text-blue-400 mb-3 tracking-widest font-bold">SYSTEM MESSAGE</h3>
            <p className="text-slate-300 mb-6 text-sm leading-relaxed font-sans font-medium break-keep">
              {customModal.message}
            </p>
            {customModal.title.includes("QR") && (
              <div className="flex justify-center mb-6 bg-white p-3 rounded border border-cyan-500/30">
                <canvas id="canvas-qrcode" />
              </div>
            )}
            <button
              onClick={() => setCustomModal(null)}
              className="btn-premium w-full py-3 font-mono text-sm tracking-widest rounded"
            >
              ACKNOWLEDGE
            </button>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
          <div className={`glass-premium cyber-bracket p-8 max-w-sm w-full text-center border-t ${confirmModal.message.startsWith("💡") ? "border-t-blue-500/30" : "border-t-red-500/30"}`}>
            <div className="text-4xl mb-4">{confirmModal.message.startsWith("💡") ? "💡" : "⚠️"}</div>
            <h3 className={`text-lg font-mono mb-2 tracking-widest font-bold ${confirmModal.message.startsWith("💡") ? "text-blue-400" : "text-red-400"}`}>
              {confirmModal.message.startsWith("💡") ? "SYSTEM NOTICE" : "CRITICAL ACTION"}
            </h3>
            <p className="text-slate-300 mb-8 text-sm leading-relaxed font-sans font-medium break-keep whitespace-pre-line text-left">
              {confirmModal.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 glass text-slate-400 py-3 rounded font-mono hover:bg-slate-800 transition text-sm border border-slate-700 cursor-pointer"
              >
                CANCEL
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-3 rounded font-mono transition text-sm cursor-pointer ${
                  confirmModal.message.startsWith("💡")
                    ? "bg-blue-950/40 border border-blue-500/50 text-blue-400 hover:bg-blue-900/60 shadow-[0_0_15px_rgba(59,130,246,0.2)]"
                    : "bg-red-950/40 border border-red-500/50 text-red-400 hover:bg-red-900/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                }`}
              >
                {confirmModal.message.startsWith("💡") ? "PROCEED" : "CONFIRM"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Information Edit Modal */}
      {editingResult && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] no-print">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-slate-800 animate-fade-in font-sans">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 sm:p-6 flex justify-between items-center border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-lg font-bold">
                  ✏️
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-display tracking-tight text-white flex items-center gap-2">
                    응시자 정보 수정 <span className="text-xs text-amber-400 font-mono">(EDIT INFO)</span>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    ID: {editingResult.id} | {editingResult.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingResult(null)}
                className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <div className="p-5 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-900 text-xs leading-relaxed flex items-start gap-2.5">
                <span className="text-base">💡</span>
                <div>
                  <strong>알림:</strong> 정보를 수정하면 <strong>로컬 DB 및 Firebase 클라우드 DB</strong>에 즉시 반영됩니다. (검사 점수 및 문항별 응답 데이터는 안전하게 유지됩니다.)
                </div>
              </div>

              {/* Form fields */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider font-mono">
                  소속 업체명 (COMPANY / AGENCY) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, company: e.target.value }))}
                  placeholder="예: 현대삼호중공업 협력사명"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none text-sm text-slate-900 transition font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider font-mono">
                    수험번호 (CANDIDATE ID) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.id}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, id: e.target.value }))}
                    placeholder="예: TM-001, A-01"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none text-sm text-slate-900 transition font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider font-mono">
                    성명 (NAME) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="예: NGUYEN VAN A, 홍길동"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none text-sm text-slate-900 transition font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider font-mono">
                    응시일자 (DATE) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editForm.date}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, date: e.target.value }))}
                    placeholder="YYYY.MM.DD"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none text-sm text-slate-900 transition font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider font-mono">
                    응시 언어 / 국적 (NATION)
                  </label>
                  <select
                    value={editForm.lang}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, lang: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:border-blue-500 outline-none text-sm text-slate-900 transition font-bold cursor-pointer"
                  >
                    <option value="kr">한국어 (KR)</option>
                    <option value="vn">베트남어 (VN)</option>
                    <option value="id">인도네시아어 (ID)</option>
                    <option value="np">네팔어 (NP)</option>
                    <option value="en">영어 (EN)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingResult(null)}
                disabled={isSavingEdit}
                className="px-5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition cursor-pointer disabled:opacity-50"
              >
                취소 (CANCEL)
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingEdit ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>저장 및 DB 반영 (SAVE)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal for applicant mobile access */}
      {showQrAdminModal && (
        <QRManagementModal
          onClose={() => setShowQrAdminModal(false)}
          showToast={showToast}
        />
      )}

      {/* QR Auth Gate Modal when non-authorized user tries to start */}
      {showAuthGateModal && (
        <QRAuthGateModal
          onSuccess={(data) => {
            setQrAuthStatus("AUTHORIZED");
            setQrTokenInfo(data);
            if (data.company) {
              setCandidateInfo((prev) => ({
                ...prev,
                company: data.company,
                date: data.examDate || prev.date || new Date().toISOString().slice(0, 10),
              }));
            }
            sessionStorage.setItem("hd_e7_qr_session", JSON.stringify(data));
            setShowAuthGateModal(false);
            setCurrentView("login");
          }}
          onAdminClick={() => {
            setShowAuthGateModal(false);
            setCurrentView("admin-login");
          }}
          onClose={() => setShowAuthGateModal(false)}
          showToast={showToast}
        />
      )}

      {/* QR Expired View */}
      {qrAuthStatus === "EXPIRED" && (
        <QRExpiredView
          expiresAt={qrTokenInfo?.expiresAt}
          errorMessage={qrAuthError || undefined}
          onRetryWithCode={() => {
            setQrAuthStatus("UNAUTHORIZED");
            setShowAuthGateModal(true);
          }}
          onAdminClick={() => {
            setQrAuthStatus("UNAUTHORIZED");
            setCurrentView("admin-login");
          }}
        />
      )}

      {/* Admin Test Simulator Modal */}
      {showAdminSimulator && (
        <AdminTestSimulatorModal
          onClose={() => setShowAdminSimulator(false)}
          onDirectLiveTest={handleDirectLiveTest}
          onInstantSimulate={handleInstantSimulate}
          showToast={showToast}
        />
      )}

      {/* ----------------- VIEW: HOME ----------------- */}
      {currentView === "home" && (
        <div className="fixed inset-0 flex flex-col items-center justify-center p-4 z-20 overflow-hidden">
          {/* Background image yard.png */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0" 
            style={{ backgroundImage: "url('/yard.png')" }} 
          />
          {/* Overlay to darken background for readability */}
          <div className="absolute inset-0 bg-[#001424]/60 backdrop-blur-[2px] z-0" />
          
          <div className="glass-premium cyber-bracket p-6 sm:p-10 md:p-14 max-w-2xl w-full text-center relative z-10 shadow-2xl border-t-4 border-t-[#009539]">
            {/* Top-Right Navigation buttons */}
            <div className="absolute top-4 right-4 z-50 flex bg-slate-900/90 border border-slate-700/60 p-1 rounded-lg gap-1.5 shadow-xl backdrop-blur-md">
              <button
                onClick={handleShowQRCode}
                className="glass px-3 py-1.5 text-[11px] border border-cyan-500/30 rounded text-cyan-300 hover:text-white font-mono transition flex items-center gap-1.5 justify-center glow-cyan cursor-pointer"
                title="모바일 QR 코드"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR_CODE</span>
              </button>
              <button
                onClick={() => setCurrentView("admin-login")}
                className="glass px-3 py-1.5 text-[11px] border border-blue-500/30 rounded text-blue-300 hover:text-white font-mono transition flex items-center gap-1.5 glow-blue cursor-pointer"
                title="시스템 관리자 로그인"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>SYS_ADMIN</span>
              </button>
            </div>

            <div className="relative z-10 mb-6 sm:mb-8">
              <div className="inline-flex items-center gap-2 bg-[#002c5f]/60 px-3.5 py-1.5 rounded-full border border-blue-400/40 mb-4 sm:mb-6 shadow-sm">
                <span className="w-2 h-2 bg-[#009539] rounded-full animate-pulse shadow-[0_0_8px_#009539]" />
                <span className="text-[10px] font-mono text-white tracking-[0.2em] font-bold">HR_EVALUATION_SYSTEM</span>
              </div>
              
              <div className="mb-4 sm:mb-6 border-b border-white/20 pb-5 flex flex-col items-center justify-center">
                <img src="/ci.png" alt="HD HYUNDAI SAMHO" className="h-10 sm:h-12 md:h-14 lg:h-16 object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.9)]" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextElementSibling?.classList.remove('hidden'); }} />
                <div id="fallback-logo" className="hidden text-white font-display font-extrabold text-lg sm:text-xl md:text-2xl lg:text-3xl tracking-widest mt-3">
                  HD HYUNDAI SAMHO
                </div>
              </div>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-white mb-2 sm:mb-3 tracking-tighter leading-tight break-keep font-sans">
                E-7 외국인 근로자 인성검사
                <span className="text-[#009539] font-sans font-bold tracking-widest mt-2 block text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl drop-shadow-md">
                  PERSONALITY ASSESSMENT
                </span>
              </h1>
            </div>

            <div className="relative z-10 flex flex-col gap-3.5 max-w-[300px] sm:max-w-xs mx-auto w-full">
              <button
                onClick={handleInitializeSystem}
                className="w-full py-4 text-[15px] font-sans font-bold tracking-widest flex items-center justify-center gap-3 rounded-xl text-white shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer bg-gradient-to-r from-[#002c5f] to-[#009539] hover:shadow-[0_0_25px_rgba(0,149,57,0.5)]"
              >
                <span>검사 시작하기</span>
                <ArrowRight className="w-4 h-4 text-white animate-bounce-horizontal" />
              </button>

              <div className="flex justify-center gap-2 mt-1">
                {["KO", "VN", "ID", "EN", "NP"].map((l) => (
                  <span key={l} className="py-1 rounded bg-white/5 border border-white/10 text-[10px] text-slate-300 font-mono font-bold shadow-sm inline-block w-[40.3333px] text-center">
                    {l}
                  </span>
                ))}
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-5 border-t border-slate-700/50 flex justify-between items-center text-[9px] sm:text-[10px] font-mono text-slate-400 tracking-[0.2em]">
              <div className="flex items-center gap-2">
                <span className="text-[#009539]">●</span>
                <span>LOCAL_DB: <span className="text-white font-bold">{localData.length}</span></span>
              </div>
              <div className="flex items-center gap-1.5">
                {isOnline ? (
                  <span className="text-blue-400">SECURE ONLINE</span>
                ) : (
                  <span className="text-red-400 animate-pulse font-bold">OFFLINE</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- VIEW: LOGIN ----------------- */}
      {currentView === "login" && (
        <div className="flex-grow flex flex-col items-center justify-center p-4 min-h-screen relative overflow-hidden">
           <div className="glass-premium cyber-bracket p-6 sm:p-10 max-w-lg w-full relative overflow-hidden shadow-2xl">
            {/* Subtle background glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="text-center mb-8 relative z-10">
              <div className="inline-flex items-center justify-center gap-2 text-blue-400 text-[10px] font-mono tracking-widest mb-3 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                IDENTIFICATION
              </div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-display font-bold text-white tracking-tight">
                {UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].title}
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm mt-2">Please provide your details to begin the assessment.</p>
            </div>
            
            <div className="space-y-5 max-w-md mx-auto relative z-10">
              <div className="pb-5 border-b border-slate-700/50">
                <label className="block text-[11px] font-bold text-slate-400 mb-3 tracking-wider text-center uppercase">
                  {UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].langSelect}
                </label>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { id: "kr", flagCode: "kr", label: "KOR" },
                    { id: "vn", flagCode: "vn", label: "VIE" },
                    { id: "id", flagCode: "id", label: "INA" },
                    { id: "en", flagCode: "us", label: "ENG" },
                    { id: "np", flagCode: "np", label: "NEP" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setLang(item.id)}
                      className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl border transition-all duration-300 ${
                        lang === item.id 
                          ? "bg-blue-500/10 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)] transform scale-105" 
                          : "bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-500"
                      }`}
                    >
                      <img src={`https://flagcdn.com/w40/${item.flagCode}.png`} width="24" height="16" alt={item.label} className="mb-1.5 shadow-sm rounded-sm" />
                      <span className={`text-[11px] font-bold tracking-wider ${lang === item.id ? "text-blue-400" : "text-slate-300"}`}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {lang && (
                <>
                  {candidateInfo.company ? (
                    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 flex justify-between items-center text-xs shadow-inner">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                          {UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].companyLabel}
                        </span>
                        <span className="text-sm font-black text-white">{candidateInfo.company}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                          검사 일자
                        </span>
                        <span className="text-xs font-mono font-bold text-cyan-400">
                          {candidateInfo.date || new Date().toISOString().slice(0, 10)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5 tracking-wider ml-1">
                        {UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].companyLabel}
                      </label>
                      <input
                        type="text"
                        value={candidateInfo.company}
                        onChange={(e) => setCandidateInfo({ ...candidateInfo, company: e.target.value })}
                        className="w-full bg-slate-900/80 border border-slate-700 text-white rounded-lg px-4 py-3 sm:py-3.5 text-[15px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 shadow-inner"
                        placeholder={UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].companyPlaceholder}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5 tracking-wider ml-1">
                        {UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].lastNameLabel}
                      </label>
                      <input
                        type="text"
                        value={candidateInfo.lastName}
                        onChange={(e) => setCandidateInfo({ ...candidateInfo, lastName: formatCandidateName(e.target.value) })}
                        className="w-full bg-slate-900/80 border border-slate-700 text-white rounded-lg px-4 py-3 sm:py-3.5 text-[15px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 shadow-inner"
                        placeholder={UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].lastNamePlaceholder}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1.5 tracking-wider ml-1">
                        {UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].firstNameLabel}
                      </label>
                      <input
                        type="text"
                        value={candidateInfo.firstName}
                        onChange={(e) => setCandidateInfo({ ...candidateInfo, firstName: formatCandidateName(e.target.value) })}
                        className="w-full bg-slate-900/80 border border-slate-700 text-white rounded-lg px-4 py-3 sm:py-3.5 text-[15px] focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 shadow-inner"
                        placeholder={UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].firstNamePlaceholder}
                      />
                    </div>
                  </div>
                  {lang === "id" && (
                    <p className="text-[11px] text-cyan-300 bg-cyan-950/40 border border-cyan-800/60 rounded-lg p-2.5 leading-relaxed font-sans">
                      💡 <strong>Catatan:</strong> Jika Anda hanya memiliki satu kata nama (tanpa marga/nama belakang), cukup isi pada kolom <strong>Nama Lengkap / Nama Depan</strong> saja.
                    </p>
                  )}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1.5 tracking-wider ml-1">
                      {UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].idLabel}
                    </label>
                    <input
                      type="text"
                      value={candidateInfo.id}
                      onChange={(e) => setCandidateInfo({ ...candidateInfo, id: formatCandidateId(e.target.value) })}
                      className="w-full bg-slate-900/80 border border-slate-700 text-white rounded-lg px-4 py-3 sm:py-3.5 font-mono text-[15px] uppercase tracking-widest focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-slate-600 shadow-inner"
                      placeholder={UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].idPlaceholder}
                    />
                  </div>
                </>
              )}
            </div>
            
            <div className="mt-8 flex gap-3 max-w-sm mx-auto relative z-10">
              <button
                onClick={() => setCurrentView("home")}
                className="flex-1 bg-transparent hover:bg-slate-800 text-slate-400 py-3.5 rounded-xl transition border border-slate-700 font-bold text-xs tracking-widest cursor-pointer"
              >
                {UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].abort}
              </button>
              <button
                onClick={() => {
                  if (!lang) {
                    showToast("Please select a language first.", "error");
                    return;
                  }
                  const hasName = Boolean(candidateInfo.firstName.trim() || candidateInfo.lastName.trim());
                  if (!hasName || !candidateInfo.id.trim() || !candidateInfo.company.trim()) {
                    const msg = lang === "kr" ? "성명, 수험번호, 업체명을 모두 입력해주세요." : 
                                lang === "vn" ? "Vui lòng nhập đầy đủ tên, số báo danh và tên công ty." :
                                lang === "id" ? "Harap masukkan nama, nomor peserta, dan nama perusahaan." :
                                lang === "np" ? "कृपया आफ्नो नाम, आईडी, र कम्पनीको नाम प्रविष्ट गर्नुहोस्।" :
                                "Please enter your name, ID, and company name.";
                    showToast(msg, "error");
                    return;
                  }
                  setCurrentView("guide");
                }}
                className={`flex-[2] py-3.5 font-bold text-xs tracking-widest rounded-xl transition-all shadow-lg text-white ${
                  !lang || !(candidateInfo.firstName.trim() || candidateInfo.lastName.trim()) || !candidateInfo.id.trim() || !candidateInfo.company.trim()
                    ? "bg-blue-600/50 opacity-50 cursor-not-allowed" 
                    : "bg-blue-600 hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-[0_10px_20px_rgba(37,99,235,0.3)]"
                }`}
              >
                {UI_TEXT[(lang || "en") as keyof typeof UI_TEXT].proceed}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- VIEW: GUIDE ----------------- */}
      {currentView === "guide" && (
        <div className="flex-grow flex flex-col items-center justify-center p-4 min-h-screen">
          <div className="glass-premium cyber-bracket p-6 sm:p-10 md:p-12 max-w-lg w-full">
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display font-bold text-white mb-6 sm:mb-8 text-center tracking-widest border-b border-slate-800/50 pb-4 glow-text-cyan">
              {GUIDE_TEXTS[lang]?.title || "SYSTEM GUIDE"}
            </h2>
            
            <div className="space-y-4 sm:space-y-5 bg-black/40 p-4 sm:p-6 rounded border border-slate-800 mb-8 sm:mb-10 shadow-inner">
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border border-blue-500/50 flex items-center justify-center text-blue-400 font-mono text-base sm:text-lg bg-blue-900/20 glow-blue">T_</div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-blue-400 font-mono tracking-widest mb-1">{GUIDE_TEXTS[lang]?.timeLabel || "TIME_LIMIT"}</p>
                  <p className="font-mono text-white text-lg sm:text-xl md:text-2xl font-bold">{GUIDE_TEXTS[lang]?.timeVal || "30:00"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 sm:gap-5">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border border-blue-500/50 flex items-center justify-center text-blue-400 font-mono text-base sm:text-lg bg-blue-900/20 glow-blue">Q_</div>
                <div>
                  <p className="text-[9px] sm:text-[10px] text-blue-400 font-mono tracking-widest mb-1">{GUIDE_TEXTS[lang]?.countLabel || "DATA_POINTS"}</p>
                  <p className="font-mono text-white text-lg sm:text-xl md:text-2xl font-bold">{GUIDE_TEXTS[lang]?.countVal || "94"}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 sm:gap-5 pt-4 sm:pt-5 border-t border-slate-800/50 mt-2">
                <div className="w-10 h-10 sm:w-12 sm:h-12 border border-yellow-500/50 flex items-center justify-center text-yellow-500 font-mono text-base sm:text-lg bg-yellow-900/20">!_</div>
                <div className="flex-1">
                  <p className="text-[9px] sm:text-[10px] text-yellow-500 font-mono tracking-widest mb-1">{GUIDE_TEXTS[lang]?.warnLabel || "CRITICAL_WARNING"}</p>
                  <p className="font-sans text-slate-300 text-xs sm:text-sm leading-relaxed break-keep" dangerouslySetInnerHTML={{ __html: GUIDE_TEXTS[lang]?.warnVal || "" }} />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={() => setCurrentView("login")}
                className="flex-1 glass border border-slate-700 text-slate-400 py-3 sm:py-4 rounded font-mono text-xs sm:text-sm tracking-widest hover:bg-slate-800 transition cursor-pointer"
              >
                BACK
              </button>
              <button
                onClick={startNewTest}
                className="btn-premium flex-[2] py-3 sm:py-4 font-display font-bold text-sm sm:text-base tracking-widest rounded"
              >
                {GUIDE_TEXTS[lang]?.btn || "START EVALUATION"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- VIEW: ASSESSMENT ----------------- */}
      {currentView === "assessment" && activeQuestion && (
        <div className="flex-grow flex flex-col max-w-5xl mx-auto w-full p-2 md:p-4 min-h-screen justify-between">
          <div className="w-full pt-2 pb-3 px-1">
            <div className="glass-premium cyber-bracket px-4 py-3 md:p-5 flex justify-between items-center mb-4">
              <div className="flex items-center">
                {currentQIndex > 0 && (
                  <button
                    onClick={handlePrevQuestion}
                    className="mr-5 text-cyan-400 font-mono text-xl hover:text-cyan-300 transition hover:-translate-x-1 p-2 glass rounded border border-slate-700 cursor-pointer"
                  >
                    &lt;
                  </button>
                )}
                <div className="flex flex-col">
                  <span className="text-[10px] md:text-xs text-cyan-50 font-bold font-mono tracking-[0.2em] mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">PROGRESS</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl md:text-4xl font-mono text-cyan-50 font-black glow-text-cyan drop-shadow-[0_0_10px_rgba(34,211,238,0.9)]">
                      {String(currentQIndex + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm sm:text-base md:text-lg text-white font-bold font-mono drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]">/ 94</span>
                  </div>
                </div>
              </div>
              <div className="border border-cyan-400/40 bg-[#0a101d]/65 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 md:px-5 md:py-3 rounded flex items-center gap-2 sm:gap-3 glow-cyan shadow-[0_0_15px_rgba(34,211,238,0.25)]">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-400 rounded-full animate-pulse" />
                <span className={`font-mono text-lg sm:text-xl md:text-2xl tracking-wider font-black ${remainingTime <= 300 ? "text-red-400 animate-pulse" : "text-cyan-200"}`}>
                  {String(Math.floor(remainingTime / 60)).padStart(2, "0")}:{String(remainingTime % 60).padStart(2, "0")}
                </span>
              </div>
            </div>
            
            <div className="w-full bg-slate-950 h-2 overflow-hidden border border-slate-700/80 rounded-full">
              <div
                className="bg-gradient-to-r from-blue-600 to-cyan-400 h-full transition-all duration-300 shadow-[0_0_15px_rgba(6,182,212,0.8)]"
                style={{ width: `${(currentQIndex / 94) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex-grow flex flex-col justify-center items-center py-4">
            <div className="w-full glass-premium cyber-bracket p-4 sm:p-8 md:p-12 lg:p-16 text-center flex flex-col justify-between min-h-[300px] sm:min-h-[380px] max-w-4xl">
              <div className="flex-grow flex flex-col justify-center items-center">
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white mb-4 md:mb-6 leading-snug sm:leading-tight break-keep font-sans drop-shadow-lg">
                  {lang === "vn" ? activeQuestion.vn : lang === "en" ? activeQuestion.en : lang === "id" ? activeQuestion.ind : lang === "np" ? activeQuestion.np : activeQuestion.kr}
                </h2>
                {lang !== "kr" && (
                  <p className="text-slate-200 font-bold text-xs sm:text-sm md:text-base border-t border-slate-700/80 pt-4 sm:pt-5 mt-2 px-2 sm:px-4 break-keep font-sans">
                    {activeQuestion.kr}
                  </p>
                )}
              </div>

              {/* Likert Scale Grid Selector */}
              <div className="grid grid-cols-5 gap-1 sm:gap-2 md:gap-4 mt-6 sm:mt-8 w-full max-w-3xl">
                {[1, 2, 3, 4, 5].map((val) => {
                  const labels: Record<string, string[]> = {
                    vn: ["Hoàn toàn\nkhông đồng ý", "Không\nđồng ý", "Bình\nthường", "Đồng ý", "Hoàn toàn\nđồng ý"],
                    kr: ["전혀\n그렇지 않다", "그렇지\n않은 편이다", "보통이다", "그런\n편이다", "매우\n그렇다"],
                    en: ["Strongly\nDisagree", "Disagree", "Neutral", "Agree", "Strongly\nAgree"],
                    id: ["Sangat Tidak\nSetuju", "Tidak\nSetuju", "Netral", "Setuju", "Sangat\nSetuju"],
                    np: ["बिल्कुल\nअसहमत", "असहमत", "तटस्थ", "सहमत", "पूर्ण\nसहमत"],
                  };
                  const lbls = labels[lang] || labels.kr;
                  return (
                    <div
                      key={val}
                      onClick={() => handleSelectAnswer(val)}
                      className="flex flex-col items-center justify-start cursor-pointer group"
                    >
                      <div className="likert-number-wrapper flex items-center justify-center w-full mb-1 sm:mb-2">
                        <input
                          type="radio"
                          name="q_answer"
                          id={`ans_${val}`}
                          value={val}
                          checked={userAnswers[activeQuestion.id] === val}
                          readOnly
                          className="likert-input hidden"
                        />
                        <label
                          htmlFor={`ans_${val}`}
                          className={`w-9 h-9 sm:w-12 sm:h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center text-lg sm:text-xl md:text-2xl font-black cursor-pointer likert-number-btn shadow-md ${
                            userAnswers[activeQuestion.id] === val
                              ? "bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] text-white border-[#38bdf8] scale-105"
                              : ""
                          }`}
                        >
                          {val}
                        </label>
                      </div>
                      <span className="text-[9px] sm:text-[10px] md:text-xs text-center font-bold sm:font-black font-sans break-keep transition-colors px-0.5 sm:px-1 text-slate-200 whitespace-pre-line leading-tight">
                        {lbls[val - 1]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex-none flex justify-between items-center py-4 px-2">
            <div />
            {currentQIndex === 93 && (
              <button
                onClick={handleManualSubmit}
                className="btn-premium glow-blue px-10 py-4 md:px-14 md:py-5 font-display font-bold text-base tracking-widest rounded flex items-center gap-2"
              >
                <span className="text-[15px]">SUBMIT ASSESSMENT</span>
                <Check className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ----------------- VIEW: UPLOAD ----------------- */}
      {currentView === "upload" && (
        <div className="flex-grow flex flex-col items-center justify-center p-4 min-h-screen">
          <div className="glass-premium cyber-bracket p-12 md:p-16 max-w-md w-full text-center">
            <div className="relative w-24 h-24 mx-auto mb-10 glow-cyan rounded-full">
              <div className="absolute inset-0 border-2 border-slate-800 rounded-full" />
              <div className="absolute inset-0 border-2 border-cyan-500 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-4 border border-cyan-800 rounded-full border-b-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-cyan-400 font-mono text-xs tracking-widest font-bold">
                SYNC
              </div>
            </div>
            <h2 className="text-xl font-display text-cyan-400 mb-3 tracking-[0.2em] font-bold glow-text-cyan">
              SYSTEM UPLOADING...
            </h2>
            <p className="text-sm text-slate-400 font-sans leading-relaxed break-keep">
              데이터를 클라우드 서버에 안전하게 전송 및 기록 중입니다.<br />창을 닫거나 새로고침하지 마십시오.
            </p>
          </div>
        </div>
      )}

      {/* ----------------- VIEW: THANKYOU ----------------- */}
      {currentView === "thankyou" && (
        <div className="flex-grow flex flex-col items-center justify-center p-4 min-h-screen">
          <div className="glass-premium cyber-bracket p-6 sm:p-10 md:p-16 max-w-lg w-full text-center border-t-2 border-t-emerald-500/50">
            <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-emerald-900/20 border border-emerald-500/50 rounded-full flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              <Check className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-400" />
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-display text-white mb-3 sm:mb-4 tracking-widest font-bold drop-shadow-md">
              EVALUATION COMPLETE
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mb-6 sm:mb-10 font-sans leading-relaxed break-keep">
              검사가 정상적으로 마감되었습니다.<br />결과가 안전하게 기록되었습니다. 수고하셨습니다.
            </p>
            
            <div className="flex flex-col gap-3 sm:gap-4 w-full">
              <button
                onClick={() => {
                  setCandidateInfo({ firstName: "", lastName: "", id: "", company: "", date: "" });
                  setCurrentView("home");
                }}
                className="btn-premium w-full py-4 sm:py-5 text-sm sm:text-base font-display font-bold tracking-widest rounded"
              >
                RETURN TO HOME
              </button>
              <button
                onClick={handleDownloadLocalBackup}
                className="w-full glass text-slate-400 py-3 sm:py-4 rounded border border-slate-700 hover:text-white hover:border-slate-500 transition-all text-[10px] sm:text-xs font-mono flex items-center justify-center gap-2 mt-1 sm:mt-2 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                [ BACKUP LOCAL DATA ]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- VIEW: ADMIN LOGIN ----------------- */}
      {currentView === "admin-login" && (
        <div className="flex-grow flex flex-col items-center justify-center p-4 min-h-screen">
          <div className="glass-premium cyber-bracket p-[30px] max-w-sm w-full text-center border-t-2 border-t-blue-500/50">
            <div className="text-blue-400 font-mono text-[10px] tracking-widest mb-3 sm:mb-4 bg-blue-500/10 inline-block px-3 py-1 rounded border border-blue-500/30 glow-text-blue">
              RESTRICTED AREA
            </div>
            <h2 
              className="text-white mb-6 sm:mb-8 tracking-widest font-bold"
              style={{ fontFamily: "system-ui", fontSize: "22px", borderStyle: "double", borderRadius: "-1px" }}
            >
              SYS_ADMIN ACCESS
            </h2>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdminAuth()}
              className="system-input w-full p-3 sm:p-4 mb-6 sm:mb-8 text-center text-[15px] font-mono tracking-[0.3em] rounded"
              placeholder="PASSWORD"
            />
            <div className="flex gap-3 sm:gap-4">
              <button
                onClick={() => setCurrentView("home")}
                className="flex-1 glass border border-slate-700 text-slate-400 py-3 sm:py-4 rounded font-mono text-xs sm:text-sm hover:bg-slate-800 transition cursor-pointer"
              >
                BACK
              </button>
              <button
                onClick={handleAdminAuth}
                className="flex-2 btn-premium glow-blue py-3 sm:py-4 font-display font-bold text-xs sm:text-sm tracking-widest rounded"
              >
                AUTHENTICATE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- VIEW: ADMIN DASHBOARD ----------------- */}
      {currentView === "admin-dashboard" && (
        <div className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-6 min-h-screen flex flex-col text-slate-800">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col flex-grow font-sans">
            
            {/* Control Header */}
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center flex-wrap gap-4">
              <div>
                <div className="text-[10px] font-mono text-blue-600 tracking-widest mb-1 font-bold">
                  HD HYUNDAI SAMHO HR-SYSTEM
                </div>
                <h2 className="font-black text-2xl text-slate-900 font-display tracking-tight flex items-center gap-3">
                  CANDIDATE DASHBOARD
                  <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded font-mono border border-blue-200 shadow-sm">
                    {filteredData.length}
                  </span>
                </h2>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <button
                  onClick={() => setShowAdminSimulator(true)}
                  className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5 border border-indigo-400/30"
                  title="관리자 전용 모의 테스트 생성 및 검사 시뮬레이터"
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
                  <span>⚡ 모의 테스트 & 시뮬레이터</span>
                </button>
                <button
                  onClick={() => {
                    setCurrentView("total-report");
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>TOTAL REPORT</span>
                </button>
                <button
                  onClick={() => setShowQrAdminModal(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                  title="응시용 QR 코드 및 A4 포스터 인쇄"
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR CODE</span>
                </button>
                <button
                  onClick={handleExcelExport}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>EXPORT EXCEL</span>
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className={`border px-3.5 py-2 rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer ${
                    selectedKeys.length > 0
                      ? "bg-red-50 border-red-400 text-red-600 hover:bg-red-100 shadow-sm"
                      : "border-slate-300 text-slate-400 hover:bg-slate-50"
                  }`}
                  title={selectedKeys.length > 0 ? "선택한 항목 삭제" : "삭제할 항목을 먼저 선택해주세요"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>DELETE{selectedKeys.length > 0 ? ` (${selectedKeys.length})` : ""}</span>
                </button>
                <button
                  onClick={() => setCurrentView("home")}
                  className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg font-bold text-xs shadow-sm cursor-pointer flex items-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>EXIT ADMIN</span>
                </button>
              </div>
            </div>

            {/* Multi-Source Live Data Diagnostic Status Bar */}
            <div className="px-6 py-2.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs font-mono border-b border-slate-700 shadow-inner">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1.5 text-cyan-300 font-bold">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  데이터 통합 연동
                </span>
                <span className="bg-slate-800/90 px-2.5 py-1 rounded border border-cyan-500/40 text-cyan-200 shadow-sm">
                  ☁️ Firebase: <strong>{firebaseData.length}</strong>건
                </span>
                <span className="bg-slate-800/90 px-2.5 py-1 rounded border border-emerald-500/40 text-emerald-300 shadow-sm">
                  📗 구글 시트: <strong>{sheetData.length}</strong>건
                </span>
                <span className="bg-slate-800/90 px-2.5 py-1 rounded border border-blue-500/40 text-blue-300 shadow-sm">
                  💻 브라우저 로컬: <strong>{localData.length}</strong>건
                </span>
                {fileData.length > 0 && (
                  <span className="bg-slate-800/90 px-2.5 py-1 rounded border border-purple-500/40 text-purple-300 shadow-sm">
                    📁 파일 업로드: <strong>{fileData.length}</strong>건
                  </span>
                )}
                <span className="bg-blue-600/40 px-3 py-1 rounded border border-blue-400 text-white font-bold shadow-sm">
                  🎯 총 통합 응시자: {mergedData.length}명
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                {lastSyncTime && <span>동기화: {lastSyncTime}</span>}
                <button
                  onClick={() => syncAllCloudData(true)}
                  disabled={syncing}
                  className="bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 border border-cyan-500/50 px-2.5 py-1 rounded transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-sans font-medium"
                >
                  <RefreshCw className={`w-3 h-3 ${syncing ? "animate-spin text-cyan-300" : ""}`} />
                  <span>{syncing ? "동기화 중..." : "새로고침"}</span>
                </button>
              </div>
            </div>

            {/* Filters Row */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                {["ALL", "S", "A", "B1", "B2", "C1", "C2", "D"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setFilterGrade(g)}
                    className={`px-3 py-1.5 rounded text-xs font-bold border font-mono transition cursor-pointer ${
                      filterGrade === g
                        ? "bg-blue-600 text-white border-blue-600 shadow"
                        : "bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                  >
                    {g === "ALL" ? "ALL" : g}
                  </button>
                ))}
              </div>
              <div className="relative flex-grow max-w-md flex items-center gap-3 w-full">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded border border-slate-300 bg-white outline-none focus:border-slate-400 font-sans text-xs text-slate-900 placeholder-slate-400 shadow-sm"
                    placeholder="Search name, ID, company, nation..."
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                </div>
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="px-3 py-2 rounded border border-slate-300 outline-none focus:border-slate-400 font-mono text-xs text-slate-900 bg-white shadow-sm w-[130px] cursor-pointer font-bold"
                >
                  <option value="">ALL DATES</option>
                  {uniqueDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dashboard Table */}
            <div className="overflow-auto flex-grow bg-white relative" style={{ height: "696.333px" }}>
              <table className="w-full text-sm text-left table-fixed min-w-[900px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-mono text-[10px] tracking-widest sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="px-3 py-4 text-center w-[40px]">
                      <input
                        type="checkbox"
                        checked={filteredData.length > 0 && selectedKeys.length === filteredData.length}
                        onChange={(e) => handleToggleAll(e.target.checked)}
                        className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                      />
                    </th>
                    <th
                      onClick={() => triggerSort("date")}
                      className="px-3 py-4 text-center w-[12%] cursor-pointer hover:text-blue-400 select-none group"
                    >
                      DATE {sortKey === "date" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => triggerSort("lang")}
                      className="px-3 py-4 text-center w-[8%] cursor-pointer hover:text-blue-400 select-none group"
                    >
                      NATION {sortKey === "lang" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => triggerSort("company")}
                      className="px-3 py-4 text-center w-[12%] cursor-pointer hover:text-blue-400 select-none group"
                    >
                      COMPANY {sortKey === "company" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => triggerSort("id")}
                      className="px-3 py-4 text-center w-[10%] cursor-pointer hover:text-blue-400 select-none group"
                    >
                      ID {sortKey === "id" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => triggerSort("name")}
                      className="px-3 py-4 text-center w-[14%] cursor-pointer hover:text-blue-400 select-none group"
                    >
                      NAME {sortKey === "name" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => triggerSort("total")}
                      className="px-3 py-4 text-center w-[8%] cursor-pointer hover:text-blue-400 select-none group"
                    >
                      SCORE {sortKey === "total" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => triggerSort("reliability")}
                      className="px-3 py-4 text-center w-[15%] cursor-pointer hover:text-blue-400 select-none group"
                    >
                      RELIABILITY {sortKey === "reliability" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      onClick={() => triggerSort("decision")}
                      className="px-3 py-4 text-center w-[9%] cursor-pointer hover:text-blue-400 select-none group"
                    >
                      GRADE {sortKey === "decision" && (sortOrder === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="px-3 py-4 text-center w-[12%]">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-transparent font-medium text-xs text-slate-800">
                  {filteredData.map((r, idx) => {
                    const rowKey = getRecordKey(r, idx);
                    const isSelected = selectedKeys.includes(rowKey);
                    const gradeKey = r.decision.split(" ")[0];
                    return (
                      <tr
                        key={rowKey}
                        className={`hover:bg-slate-50 cursor-pointer transition-colors border-b border-slate-200 ${
                          isSelected ? "bg-blue-50" : ""
                        }`}
                        onClick={() => {
                          setViewingResult(r);
                          setCurrentView("report");
                        }}
                      >
                        <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleRow(rowKey)}
                            className="w-4 h-4 cursor-pointer accent-blue-600 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-3 py-3.5 text-center text-slate-600 font-mono">
                          {getYYYYMMDD(r.date)}
                        </td>
                        <td className="px-3 py-3.5 text-center text-slate-600 font-bold uppercase">
                          {r.lang ? r.lang.toUpperCase() : "N/A"}
                        </td>
                        <td className="px-3 py-3.5 text-center text-slate-600 font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                          {r.company}
                        </td>
                        <td className="px-3 py-3.5 text-center font-bold text-slate-900 font-mono">
                          {formatCandidateId(r.id)}
                        </td>
                        <td className="px-3 py-3.5 text-center font-black text-slate-900">
                          {formatCandidateName(r.name)}
                        </td>
                        <td className="px-3 py-3.5 text-center font-black font-display text-blue-600 text-sm">
                          {r.total}
                        </td>
                        <td className="px-3 py-3.5 text-center font-bold text-slate-800">
                          {r.reliability.split(" ")[0]}
                        </td>
                        <td className="px-3 py-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded border text-[10px] font-black ${
                              gradeKey === "최우수"
                                ? "border-indigo-200 text-indigo-700 bg-indigo-50"
                                : gradeKey === "우수"
                                ? "border-blue-200 text-blue-700 bg-blue-50"
                                : gradeKey === "보통"
                                ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                                : "border-red-200 text-red-700 bg-red-50"
                            }`}
                          >
                            {gradeKey}
                          </span>
                        </td>
                        <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setViewingResult(r);
                                setCurrentView("report");
                              }}
                              className="bg-white hover:bg-blue-600 hover:text-white border border-slate-300 hover:border-blue-500 text-slate-700 px-2.5 py-1.5 rounded text-[10px] font-bold transition cursor-pointer shadow-sm"
                            >
                              VIEW
                            </button>
                            <button
                              onClick={(e) => handleOpenEditModal(r, e)}
                              className="bg-slate-50 hover:bg-amber-500 hover:text-white border border-slate-300 hover:border-amber-500 text-slate-700 px-2.5 py-1.5 rounded text-[10px] font-bold transition cursor-pointer shadow-sm flex items-center gap-1 group"
                              title="응시자 정보 수정"
                            >
                              <Edit3 className="w-3 h-3 text-amber-600 group-hover:text-white" />
                              <span>EDIT</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center py-16 text-slate-400 font-mono">
                        NO RESULTS FOUND IN SYSTEM
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Print Table View (hidden on screen, block on print) */}
            <div id="print-table-view">
              <h2 style={{ fontSize: "16px", marginBottom: "10px", fontWeight: "bold" }}>종합평가표 (다수 인원 결과)</h2>
              <table>
                <thead>
                  <tr>
                    <th>업체명</th>
                    <th>수험번호</th>
                    <th>성명</th>
                    <th>응시일자</th>
                    <th>종합점수</th>
                    <th>종합등급</th>
                    <th>신뢰도 판별</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((r, idx) => (
                    <tr key={getRecordKey(r, idx)}>
                      <td style={{ textAlign: "center" }}>{r.company}</td>
                      <td style={{ textAlign: "center" }}>{r.id}</td>
                      <td style={{ textAlign: "center" }}>{r.name}</td>
                      <td style={{ textAlign: "center" }}>{r.date}</td>
                      <td style={{ textAlign: "center" }}>{r.total}</td>
                      <td style={{ textAlign: "center", fontWeight: "bold", color: r.decision.startsWith("C") || r.decision.startsWith("D") ? "#dc2626" : "inherit" }}>
                        {r.decision.split(" ")[0]}
                      </td>
                      <td style={{ textAlign: "center", color: r.reliability.includes("V3") ? "#d97706" : (r.reliability.includes("V4") ? "#dc2626" : "inherit") }}>
                        {r.reliability.split(" ")[0]}
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>출력할 데이터가 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

      {/* ----------------- VIEW: INDIVIDUAL REPORT ----------------- */}
      {currentView === "report" && viewingResult && (
        <div className="flex-grow w-full max-w-7xl mx-auto p-4 md:p-8 min-h-screen flex flex-col items-center overflow-x-auto print:overflow-visible print:p-0 print:m-0 print:block">
          
          {/* Top Quick Control Bar (no-print) */}
          <div className="no-print w-full max-w-[210mm] flex justify-between items-center mb-4 bg-slate-900 text-white p-3 sm:p-4 rounded-xl border border-slate-800 shadow-lg flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-slate-200">
                👤 <strong className="text-white">{formatCandidateName(viewingResult.name)}</strong> ({formatCandidateId(viewingResult.id)})
              </span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                | {viewingResult.company}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenEditModal(viewingResult)}
                className="bg-amber-500 hover:bg-amber-400 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>정보 수정 (EDIT)</span>
              </button>
              <button
                onClick={handlePrintReport}
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition cursor-pointer flex items-center gap-1.5"
              >
                <span>🖨️ 인쇄/PDF</span>
              </button>
              <button
                onClick={() => {
                  setViewingResult(null);
                  setCurrentView("admin-dashboard");
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-lg text-xs font-mono transition cursor-pointer border border-slate-700"
              >
                대시보드
              </button>
            </div>
          </div>

          {/* Print/PDF Page layout */}
          <div id="view-report" className="min-w-[210mm] w-[210mm] mx-auto bg-slate-50 relative flex flex-col items-center shadow-2xl">
            {/* PAGE 1: New Recommended Layout */}
            <div 
              className="a4-page bg-white flex flex-col" 
              style={{ 
                width: "210mm", 
                height: "297mm", 
                padding: "15mm 15mm",
                boxSizing: "border-box",
                pageBreakAfter: "always",
                overflow: "hidden"
              }}
            >
              {/* Header: Title and Candidate Info */}
              <div className="flex justify-between items-start border-b-[3px] border-slate-800 pb-4 mb-5 shrink-0">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 mb-2">
                    <img src="/ci.png" alt="HD HYUNDAI SAMHO" className="h-8 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                  </div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">인성검사 평가 결과</h1>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-mono">Personality Assessment Report</p>
                </div>
                
                <div className="flex flex-col items-end text-right">
                  <div className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-sm font-bold tracking-widest font-mono mb-3">
                    OFFICIAL DOCUMENT
                  </div>
                  <div className="text-2xl font-black text-slate-900 leading-none mb-1">
                    {formatCandidateName(viewingResult.name)} <span className="text-lg text-slate-500 font-bold">({formatCandidateId(viewingResult.id)})</span>
                  </div>
                  <div className="text-[17px] font-bold text-slate-600 font-mono">
                    {getYYYYMMDD(viewingResult.date)} | {viewingResult.company} | NATION: {viewingResult.lang ? viewingResult.lang.toUpperCase() : "N/A"}
                  </div>
                </div>
              </div>

              {/* KPI Score Cards & Guide */}
              {(() => {
                const engGradeMatch = viewingResult.decision.match(/\(([^)]+)\)/);
                const engGrade = engGradeMatch ? engGradeMatch[1] : viewingResult.decision.replace(/[^A-Z0-9]/g, "");
                const korGrade = viewingResult.decision.split(" ")[0];
                
                let gradeGuide = "";
                if (engGrade === "S") gradeGuide = "조직/직무 역량 탁월 (즉시 투입)";
                else if (engGrade === "A") gradeGuide = "전반적 역량 우수 (채용 권장)";
                else if (engGrade === "B1") gradeGuide = "기본 소양 보유 (채용 권장)";
                else if (engGrade === "B2") gradeGuide = "역량 평이 (초기 멘토링)";
                else if (engGrade === "C1") gradeGuide = "취약점/신뢰도 저하 (심층 검증)";
                else if (engGrade === "C2") gradeGuide = "안전의식 낮음 (특별 관리)";
                else if (engGrade === "D") gradeGuide = "부적응/불성실 (채용 불가)";
                else gradeGuide = "- (-)";
                
                let gradeColor = "#10b981";
                if (engGrade === "S") gradeColor = "#4f46e5";
                else if (engGrade === "A") gradeColor = "#2563eb";
                else if (engGrade === "B2") gradeColor = "#fbbf24";
                else if (engGrade === "C1") gradeColor = "#f59e0b";
                else if (engGrade === "C2") gradeColor = "#ea580c";
                else if (engGrade === "D") gradeColor = "#ef4444";

                let relText = viewingResult.reliability.split(" (")[0];
                if (relText === "매우 높음") relText = "높음";
                else if (relText === "주의 요망") relText = "주의";
                else if (relText === "해석 불가") relText = "불가";
                
                const relColor = viewingResult.reliability.includes("V1") || viewingResult.reliability.includes("V2") ? "#10b981" : viewingResult.reliability.includes("V3") ? "#fbbf24" : "#ef4444";

                return (
                  <div className="grid grid-cols-5 gap-2 mb-6 shrink-0 min-h-[96px]">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 flex flex-col items-center shadow-sm">
                      <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center shrink-0">종합 점수</div>
                      <div className="flex-1 w-full flex items-center justify-center min-h-[50px]">
                        <div className="text-3xl font-black font-sans leading-none text-slate-900 tracking-tight text-center">{viewingResult.total}</div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 flex flex-col items-center shadow-sm">
                      <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center shrink-0">종합 판정</div>
                      <div className="flex-1 w-full flex items-center justify-center min-h-[50px]">
                        <div className="text-3xl font-black font-sans leading-none tracking-tight text-center" style={{ color: gradeColor }}>
                          {korGrade}
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 flex flex-col items-center shadow-sm">
                      <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center shrink-0">등급</div>
                      <div className="flex-1 w-full flex items-center justify-center min-h-[50px]">
                        <div className="text-3xl font-black font-sans leading-none tracking-tight text-center" style={{ color: gradeColor }}>
                          {engGrade}
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 flex flex-col items-center shadow-sm">
                      <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center shrink-0">채용 검토</div>
                      <div className="flex-1 w-full flex items-center justify-center min-h-[50px]">
                        <div className="text-[12px] font-black font-sans text-slate-800 text-center leading-[1.2] break-keep tracking-tight">
                          {gradeGuide.split(" (")[0]}
                          <br />
                          {gradeGuide.split(" (")[1] && (
                            <span className="text-[10px] text-slate-500 font-bold">({gradeGuide.split(" (")[1].replace(")", "")})</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-3 flex flex-col items-center shadow-sm">
                      <div className="text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center shrink-0">신뢰도</div>
                      <div className="flex-1 w-full flex items-center justify-center min-h-[50px]">
                        <div className="text-[26px] font-black font-sans leading-[1.1] tracking-tight text-center whitespace-pre-line" style={{ color: relColor }}>
                          {relText}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Main Content Area: Chart and Table */}
              <div className="flex-1 flex gap-4 min-h-0 mb-6 w-full">
                <div className="flex-1 basis-0 min-w-0 flex flex-col bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <span className="text-blue-600">📊</span> 역량 프로파일
                  </h3>
                  <div className="flex-1 min-h-0 relative flex items-center justify-center">
                    <MainChart
                      personalDetails={viewingResult.details}
                      averageDetails={averageStatistics}
                    />
                  </div>
                </div>
                
                <div className="flex-1 basis-0 min-w-0 flex flex-col bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-3 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <span className="text-blue-600">📋</span> 세부 지표 분석
                  </h3>
                  <div className="flex-1 flex flex-col justify-between">
                    {Object.keys(viewingResult.details).map((k) => {
                      const s = viewingResult.details[k];
                      const progressColor = s >= 80 ? "#3b82f6" : s >= 60 ? "#06b6d4" : "#f43f5e";
                      const badgeClass =
                        s >= 90
                          ? "bg-indigo-600"
                          : s >= 80
                          ? "bg-blue-500"
                          : s >= 60
                          ? "bg-emerald-500"
                          : s >= 40
                          ? "bg-amber-500"
                          : "bg-red-500";
                      const gradeLetter = s >= 90 ? "S" : s >= 80 ? "A" : s >= 60 ? "B" : s >= 40 ? "C" : "D";

                      return (
                        <div key={k} className="flex items-center text-[12px]">
                          <div className="w-[125px] font-bold text-slate-700 whitespace-nowrap flex items-center">
                            <span className="font-mono text-slate-400 text-[11px] w-6 inline-block">{k}</span>
                            {MGMT_GUIDE[k]?.title || k}
                          </div>
                          <div className="w-[30px] flex justify-center">
                            <span className={`inline-block w-5 h-5 leading-[20px] text-center rounded text-[11px] font-black text-white ${badgeClass}`}>
                              {gradeLetter}
                            </span>
                          </div>
                          <div className="flex-1 px-3">
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${s}%`, backgroundColor: progressColor }}
                              />
                            </div>
                          </div>
                          <div className="w-[25px] font-extrabold text-right font-sans text-[13px]" style={{ color: progressColor }}>
                            {s}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Text Comments Area */}
              <div className="flex gap-4 shrink-0 min-h-[190px] mb-2 w-full">
                <div className="flex-1 basis-0 min-w-0 flex flex-col bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-2 pb-2 border-b border-slate-100 flex items-center gap-2 shrink-0">
                    <span className="text-blue-600">📌</span> 종합 판정 의견
                  </h3>
                  <div className="flex-1 text-[13.5px] leading-relaxed text-slate-700 text-justify">
                    <div dangerouslySetInnerHTML={{ __html: generateReportComment(viewingResult) }} />
                  </div>
                </div>
                <div className="flex-1 basis-0 min-w-0 flex flex-col bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <h3 className="text-lg font-black text-slate-800 mb-2 pb-2 border-b border-slate-100 flex items-center gap-2 shrink-0">
                    <span className="text-blue-600">🔍</span> 응답 신뢰도 분석
                  </h3>
                  <div className="flex-1 text-[13.5px] leading-relaxed text-slate-700 text-justify">
                    <div dangerouslySetInnerHTML={{ __html: generateReliabilityComment(viewingResult) }} />
                  </div>
                </div>
              </div>
            </div>

            {/* AI report embedded */}
            <AIReport data={viewingResult} />
          </div>

          {/* Action buttons footer */}
          <div className="text-center no-print my-10 flex flex-wrap gap-4 justify-center" style={{ fontFamily: "Verdana" }}>
            <button
              onClick={() => handleOpenEditModal(viewingResult)}
              className="bg-amber-500 hover:bg-amber-400 text-white px-7 py-4 rounded-xl font-bold shadow-lg transition cursor-pointer flex items-center gap-2"
              style={{ fontFamily: "system-ui" }}
            >
              <Edit3 className="w-4 h-4" />
              <span>✏️ 응시자 정보 수정</span>
            </button>
            <button
              onClick={handlePrintReport}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg transition cursor-pointer flex items-center gap-2"
              style={{ fontFamily: "system-ui" }}
            >
              <span>🖨️ 인쇄 / PDF 저장</span>
            </button>
            <button
              onClick={() => {
                setViewingResult(null);
                setCurrentView("admin-dashboard");
              }}
              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 hover:border-slate-400 px-8 py-4 rounded-xl font-bold shadow-sm transition cursor-pointer"
              style={{ fontFamily: "system-ui" }}
            >
              대시보드로 돌아가기
            </button>
          </div>
        </div>
      )}
      {/* ----------------- VIEW: TOTAL REPORT ----------------- */}
      {currentView === "total-report" && (
        <TotalReport data={mergedData} onClose={() => setCurrentView("admin-dashboard")} />
      )}
    </div>
    </div>
  );
}
