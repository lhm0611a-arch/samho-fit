import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Printer, X, Shield, Building2, Calendar } from "lucide-react";

interface QRPrintPosterModalProps {
  qrUrl?: string;
  company?: string;
  examDate?: string;
  title?: string;
  onClose: () => void;
}

export const QRPrintPosterModal: React.FC<QRPrintPosterModalProps> = ({ 
  qrUrl, 
  company = "HD현대삼호 협력사",
  examDate = new Date().toISOString().slice(0, 10),
  onClose 
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetUrl = qrUrl || (typeof window !== "undefined" ? window.location.origin : "");

  useEffect(() => {
    if (canvasRef.current && targetUrl) {
      QRCode.toCanvas(canvasRef.current, targetUrl, {
        width: 250,
        margin: 2,
        color: {
          dark: "#001424",
          light: "#ffffff",
        },
      });
    }
  }, [targetUrl]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto font-sans">
      {/* Control bar (hidden during print) */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-3 print:hidden">
        <button
          onClick={handlePrint}
          className="bg-[#009539] hover:bg-[#007b2f] text-white px-5 py-2.5 rounded-lg font-bold text-sm shadow-xl flex items-center gap-2 transition cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          <span>인쇄하기 (A4 출력)</span>
        </button>
        <button
          onClick={onClose}
          className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-lg transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Printable Poster Sheet (A4 Proportion) */}
      <div className="bg-white text-slate-900 w-full max-w-[760px] p-8 sm:p-12 rounded-xl shadow-2xl border-4 border-slate-300 print:border-none print:shadow-none print:m-0 print:p-6 print:w-full">
        {/* Header */}
        <div className="flex justify-between items-center border-b-2 border-slate-900 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <img src="/ci.png" alt="HD Hyundai Samho" className="h-10 object-contain" onError={(e) => (e.currentTarget.style.display = "none")} />
            <div>
              <div className="font-extrabold text-lg tracking-tight text-[#002c5f]">HD현대삼호</div>
              <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Foreign Workforce Evaluation</div>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block bg-blue-100 text-[#002c5f] text-xs font-bold px-3 py-1 rounded border border-blue-200">
              24시간 유효 모바일 검사장
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-4">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-1">
            E-7 외국인 근로자 인성검사
          </h1>
          <p className="text-sm font-bold text-[#009539] tracking-wider uppercase">
            E-7 Foreign Worker Personality Assessment Portal
          </p>
        </div>

        {/* Target Info Badge */}
        <div className="flex justify-center items-center gap-4 mb-5 text-xs font-bold text-slate-800 bg-slate-100 py-2 px-4 rounded-lg border border-slate-300">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-blue-700" />
            <span>응시 업체: <span className="text-[#002c5f] font-black">{company}</span></span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#009539]" />
            <span>검사 일자: <span className="text-slate-900 font-black">{examDate}</span></span>
          </div>
        </div>

        {/* Central QR Code Area */}
        <div className="bg-slate-50 border-2 border-dashed border-slate-400 rounded-2xl p-6 text-center mb-6">
          <div className="flex flex-col items-center justify-center">
            <div className="bg-white p-4 rounded-xl border border-slate-300 shadow-md inline-block">
              <canvas ref={canvasRef} className="block" />
            </div>
            <p className="text-sm font-bold text-slate-800 mt-3">
              스마트폰 카메라로 QR 코드를 스캔하여 수험번호와 이름만 입력 후 응시하세요.
            </p>
          </div>
        </div>

        {/* Multi-language Instructions */}
        <div className="space-y-3 bg-slate-100 p-4 rounded-xl text-xs text-slate-800 mb-6">
          <div className="font-bold text-slate-900 border-b border-slate-300 pb-1.5 flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#009539]" />
            <span>응시 안내 (5개 언어)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] leading-relaxed">
            <div>
              <strong>🇰🇷 한국어:</strong> QR 스캔 후 <strong>수험번호</strong>와 <strong>이름</strong>만 입력하고 검사를 시작하세요.
            </div>
            <div>
              <strong>🇻🇳 Tiếng Việt:</strong> Quét mã QR, chỉ cần nhập <strong>số báo danh</strong> và <strong>họ tên</strong> để bắt đầu.
            </div>
            <div>
              <strong>🇮🇩 Bahasa:</strong> Pindai QR, masukkan <strong>nomor peserta</strong> dan <strong>nama</strong> untuk memulai.
            </div>
            <div>
              <strong>🇬🇧 English:</strong> Scan the QR code, enter only your <strong>ID number</strong> and <strong>name</strong> to start.
            </div>
            <div className="sm:col-span-2">
              <strong>🇳🇵 नेपाली:</strong> QR स्क्यान गरी <strong>आईडी</strong> र <strong>नाम</strong> मात्र लेखेर परीक्षा सुरु गर्नुहोस्।
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500 font-mono">
          HD HYUNDAI SAMHO HR EVALUATION SYSTEM (24-HOUR SECURE SESSION)
        </div>
      </div>
    </div>
  );
};
