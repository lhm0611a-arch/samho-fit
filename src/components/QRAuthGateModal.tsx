import React, { useState } from "react";
import { KeyRound, QrCode, X, Lock } from "lucide-react";

interface QRAuthGateModalProps {
  onSuccess: (tokenData: any) => void;
  onAdminClick: () => void;
  onSimulatorClick?: () => void;
  onClose: () => void;
  showToast: (msg: string, type?: "info" | "error") => void;
}

export const QRAuthGateModal: React.FC<QRAuthGateModalProps> = ({
  onSuccess,
  onAdminClick,
  onClose,
  showToast,
}) => {
  const [accessCode, setAccessCode] = useState<string>("");
  const [verifying, setVerifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerifyCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const codeClean = accessCode.trim();
    if (!codeClean) {
      setErrorMsg("인증 코드(6자리 또는 QR 토큰)를 입력해 주세요.");
      return;
    }

    try {
      setVerifying(true);
      setErrorMsg(null);
      const res = await fetch("/api/qr-tokens/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: codeClean, token: codeClean }),
      });
      const data = await res.json();

      if (data.valid) {
        showToast("인증이 완료되었습니다.", "info");
        onSuccess(data);
      } else {
        setErrorMsg(data.message || "유효하지 않거나 만료된 QR 접속 코드입니다.");
      }
    } catch {
      setErrorMsg("인증 통신 오류가 발생했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] overflow-y-auto font-sans">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden p-6 relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-blue-900/30 border border-blue-500/40 rounded-xl flex items-center justify-center mx-auto mb-3 text-cyan-400">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">
            QR 코드 응시 권한 확인
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            현장 QR 코드를 스캔하거나 6자리 코드를 입력하세요.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerifyCode} className="space-y-3 mb-4">
          <div>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value.toUpperCase());
                setErrorMsg(null);
              }}
              placeholder="6자리 코드 입력 (예: AB12CD)"
              className="w-full bg-slate-950 border border-slate-700 text-white rounded-lg px-3 py-2.5 text-center font-mono text-sm tracking-widest uppercase focus:border-cyan-500 transition"
              maxLength={30}
              autoFocus
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-400 text-center font-bold">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={verifying}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white py-2.5 rounded-lg text-xs font-bold transition shadow cursor-pointer disabled:opacity-50"
          >
            {verifying ? "확인 중..." : "인증하고 시작하기"}
          </button>
        </form>

        <div className="pt-3 border-t border-slate-800 flex justify-center">
          <button
            onClick={onAdminClick}
            className="text-xs text-slate-400 hover:text-white transition font-mono"
          >
            관리자(SYS_ADMIN) 로그인
          </button>
        </div>

      </div>
    </div>
  );
};
