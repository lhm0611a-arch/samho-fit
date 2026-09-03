import React, { useState } from "react";
import { 
  Sparkles, 
  Play, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Shuffle, 
  X, 
  UserCheck, 
  FileText,
  Flame,
  ArrowRight
} from "lucide-react";
import { QUESTIONS_FULL } from "../questions";
import { calculateAll, getStandardDate, AssessmentResult } from "../utils/calculations";

interface AdminTestSimulatorModalProps {
  onClose: () => void;
  onDirectLiveTest: (info: { firstName: string; lastName: string; id: string; company: string; lang: string }) => void;
  onInstantSimulate: (result: AssessmentResult) => void;
  showToast: (msg: string, type?: "info" | "error") => void;
}

export type ScenarioType = "EXCELLENT" | "AVERAGE" | "RISK_SAFETY" | "INSINCERE" | "RANDOM";

export const AdminTestSimulatorModal: React.FC<AdminTestSimulatorModalProps> = ({
  onClose,
  onDirectLiveTest,
  onInstantSimulate,
  showToast,
}) => {
  const [scenario, setScenario] = useState<ScenarioType>("EXCELLENT");
  const [candidateName, setCandidateName] = useState<string>("NGUYEN VAN A (모의응시)");
  const [candidateId, setCandidateId] = useState<string>("TEST-001");
  const [company, setCompany] = useState<string>("HD현대삼호 협력사 (테스트)");
  const [lang, setLang] = useState<string>("kr");
  const [saveToDb, setSaveToDb] = useState<boolean>(true);

  // Generate answering patterns based on scenario
  const generateSimulatedAnswers = (type: ScenarioType): Record<number, number> => {
    const answers: Record<number, number> = {};

    QUESTIONS_FULL.forEach((q) => {
      let val = 3;

      if (type === "EXCELLENT") {
        // High conscientiousness, safety, rules (Scores 85~98, S or A grade, V1 reliability)
        if (q.type === "REL") {
          // Lie scale questions: answered honestly
          if ([85, 86, 87, 88].includes(q.id)) {
            val = Math.random() > 0.6 ? 2 : 1; // Honest admission
          } else if ([93, 94].includes(q.id)) {
            val = 2; // Not exaggerated
          } else {
            val = 3;
          }
        } else if (q.rev) {
          // Reverse worded: disagree (1 or 2)
          val = Math.random() > 0.25 ? 1 : 2;
        } else {
          // Normal: agree (4 or 5)
          val = Math.random() > 0.25 ? 5 : 4;
        }
      } else if (type === "AVERAGE") {
        // Average worker (Scores 68~78, B1/B2 grade, V1/V2)
        if (q.rev) {
          val = Math.random() > 0.5 ? 2 : 3;
        } else {
          val = Math.random() > 0.5 ? 4 : 3;
        }
        if (q.type === "REL") {
          val = 3;
        }
      } else if (type === "RISK_SAFETY") {
        // Safety critical vulnerability (Safety score < 50, C or D grade)
        if (q.type === "S1" || q.type === "S2") {
          // Dangerous tendencies
          val = q.rev ? 5 : 1;
        } else if (q.rev) {
          val = Math.random() > 0.5 ? 2 : 3;
        } else {
          val = Math.random() > 0.5 ? 4 : 3;
        }
      } else if (type === "INSINCERE") {
        // Straight-lining (answering same choice repeatedly -> V3/V4 Insincere)
        val = 4;
        if (q.id > 60) val = 5;
      } else if (type === "RANDOM") {
        // Pure random 1~5
        val = Math.floor(Math.random() * 5) + 1;
      }

      answers[q.id] = val;
    });

    return answers;
  };

  // Run Fast Simulation & Jump to Results
  const handleExecuteSimulation = () => {
    const answers = generateSimulatedAnswers(scenario);
    const fullName = candidateName.trim() || "[TEST] 모의응시자";
    const computed = calculateAll(fullName, answers);

    const simulatedResult: AssessmentResult = {
      ...computed,
      id: candidateId.trim() || `TEST-${Math.floor(100 + Math.random() * 900)}`,
      company: company.trim() || "HD현대삼호 협력사 (테스트)",
      date: getStandardDate(),
      source: "관리자 모의 시뮬레이션",
      lang: lang,
      isTooFast: false,
    };

    onInstantSimulate(simulatedResult);
    showToast(`✨ [${scenario}] 시나리오 모의 검사가 완료되었습니다! 결과표를 확인합니다.`, "info");
    onClose();
  };

  // Start Live Assessment View
  const handleStartLiveTest = () => {
    onDirectLiveTest({
      firstName: candidateName.trim() || "TEST_NAME",
      lastName: "",
      id: candidateId.trim() || "TEST-001",
      company: company.trim() || "HD현대삼호 협력사 (테스트)",
      lang: lang,
    });
    showToast("✍️ 관리자 권한으로 실제 검사 화면에 직접 진입합니다.", "info");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999] overflow-y-auto">
      <div className="bg-slate-900 border border-cyan-500/40 text-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden font-sans my-8">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 border-b border-cyan-500/30 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-white shadow-lg">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white flex items-center gap-2">
                관리자 인성검사 모의 테스트 & 시뮬레이터
                <span className="bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  ADMIN TEST MODE
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                QR 코드 없이 즉시 모의 응답을 생성하여 채점표와 AI 리포트를 검증하거나 직접 풀 수 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Scenario Selection Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 font-mono">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              1. 시뮬레이션 응시 성향 시나리오 선택
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Excellent */}
              <div
                onClick={() => setScenario("EXCELLENT")}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  scenario === "EXCELLENT"
                    ? "bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-400 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/50 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <span>🌟 최우수/우수형 (S / A 등급)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    안전규정 준수율 95%+, 높은 성실성과 조직적응도, 신뢰도 V1 정상
                  </p>
                </div>
              </div>

              {/* Option 2: Average */}
              <div
                onClick={() => setScenario("AVERAGE")}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  scenario === "AVERAGE"
                    ? "bg-blue-950/60 border-blue-400 ring-1 ring-blue-400 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/50 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                    <span>⚖️ 표준/보통형 (B1 / B2 등급)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    일반적인 현장 작업 근로자 수준, 무난한 적응력 및 보통 점수대
                  </p>
                </div>
              </div>

              {/* Option 3: Safety Risk */}
              <div
                onClick={() => setScenario("RISK_SAFETY")}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  scenario === "RISK_SAFETY"
                    ? "bg-red-950/60 border-red-400 ring-1 ring-red-400 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-400/50 flex items-center justify-center text-red-400 shrink-0 mt-0.5">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-red-300 flex items-center gap-1.5">
                    <span>⚠️ 안전취약/주의형 (C / D 등급)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    조선소 위험 과소평가(S1/S2 미달), 안전 규정 무시 성향 시뮬레이션
                  </p>
                </div>
              </div>

              {/* Option 4: Insincere / Straight-line */}
              <div
                onClick={() => setScenario("INSINCERE")}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  scenario === "INSINCERE"
                    ? "bg-amber-950/60 border-amber-400 ring-1 ring-amber-400 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <span>🚫 불성실 일자응답 (V3 / V4 신뢰도 경고)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                    한 번호로 줄세우기 응답 시 신뢰도 검증 알고리즘이 탐지하는지 검증
                  </p>
                </div>
              </div>

              {/* Option 5: Random */}
              <div
                onClick={() => setScenario("RANDOM")}
                className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start gap-3 sm:col-span-2 ${
                  scenario === "RANDOM"
                    ? "bg-purple-950/60 border-purple-400 ring-1 ring-purple-400 text-white"
                    : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                  <Shuffle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <span>🎲 완전 무작위 응답 (Randomized Response)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    1~5점 무작위 응답 데이터로 시스템 계산 및 레이더 차트 매핑 테스트
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Test Candidate Info Form */}
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-3">
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">
              2. 모의 응시자 인적사항 설정
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block mb-1">응시자명 (Name)</span>
                <input
                  type="text"
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <span className="text-slate-400 block mb-1">수험번호 (ID)</span>
                <input
                  type="text"
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <span className="text-slate-400 block mb-1">소속 업체 (Company)</span>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">검사 언어:</span>
                {["kr", "vn", "id", "en", "np"].map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold uppercase transition ${
                      lang === l
                        ? "bg-cyan-500 text-slate-950"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Choice Notice */}
          <div className="bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 rounded-xl p-4 text-xs text-blue-200">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <span>💡 실행 모드 안내</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
              <li><strong>[⚡ 1초 초고속 시뮬레이션]</strong>: 94문항을 즉시 자동 채점하여 <strong>개인 종합 채점표, 6대 역량 방사형 차트, AI 심층 리포트</strong>를 즉시 화면에 띄웁니다.</li>
              <li><strong>[✍️ 실제 시험 화면 직접 풀기]</strong>: QR 인증 없이 1번 문항부터 94번 문항까지 실제 응시자 화면 UI를 직접 풀며 확인합니다.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-slate-950 p-4 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            취소 (Close)
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={handleStartLiveTest}
              className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-blue-400" />
              <span>실제 시험화면 직접 풀기</span>
            </button>

            <button
              onClick={handleExecuteSimulation}
              className="flex-1 sm:flex-none bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Zap className="w-4 h-4 fill-slate-950" />
              <span>⚡ 1초 결과 바로 확인 (추천)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
