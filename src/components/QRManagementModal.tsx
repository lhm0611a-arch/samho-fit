import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { 
  QrCode, 
  Copy, 
  Download, 
  Printer, 
  X, 
  CheckCircle2,
  Calendar,
  Building2,
  Clock,
  Plus
} from "lucide-react";
import { QRPrintPosterModal } from "./QRPrintPosterModal";

interface QRManagementModalProps {
  onClose: () => void;
  showToast: (msg: string, type?: "info" | "error") => void;
}

export const QRManagementModal: React.FC<QRManagementModalProps> = ({ onClose, showToast }) => {
  const [activeToken, setActiveToken] = useState<any>(null);
  const [companyInput, setCompanyInput] = useState<string>("");
  const [dateInput, setDateInput] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Fetch current active token
  const fetchActiveToken = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/qr-tokens/active");
      const data = await res.json();
      if (data.token) {
        setActiveToken(data.token);
        if (data.token.company) setCompanyInput(data.token.company);
        if (data.token.examDate) setDateInput(data.token.examDate);
      }
    } catch (e) {
      console.warn("Failed to load active QR token", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveToken();
  }, []);

  const qrUrl = activeToken
    ? `${window.location.origin}?qr=${activeToken.token}`
    : typeof window !== "undefined"
    ? window.location.origin
    : "";

  // Render QR Code onto Canvas
  useEffect(() => {
    if (canvasRef.current && qrUrl) {
      QRCode.toCanvas(
        canvasRef.current,
        qrUrl,
        {
          width: 220,
          margin: 2,
          color: {
            dark: "#001424",
            light: "#ffffff",
          },
        },
        (err) => {
          if (err) console.error("QR render error:", err);
        }
      );
    }
  }, [qrUrl]);

  // Generate new 24-hour QR token with target Company and Date
  const handleGenerateNewQR = async () => {
    if (!companyInput.trim()) {
      showToast("업체명을 입력해주세요.", "error");
      return;
    }
    try {
      setIsGenerating(true);
      const res = await fetch("/api/qr-tokens/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: companyInput.trim(),
          examDate: dateInput.trim() || new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (data.token) {
        setActiveToken(data.token);
        showToast(`[${companyInput}] 24시간 보안 QR 코드가 발급되었습니다.`, "info");
      }
    } catch (e) {
      showToast("QR 코드 발급 중 오류가 발생했습니다.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy Link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(qrUrl);
    setCopied(true);
    showToast("검사 접속 링크가 복사되었습니다.", "info");
    setTimeout(() => setCopied(false), 2000);
  };

  // Download QR Code Image
  const handleDownloadQR = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `HD_${companyInput || "SAMHO"}_${dateInput}_QR.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
    showToast("QR 코드 이미지를 다운로드했습니다.", "info");
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden font-sans my-6">
          
          {/* Header */}
          <div className="bg-slate-950 p-5 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">일정/업체별 24시간 보안 QR</h3>
                <p className="text-xs text-slate-400">지정 업체 및 일정에 맞춘 24시간 유효 QR 코드</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Input Form for Company & Date */}
            <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>업체명</span>
                  </label>
                  <input
                    type="text"
                    value={companyInput}
                    onChange={(e) => setCompanyInput(e.target.value)}
                    placeholder="예: 삼호중공업 1협력사"
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:border-cyan-500 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>검사 일자</span>
                  </label>
                  <input
                    type="date"
                    value={dateInput}
                    onChange={(e) => setDateInput(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs focus:border-blue-500 transition"
                  />
                </div>
              </div>

              <button
                onClick={handleGenerateNewQR}
                disabled={isGenerating}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{isGenerating ? "생성 중..." : "이 일정/업체로 24시간 QR 코드 생성"}</span>
              </button>
            </div>

            {/* QR Canvas */}
            <div className="text-center space-y-3">
              <div className="bg-white p-3 rounded-xl shadow-xl inline-block border-2 border-slate-200">
                <canvas ref={canvasRef} className="mx-auto block" />
              </div>

              {activeToken && (
                <div className="text-xs text-slate-300 flex flex-wrap items-center justify-center gap-2 font-mono">
                  <span className="bg-blue-950/80 text-blue-300 px-2 py-0.5 rounded border border-blue-800">
                    🏢 {activeToken.company || companyInput}
                  </span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                    📅 {activeToken.examDate || dateInput}
                  </span>
                  <span className="bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>24시간 유효</span>
                  </span>
                </div>
              )}

              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-300 flex items-center justify-between gap-2">
                <span className="truncate font-mono text-[11px] text-slate-400">{qrUrl}</span>
                <button
                  onClick={handleCopyLink}
                  className="shrink-0 bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded font-bold text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                  <span>{copied ? "복사됨" : "복사"}</span>
                </button>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  onClick={handleDownloadQR}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>QR 이미지 저장</span>
                </button>

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-white" />
                  <span>A4 안내 포스터 출력</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-slate-950 p-3.5 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
            >
              닫기
            </button>
          </div>

        </div>
      </div>

      {/* Print Poster Modal */}
      {showPrintModal && (
        <QRPrintPosterModal
          qrUrl={qrUrl}
          company={activeToken?.company || companyInput}
          examDate={activeToken?.examDate || dateInput}
          title="HD현대삼호 E-7 외국인 근로자 인성검사"
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </>
  );
};
