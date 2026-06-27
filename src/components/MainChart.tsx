import React, { useEffect, useRef } from "react";
import {
  Chart,
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Legend,
  Tooltip,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";

// Register all required Chart.js controllers and elements
Chart.register(
  BarController,
  LineController,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Legend,
  Tooltip,
  ChartDataLabels
);

interface MainChartProps {
  personalDetails: Record<string, number>;
  averageDetails: Record<string, string>;
}

export const MainChart: React.FC<MainChartProps> = ({ personalDetails, averageDetails }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<Chart | null>(null);

  const MGMT_GUIDE_LABELS: Record<string, string> = {
    C1: "근태·시간",
    C2: "책임감",
    R1: "규정 준수",
    R2: "정직성",
    T1: "협력 태도",
    T2: "갈등 관리",
    E1: "감정 조절",
    E2: "스트레스 관리",
    S1: "안전 수칙",
    S2: "위험 인지",
    A1: "학습 능력",
    A2: "조직 적응",
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    // Destroy existing chart instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const keys = Object.keys(personalDetails);
    const labels = keys.map((k) => MGMT_GUIDE_LABELS[k] || k);
    const personalData = keys.map((k) => personalDetails[k] || 0);
    const averageData = keys.map((k) => parseFloat(averageDetails[k] || "0"));

    chartInstanceRef.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "전체 평균",
            data: averageData,
            type: "line",
            borderColor: "#ef4444",
            borderWidth: 2,
            pointBackgroundColor: "#ef4444",
            tension: 0.4,
            order: 0,
            datalabels: {
              color: "#ef4444",
              anchor: "start",
              align: "right",
              offset: 6,
              font: { weight: "bold", size: 10 },
              formatter: Math.round,
            },
          },
          {
            label: "본인 점수",
            data: personalData,
            backgroundColor: "rgba(30, 58, 138, 0.85)",
            borderRadius: 4,
            barPercentage: 0.8,
            categoryPercentage: 0.8,
            order: 1,
            datalabels: {
              color: "white",
              anchor: "center",
              align: "center",
              font: { weight: "bold", size: 11 },
              formatter: Math.round,
            },
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: "#e2e8f0" },
            ticks: {
              font: { size: 10, weight: "bold" },
            },
          },
          y: {
            grid: { display: false },
            ticks: {
              font: {
                weight: "bold",
                size: 11,
              },
              color: "#334155",
            },
          },
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              font: { size: 11, weight: "bold" },
            },
          },
          tooltip: {
            enabled: true,
          },
        },
        layout: {
          padding: { right: 20 },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [personalDetails, averageDetails]);

  return (
    <div className="w-full h-full relative" style={{ minHeight: "100%" }}>
      <canvas ref={canvasRef} />
    </div>
  );
};
