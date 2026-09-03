import React from "react";
import { AlertTriangle, Clock, KeyRound, Shield } from "lucide-react";

interface QRExpiredViewProps {
  expiresAt?: string;
  errorMessage?: string;
  onRetryWithCode: () => void;
  onAdminClick: () => void;
}

export const QRExpiredView: React.FC<QRExpiredViewProps> = ({
  expiresAt,
  errorMessage,
  onRetryWithCode,
  onAdminClick,
}) => {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center p-4 z-50 bg-[#001424]">
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20" 
        style={{ backgroundImage: "url('/yard.png')" }} 
      />
      <div className="absolute inset-0 bg-[#001424]/85 backdrop-blur-md" />

      <div className="relative z-10 bg-slate-900/90 border border-red-500/40 p-8 max-w-sm w-full text-center rounded-2xl shadow-2xl font-sans">
        
        <div className="w-12 h-12 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center justify-center mx-auto mb-4 text-red-400">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h2 className="text-lg font-bold text-white mb-2">
          QR 접속 유효기간 만료 (24시간 경과)
        </h2>

        <p className="text-slate-300 text-xs leading-relaxed mb-6 break-keep">
          {errorMessage || "24시간이 경과하여 접속이 만료되었습니다. 관리자에게 당일 QR 코드를 요청하세요."}
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={onRetryWithCode}
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2.5 px-4 rounded-lg font-bold text-xs shadow transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>새 접속 코드 직접 입력</span>
          </button>
          <button
            onClick={onAdminClick}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white py-2.5 px-4 rounded-lg font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-1.5 cursor-pointer font-mono"
          >
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>관리자 로그인</span>
          </button>
        </div>
      </div>
    </div>
  );
};
