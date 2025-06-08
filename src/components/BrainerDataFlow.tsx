"use client";

import React from "react";
import { motion } from "framer-motion";
import { Brain, Mic, Camera, FileText, SparklesIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrainerDataFlowProps {
  className?: string;
}

const BrainerDataFlow = ({ className }: BrainerDataFlowProps) => {
  return (
    <div
      className={cn(
        "relative flex h-[350px] w-full max-w-[500px] flex-col items-center",
        className
      )}
    >
      {/* SVG Paths  */}
      <svg
        className="h-full w-full text-indigo-400/40"
        width="100%"
        height="100%"
        viewBox="0 0 200 100"
      >
        <g
          stroke="currentColor"
          fill="none"
          strokeWidth="0.4"
          strokeDasharray="100 100"
          pathLength="100"
        >
          <path d="M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 10" />
          <path d="M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 10" />
          <path d="M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 10" />
          <path d="M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 10" />
          {/* Animation For Path Starting */}
          <animate
            attributeName="stroke-dashoffset"
            from="100"
            to="0"
            dur="1s"
            fill="freeze"
            calcMode="spline"
            keySplines="0.25,0.1,0.5,1"
            keyTimes="0; 1"
          />
        </g>
        {/* Animated Lights */}
        <g mask="url(#db-mask-1)">
          <circle
            className="database db-light-1"
            cx="0"
            cy="0"
            r="12"
            fill="url(#db-indigo-grad)"
          />
        </g>
        <g mask="url(#db-mask-2)">
          <circle
            className="database db-light-2"
            cx="0"
            cy="0"
            r="12"
            fill="url(#db-indigo-grad)"
          />
        </g>
        <g mask="url(#db-mask-3)">
          <circle
            className="database db-light-3"
            cx="0"
            cy="0"
            r="12"
            fill="url(#db-indigo-grad)"
          />
        </g>
        <g mask="url(#db-mask-4)">
          <circle
            className="database db-light-4"
            cx="0"
            cy="0"
            r="12"
            fill="url(#db-indigo-grad)"
          />
        </g>
        {/* Input Method Buttons */}
        <g stroke="currentColor" fill="none" strokeWidth="0.4">
          {/* Notes Button */}
          <g>
            <rect
              fill="#1e1b4b"
              stroke="#6366f1"
              strokeWidth="0.2"
              x="14"
              y="5"
              width="34"
              height="10"
              rx="5"
            ></rect>
            <FileText x={18} y={7.5} size={4} stroke="white" />
            <text
              x="28"
              y="12"
              fill="white"
              stroke="none"
              fontSize="5"
              fontWeight="500"
            >
              Notes
            </text>
          </g>
          {/* Voice Button */}
          <g>
            <rect
              fill="#1e1b4b"
              stroke="#6366f1"
              strokeWidth="0.2"
              x="60"
              y="5"
              width="34"
              height="10"
              rx="5"
            ></rect>
            <Mic x={64} y={7.5} size={4} stroke="white" />
            <text
              x="74"
              y="12"
              fill="white"
              stroke="none"
              fontSize="5"
              fontWeight="500"
            >
              Voice
            </text>
          </g>
          {/* Camera Button */}
          <g>
            <rect
              fill="#1e1b4b"
              stroke="#6366f1"
              strokeWidth="0.2"
              x="106"
              y="5"
              width="36"
              height="10"
              rx="5"
            ></rect>
            <Camera x={110} y={8} size={4} stroke="white" />
            <text
              x="124"
              y="12"
              fill="white"
              stroke="none"
              fontSize="4.2"
              fontWeight="500"
              textAnchor="middle"
            >
              Capture
            </text>
          </g>
          {/* AI Processing Button */}
          <g>
            <rect
              fill="#1e1b4b"
              stroke="#6366f1"
              strokeWidth="0.2"
              x="148"
              y="5"
              width="42"
              height="10"
              rx="5"
            ></rect>
            <SparklesIcon x={152} y={8} size={4} stroke="white" />
            <text
              x="169"
              y="12"
              fill="white"
              stroke="none"
              fontSize="4.2"
              fontWeight="500"
              textAnchor="middle"
            >
              AI Process
            </text>
          </g>
        </g>
        <defs>
          {/* Path masks for animations */}
          <mask id="db-mask-1">
            <path
              d="M 31 10 v 15 q 0 5 5 5 h 59 q 5 0 5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <mask id="db-mask-2">
            <path
              d="M 77 10 v 10 q 0 5 5 5 h 13 q 5 0 5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <mask id="db-mask-3">
            <path
              d="M 124 10 v 10 q 0 5 -5 5 h -14 q -5 0 -5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          <mask id="db-mask-4">
            <path
              d="M 170 10 v 15 q 0 5 -5 5 h -60 q -5 0 -5 5 v 10"
              strokeWidth="0.5"
              stroke="white"
            />
          </mask>
          {/* Indigo Gradient */}
          <radialGradient id="db-indigo-grad" fx="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>
      {/* Main Memory Core Box */}
      <div className="absolute bottom-10 flex w-full flex-col items-center">
        {/* bottom shadow */}
        <div className="absolute -bottom-4 h-[100px] w-[62%] rounded-lg bg-indigo-500/10" />
        {/* box title */}
        <div className="absolute -top-3 z-20 flex items-center justify-center rounded-lg border border-indigo-500/30 bg-[#101112] px-2 py-1 sm:-top-4 sm:py-1.5">
          <SparklesIcon className="size-3 text-indigo-400" />
          <span className="ml-2 text-[10px] text-gray-300">
            AI-powered memory processing and intelligent recall
          </span>
        </div>
        {/* brain circle */}
        <div className="absolute -bottom-8 z-30 grid h-[60px] w-[60px] place-items-center rounded-full border-t border-indigo-500/50 bg-[#141516] font-semibold text-xs text-indigo-400">
          🧠
        </div>
        {/* box content */}
        <div className="relative z-10 flex h-[150px] w-full items-center justify-center overflow-hidden rounded-lg border border-gray-700 bg-gray-900/50 shadow-md">
          {/* Feature Badges */}
          <div className="absolute bottom-8 left-12 z-10 h-7 rounded-full bg-[#101112] px-3 text-xs border border-indigo-500/30 flex items-center gap-2 ">
            <Brain className="size-4 text-indigo-400" />
            <span className="text-gray-300">Memory Core</span>
          </div>
          <div className="absolute right-16 z-10 hidden h-7 rounded-full bg-[#101112] px-3 text-xs sm:flex border border-indigo-500/30 items-center gap-2">
            <SparklesIcon className="size-4 text-indigo-400" />
            <span className="text-gray-300">Smart Insights</span>
          </div>
          {/* Pulsing Circles - Memory Waves */}
          <motion.div
            className="absolute -bottom-14 h-[100px] w-[100px] rounded-full border-t border-indigo-500/20 bg-indigo-500/5"
            animate={{
              scale: [0.98, 1.02, 0.98, 1, 1, 1, 1, 1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-20 h-[145px] w-[145px] rounded-full border-t border-indigo-500/15 bg-indigo-500/3"
            animate={{
              scale: [1, 1, 1, 0.98, 1.02, 0.98, 1, 1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-[100px] h-[190px] w-[190px] rounded-full border-t border-indigo-500/10 bg-indigo-500/2"
            animate={{
              scale: [1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute -bottom-[120px] h-[235px] w-[235px] rounded-full border-t border-indigo-500/5 bg-indigo-500/1"
            animate={{
              scale: [1, 1, 1, 1, 1, 1, 0.98, 1.02, 0.98, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </div>
      </div>
    </div>
  );
};

export default BrainerDataFlow; 