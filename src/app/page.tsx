"use client";

import { useState, useEffect, useMemo, useCallback, useSyncExternalStore, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, BookOpen, Brain, Sparkles, ChevronRight,
  Lightbulb, CircleDot, Award, RotateCcw, Sun, Moon,
  ScrollText, ListTree, LayoutGrid, FileText, CheckCircle2, Info,
  NotebookPen, ArrowRight, ZoomIn, ZoomOut, Maximize, Move
} from "lucide-react";
import { LAW_DATA, getTopicColor, type LawQuestion, type LawTopic } from "@/lib/law-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ViewMode = "map" | "list";
type SelectedQuestion = { question: LawQuestion; topic: LawTopic };

const PROGRESS_KEY = "law-mindmap-progress-v1";
const THEME_KEY = "law-mindmap-theme-v1";
const PROGRESS_EVENT = "law-progress-change";
const THEME_EVENT = "law-theme-change";

// ---------------------------------------------------------------------------
// useSyncExternalStore-based hooks (React-recommended pattern for localStorage)
// ---------------------------------------------------------------------------
function subscribeStorage(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(PROGRESS_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(PROGRESS_EVENT, cb);
  };
}

function getStudiedSnapshot() {
  return localStorage.getItem(PROGRESS_KEY) || "[]";
}
function getStudiedServerSnapshot() {
  return "[]";
}

function useStudiedQuestions(): [Set<string>, (qnum: string) => void, () => void] {
  const stored = useSyncExternalStore(subscribeStorage, getStudiedSnapshot, getStudiedServerSnapshot);
  const studiedSet = useMemo(() => {
    try {
      const arr = JSON.parse(stored) as string[];
      return new Set(arr);
    } catch {
      return new Set<string>();
    }
  }, [stored]);

  const toggleStudied = useCallback((qnum: string) => {
    const current = new Set<string>();
    try {
      const arr = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "[]") as string[];
      arr.forEach((x) => current.add(x));
    } catch {}
    if (current.has(qnum)) current.delete(qnum);
    else current.add(qnum);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...current]));
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  }, []);

  const resetStudied = useCallback(() => {
    localStorage.setItem(PROGRESS_KEY, "[]");
    window.dispatchEvent(new Event(PROGRESS_EVENT));
  }, []);

  return [studiedSet, toggleStudied, resetStudied];
}

function subscribeTheme(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(THEME_EVENT, cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(THEME_EVENT, cb);
    mq.removeEventListener("change", cb);
  };
}
function getThemeSnapshot() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function getThemeServerSnapshot() {
  return "light";
}
function useThemeMode(): [boolean, (v: boolean) => void] {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const isDark = theme === "dark";
  const setDark = useCallback((v: boolean) => {
    localStorage.setItem(THEME_KEY, v ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);
  return [isDark, setDark];
}

export default function Home() {
  const [viewMode, setViewMode] = useState<ViewMode>("map");
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<SelectedQuestion | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [darkMode, setDarkMode] = useThemeMode();
  const [studiedQuestions, toggleStudied, resetStudied] = useStudiedQuestions();

  // Apply dark mode class to <html>
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const allQuestions = useMemo(() => {
    return LAW_DATA.topics.flatMap((t) =>
      t.questions.map((q) => ({ ...q, topicNum: t.num, topicTitle: t.title }))
    );
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allQuestions
      .filter((qa) => qa.question.toLowerCase().includes(q) || qa.answer.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, allQuestions]);

  // Filter for search (used by both views)
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return LAW_DATA.topics;
    const q = searchQuery.toLowerCase();
    return LAW_DATA.topics.map((topic) => {
      const titleMatch = topic.title.toLowerCase().includes(q);
      const matchingQuestions = topic.questions.filter(
        (question) =>
          question.question.toLowerCase().includes(q) ||
          question.answer.toLowerCase().includes(q)
      );
      if (titleMatch || matchingQuestions.length > 0) {
        return { ...topic, questions: titleMatch ? topic.questions : matchingQuestions };
      }
      return null;
    }).filter(Boolean) as LawTopic[];
  }, [searchQuery]);

  const totalQuestions = allQuestions.length;
  const studiedCount = studiedQuestions.size;
  const progressPct = totalQuestions > 0 ? (studiedCount / totalQuestions) * 100 : 0;

  const handleQuestionClick = useCallback(
    (question: LawQuestion, topic: LawTopic) => {
      setSelectedQuestion({ question, topic });
      // Auto-mark as studied when opened
      if (!studiedQuestions.has(question.qnum)) {
        toggleStudied(question.qnum);
      }
    },
    [studiedQuestions, toggleStudied]
  );

  const [selectedTopicInfo, setSelectedTopicInfo] = useState<LawTopic | null>(null);

  const handleTopicInfoClick = useCallback((topic: LawTopic) => {
    setSelectedTopicInfo(topic);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-rose-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-amber-200/50 dark:border-slate-800">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-rose-500 flex items-center justify-center shadow-md flex-shrink-0">
              <Scale className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                Foundations of Law
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight truncate">
                Interactive Mind Map · {LAW_DATA.topics.length} Topics · {allQuestions.length} Exam Q&amp;As
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              placeholder="Search questions, topics, cases..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 bg-white/80 dark:bg-slate-900/80 border-amber-200 dark:border-slate-700 focus-visible:ring-amber-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            )}
            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute top-full mt-2 left-0 right-0 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-amber-200 dark:border-slate-700 overflow-hidden z-40"
                >
                  <ScrollArea className="max-h-80">
                    {searchResults.map((result) => {
                      const topic = LAW_DATA.topics.find((t) => t.num === result.topicNum)!;
                      const color = getTopicColor(result.topicNum);
                      return (
                        <button
                          key={result.qnum}
                          onClick={() => {
                            handleQuestionClick(result, topic);
                            setSearchQuery("");
                          }}
                          className="w-full text-left px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 last:border-b-0 flex items-start gap-2"
                        >
                          <div
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: color.accent }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-200 line-clamp-2">
                              {result.question}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {result.qnum} · {result.topicTitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </ScrollArea>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* View toggle */}
          <div className="flex bg-amber-100/60 dark:bg-slate-800/60 rounded-lg p-1">
            <Button
              size="sm"
              variant={viewMode === "map" ? "default" : "ghost"}
              onClick={() => setViewMode("map")}
              className={cn(
                "h-8 px-2.5",
                viewMode === "map"
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-amber-200/40"
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1.5 text-xs">Mind Map</span>
            </Button>
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              onClick={() => setViewMode("list")}
              className={cn(
                "h-8 px-2.5",
                viewMode === "list"
                  ? "bg-amber-500 hover:bg-amber-600 text-white"
                  : "text-slate-600 dark:text-slate-300 hover:bg-amber-200/40"
              )}
            >
              <ListTree className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1.5 text-xs">List</span>
            </Button>
          </div>

          {/* Dark mode toggle */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDarkMode(!darkMode)}
            className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300 hover:bg-amber-100/60 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>

        {/* Progress bar */}
        <div className="container mx-auto px-4 pb-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Award className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0 max-w-xs">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 mb-0.5">
                <span>Study progress</span>
                <span className="font-medium">{studiedCount}/{totalQuestions}</span>
              </div>
              <Progress value={progressPct} className="h-1.5 bg-amber-100 dark:bg-slate-800 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-rose-500" />
            </div>
          </div>
          {studiedCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={resetStudied}
              className="h-7 px-2 text-xs text-slate-500 hover:text-rose-600"
            >
              <RotateCcw className="w-3 h-3 mr-1" /> Reset
            </Button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main
        className={cn(
          "flex-1 py-3 sm:py-6",
          // Map mode uses the full window width — no container side margins
          viewMode === "map" ? "w-full px-1 sm:px-3" : "container mx-auto px-2 sm:px-4"
        )}
      >
        {viewMode === "map" ? (
          <MindMapView
            topics={filteredTopics}
            expandedTopic={expandedTopic}
            setExpandedTopic={setExpandedTopic}
            onQuestionClick={handleQuestionClick}
            onTopicInfoClick={handleTopicInfoClick}
            studiedQuestions={studiedQuestions}
            searchQuery={searchQuery}
          />
        ) : (
          <ListView
            topics={filteredTopics}
            onQuestionClick={handleQuestionClick}
            studiedQuestions={studiedQuestions}
            expandedTopic={expandedTopic}
            setExpandedTopic={setExpandedTopic}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-amber-200/50 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 flex-wrap gap-2">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Click any topic to expand its questions · Click a question to read the model answer
          </span>
          <span>Foundations of Law · Open Book Exam Companion · Winter 2026</span>
        </div>
      </footer>

      {/* Question detail drawer */}
      <QuestionDrawer
        selected={selectedQuestion}
        onClose={() => setSelectedQuestion(null)}
        studied={selectedQuestion ? studiedQuestions.has(selectedQuestion.question.qnum) : false}
        onToggleStudied={() => selectedQuestion && toggleStudied(selectedQuestion.question.qnum)}
      />

      {/* Topic info drawer (key concepts / notes) */}
      <TopicInfoDrawer
        topic={selectedTopicInfo}
        onClose={() => setSelectedTopicInfo(null)}
        studiedQuestions={studiedQuestions}
        onQuestionClick={(q) => {
          if (selectedTopicInfo) {
            handleQuestionClick(q, selectedTopicInfo);
            setSelectedTopicInfo(null);
          }
        }}
      />
    </div>
  );
}

// --- Inline scale icon (kept simple to avoid extra import) ---
function Scale({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
      <path d="M7 21h10" />
      <path d="M12 3v18" />
      <path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
    </svg>
  );
}

// ============================================================================
// Mind Map View — radial SVG layout
// ============================================================================
function MindMapView({
  topics,
  expandedTopic,
  setExpandedTopic,
  onQuestionClick,
  onTopicInfoClick,
  studiedQuestions,
  searchQuery,
}: {
  topics: LawTopic[];
  expandedTopic: number | null;
  setExpandedTopic: (n: number | null) => void;
  onQuestionClick: (q: LawQuestion, t: LawTopic) => void;
  onTopicInfoClick: (t: LawTopic) => void;
  studiedQuestions: Set<string>;
  searchQuery: string;
}) {
  const [size, setSize] = useState(900);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Zoom & pan state (refs mirror state so gesture handlers never read stale values)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<{
    mode: "pan" | "pinch";
    start: { x: number; y: number }; // pan: client coords; pinch: container coords of midpoint
    startPan: { x: number; y: number };
    startDist: number;
    startZoom: number;
  } | null>(null);
  const didInitialFit = useRef(false);

  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 3;

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const applyView = useCallback((z: number, p: { x: number; y: number }) => {
    zoomRef.current = z;
    panRef.current = p;
    setZoom(z);
    setPan(p);
  }, []);

  // Zoom while keeping the content under a given container point stationary.
  // The transform is translate(pan) scale(zoom) around the canvas centre, so
  // the canvas centre sits at (size/2 + pan) in container coordinates.
  const zoomAtPoint = useCallback(
    (cx: number, cy: number, nextZoom: number) => {
      const z0 = zoomRef.current;
      const p0 = panRef.current;
      const z1 = clampZoom(nextZoom);
      const origin = size / 2;
      const k = z1 / z0;
      applyView(z1, {
        x: cx - origin - (cx - origin - p0.x) * k,
        y: cy - origin - (cy - origin - p0.y) * k,
      });
    },
    [size, applyView]
  );

  const zoomIn = useCallback(() => {
    const el = wrapperRef.current;
    if (el) zoomAtPoint(el.clientWidth / 2, el.clientHeight / 2, zoomRef.current * 1.25);
  }, [zoomAtPoint]);
  const zoomOut = useCallback(() => {
    const el = wrapperRef.current;
    if (el) zoomAtPoint(el.clientWidth / 2, el.clientHeight / 2, zoomRef.current / 1.25);
  }, [zoomAtPoint]);

  // Fit the whole map inside the visible container (first load + reset button)
  const fitView = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    if (!cw || !ch) return;
    const z = clampZoom((Math.min(cw, ch) / size) * 0.96);
    applyView(z, { x: (cw - size) / 2, y: (ch - size) / 2 });
  }, [size, applyView]);
  const resetView = fitView;

  useEffect(() => {
    if (!containerRef) return;
    const updateSize = () => {
      const w = containerRef.clientWidth;
      // Use a larger base size so the radial layout has room to breathe
      const h = Math.max(500, window.innerHeight - 200);
      // Generous minimum canvas: on narrow phone screens the layout would
      // otherwise cram 14 nodes into ~400px and clip them at the edges.
      // The map is fitted to the screen via zoom instead.
      const next = Math.max(w, Math.min(w * 1.2, h + 100), 760);
      setSize(next);
      if (!didInitialFit.current) {
        didInitialFit.current = true;
        const cw = containerRef.clientWidth;
        const ch = containerRef.clientHeight;
        const z = clampZoom((Math.min(cw, ch) / next) * 0.96);
        applyView(z, { x: (cw - next) / 2, y: (ch - next) / 2 });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(containerRef);
    return () => observer.disconnect();
  }, [containerRef, applyView]);

  // Native wheel listener: React attaches onWheel as a passive listener, so
  // preventDefault there fails and the page scrolls while trying to zoom.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      zoomAtPoint(
        e.clientX - rect.left,
        e.clientY - rect.top,
        zoomRef.current * Math.exp(-e.deltaY * 0.0012)
      );
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAtPoint]);

  // True after the user's first manual gesture — hides the hint overlay so
  // it never obstructs the map once they start interacting.
  const [hasInteracted, setHasInteracted] = useState(false);

  // Auto-frame: expanding a topic centres and zooms the view on that topic's
  // section (topic tile + its question pills); collapsing refits the whole map.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (expandedTopic === null) {
      if (didInitialFit.current) fitView();
      return;
    }
    const topicIdx = topics.findIndex((t) => t.num === expandedTopic);
    if (topicIdx === -1) return;

    const c = size / 2;
    const tRadius = size * 0.32;
    const qRadius = size * 0.46;
    const step = (2 * Math.PI) / Math.max(topics.length, 1);
    const topicAngle = topicIdx * step - Math.PI / 2;
    const topic = topics[topicIdx];

    // Collect anchor points: the topic tile plus each question pill
    const pts = [
      { x: c + tRadius * Math.cos(topicAngle), y: c + tRadius * Math.sin(topicAngle) },
    ];
    // Question pills — or key-point pills for topics without questions
    const qCount = topic.questions.length || topic.key_concepts.length;
    const qAngleSpread = Math.min(Math.PI * 0.8, qCount * 0.18);
    const qStart = topicAngle - qAngleSpread / 2;
    for (let qi = 0; qi < qCount; qi++) {
      const qa = qCount === 1 ? topicAngle : qStart + (qi / Math.max(qCount - 1, 1)) * qAngleSpread;
      pts.push({ x: c + qRadius * Math.cos(qa), y: c + qRadius * Math.sin(qa) });
    }

    // Bounding box of the section, padded for tile/pill dimensions
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const minX = Math.min(...xs) - 120;
    const maxX = Math.max(...xs) + 120;
    const minY = Math.min(...ys) - 80;
    const maxY = Math.max(...ys) + 80;

    const cw = el.clientWidth;
    const ch = el.clientHeight;
    const z = clampZoom(Math.min(cw / (maxX - minX), ch / (maxY - minY)) * 0.95);
    const boxCenter = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
    // Centre the box: content point maps to origin + (p - origin) * z + pan
    applyView(z, {
      x: cw / 2 - c - (boxCenter.x - c) * z,
      y: ch / 2 - c - (boxCenter.y - c) * z,
    });
  }, [expandedTopic, topics, size, fitView, applyView]);

  const center = size / 2;
  const topicRadius = size * 0.32; // distance from center to topic nodes
  const questionRadius = size * 0.46; // distance from center to question pills

  const isSearching = searchQuery.trim().length > 0;
  const topicCount = topics.length;
  const angleStep = (2 * Math.PI) / Math.max(topicCount, 1);

  // --- Unified pointer gestures: one finger / mouse drag = pan, two fingers = pinch ---
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("[role=\"dialog\"]")) return;
    if (e.button !== 0 && e.pointerType === "mouse") return;
    const el = e.currentTarget as HTMLElement;
    try {
      el.setPointerCapture(e.pointerId);
    } catch {}
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1) {
      gestureRef.current = {
        mode: "pan",
        start: { x: e.clientX, y: e.clientY },
        startPan: { ...panRef.current },
        startDist: 0,
        startZoom: zoomRef.current,
      };
      setIsDragging(true);
    } else if (pointersRef.current.size === 2) {
      const rect = el.getBoundingClientRect();
      const pts = [...pointersRef.current.values()];
      gestureRef.current = {
        mode: "pinch",
        start: {
          x: (pts[0].x + pts[1].x) / 2 - rect.left,
          y: (pts[0].y + pts[1].y) / 2 - rect.top,
        },
        startPan: { ...panRef.current },
        startDist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        startZoom: zoomRef.current,
      };
      setIsDragging(true);
    }
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!pointersRef.current.has(e.pointerId)) return;
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const g = gestureRef.current;
      if (!g) return;
      const origin = size / 2;

      if (g.mode === "pinch" && pointersRef.current.size >= 2) {
        const el = wrapperRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const pts = [...pointersRef.current.values()];
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const mid = {
          x: (pts[0].x + pts[1].x) / 2 - rect.left,
          y: (pts[0].y + pts[1].y) / 2 - rect.top,
        };
        const z1 = clampZoom(g.startZoom * (dist / Math.max(g.startDist, 1)));
        const k = z1 / g.startZoom;
        // Zoom anchored at the pinch-start midpoint, then follow midpoint drift
        applyView(z1, {
          x: g.start.x - origin - (g.start.x - origin - g.startPan.x) * k + (mid.x - g.start.x),
          y: g.start.y - origin - (g.start.y - origin - g.startPan.y) * k + (mid.y - g.start.y),
        });
      } else if (g.mode === "pan") {
        applyView(zoomRef.current, {
          x: g.startPan.x + (e.clientX - g.start.x),
          y: g.startPan.y + (e.clientY - g.start.y),
        });
      }
    },
    [size, applyView]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    if (pointersRef.current.size === 1) {
      // One finger lifted after a pinch — continue panning with the remaining finger
      const remaining = [...pointersRef.current.values()][0];
      gestureRef.current = {
        mode: "pan",
        start: { ...remaining },
        startPan: { ...panRef.current },
        startDist: 0,
        startZoom: zoomRef.current,
      };
    } else if (pointersRef.current.size === 0) {
      gestureRef.current = null;
      setIsDragging(false);
    }
  }, []);

  return (
    <div ref={setContainerRef} className="w-full relative mindmap-viewport" style={{ minHeight: 400 }}>
      <div
        ref={wrapperRef}
        className="absolute inset-0 rounded-2xl"
        style={{
          cursor: isDragging ? "grabbing" : "grab",
          touchAction: "none",
          overflow: "hidden",
        }}
        onPointerDownCapture={() => setHasInteracted(true)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Zoom / pan transform layer */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
            width: size,
            height: size,
            transition: isDragging ? "none" : "transform 0.3s ease-out",
          }}
        >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0"
        >
          {/* Background decorative circles */}
          <circle
            cx={center}
            cy={center}
            r={topicRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="4 8"
            className="text-amber-300/30 dark:text-amber-700/20"
          />
          <circle
            cx={center}
            cy={center}
            r={questionRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="2 10"
            className="text-rose-300/20 dark:text-rose-800/20"
          />

          {/* Connection lines: center -> each topic */}
          {topics.map((topic, i) => {
            const angle = i * angleStep - Math.PI / 2; // start at top
            const x = center + topicRadius * Math.cos(angle);
            const y = center + topicRadius * Math.sin(angle);
            const color = getTopicColor(topic.num);
            const isExpanded = expandedTopic === topic.num;
            return (
              <line
                key={`line-${topic.num}`}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke={color.accent}
                strokeWidth={isExpanded ? 3 : 1.5}
                strokeOpacity={isExpanded ? 0.9 : 0.4}
                className="transition-all duration-300"
              />
            );
          })}

          {/* Connection lines: expanded topic -> its questions */}
          <AnimatePresence>
            {expandedTopic !== null && (() => {
              const topic = topics.find((t) => t.num === expandedTopic);
              if (!topic) return null;
              const topicIdx = topics.findIndex((t) => t.num === expandedTopic);
              const topicAngle = topicIdx * angleStep - Math.PI / 2;
              const tx = center + topicRadius * Math.cos(topicAngle);
              const ty = center + topicRadius * Math.sin(topicAngle);
              const color = getTopicColor(topic.num);
              // Question pills — or key-point pills for topics without questions
            const qCount = topic.questions.length || topic.key_concepts.length;
              const qAngleSpread = Math.min(Math.PI * 0.8, qCount * 0.18);
              const qStart = topicAngle - qAngleSpread / 2;
              return topic.questions.map((q, qi) => {
                const qa = qCount === 1 ? topicAngle : qStart + (qi / Math.max(qCount - 1, 1)) * qAngleSpread;
                const qx = center + questionRadius * Math.cos(qa);
                const qy = center + questionRadius * Math.sin(qa);
                return (
                  <motion.line
                    key={`qline-${topic.num}-${q.qnum}`}
                    x1={tx}
                    y1={ty}
                    x2={qx}
                    y2={qy}
                    stroke={color.ring}
                    strokeWidth={1.5}
                    strokeOpacity={0.7}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 0.7 }}
                    exit={{ pathLength: 0, opacity: 0 }}
                    transition={{ duration: 0.3, delay: qi * 0.04 }}
                  />
                );
              });
            })()}
          </AnimatePresence>
        </svg>

        {/* Central node */}
        <div
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center"
          style={{ left: center, top: center }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-amber-500 via-rose-500 to-purple-600 flex flex-col items-center justify-center text-white shadow-2xl shadow-rose-500/30"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/20 to-transparent" />
            <Scale className="w-7 h-7 sm:w-8 sm:h-8 mb-1 relative z-10" />
            <div className="text-[10px] sm:text-xs font-bold uppercase tracking-wider relative z-10 text-center px-2 leading-tight">
              Foundations
              <br />
              of Law
            </div>
            {/* Pulsing ring */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-amber-300"
              animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        </div>

        {/* Topic nodes */}
        {topics.map((topic, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + topicRadius * Math.cos(angle);
          const y = center + topicRadius * Math.sin(angle);
          const color = getTopicColor(topic.num);
          const isExpanded = expandedTopic === topic.num;
          const studiedInTopic = topic.questions.filter((q) => studiedQuestions.has(q.qnum)).length;
          return (
            <motion.button
              key={`topic-${topic.num}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: i * 0.04 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setExpandedTopic(isExpanded ? null : topic.num)}
              className="absolute z-20 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center group cursor-pointer focus:outline-none"
              style={{ left: x, top: y, width: 96, height: 96 }}
              aria-label={`Topic ${topic.num}: ${topic.title}`}
            >
              <div
                className={cn(
                  "relative w-20 h-20 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-all duration-300 border-2",
                  isExpanded ? "shadow-xl scale-105" : "group-hover:shadow-xl"
                )}
                style={{
                  backgroundColor: color.bg,
                  borderColor: isExpanded ? color.accent : color.ring,
                  borderWidth: isExpanded ? 3 : 2,
                }}
              >
                <div
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center text-white shadow-md"
                  style={{ backgroundColor: color.accent }}
                >
                  {topic.num}
                </div>
                {/* Studied indicator (bottom-right corner — info button took top-left) */}
                {studiedInTopic === topic.questions.length && topic.questions.length > 0 && (
                  <div className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                )}
                <BookOpen
                  className="w-4 h-4 mb-0.5"
                  style={{ color: color.accent }}
                />
                <div
                  className="text-[9px] font-semibold text-center px-1 leading-tight line-clamp-3"
                  style={{ color: color.fg }}
                >
                  {topic.title.length > 30 ? topic.title.slice(0, 28) + "…" : topic.title}
                </div>
              </div>
              {/* Question count badge */}
              <div className="mt-1 text-[9px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CircleDot className="w-2.5 h-2.5" style={{ color: color.accent }} />
                {topic.questions.length > 0
                  ? `${topic.questions.length} Q${topic.questions.length > 1 ? "s" : ""}`
                  : `${topic.key_concepts.length} notes`}
                {studiedInTopic > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">· {studiedInTopic}✓</span>
                )}
              </div>
            </motion.button>
          );
        })}

        {/* Topic info buttons (circular, fixed at the top-left corner
            of each tile — directly left of the number badge which is top-right) */}
        {topics.map((topic, i) => {
          const angle = i * angleStep - Math.PI / 2;
          const x = center + topicRadius * Math.cos(angle);
          const y = center + topicRadius * Math.sin(angle);
          const color = getTopicColor(topic.num);
          // Fixed diagonal offset: top-left corner of the 80px tile.
          // Number badge sits at +36,-36 (top-right); info button mirrors it at -36,-36 (top-left).
          const infoX = x - 36;
          const infoY = y - 36;
          return (
            <motion.button
              key={`info-${topic.num}`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 18, delay: i * 0.04 + 0.1 }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onTopicInfoClick(topic);
              }}
              className="absolute z-30 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer focus:outline-none group/info"
              style={{ left: infoX, top: infoY }}
              aria-label={`View topic ${topic.num} notes and key concepts`}
              title={`Topic ${topic.num} notes`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shadow-md border-2 transition-all duration-200 group-hover/info:shadow-lg"
                style={{
                  backgroundColor: "white",
                  borderColor: color.accent,
                }}
              >
                <Info
                  className="w-3.5 h-3.5"
                  style={{ color: color.accent }}
                  strokeWidth={2.5}
                />
              </div>
            </motion.button>
          );
        })}

        {/* Question pills (for expanded topic) */}
        <AnimatePresence>
          {expandedTopic !== null && (() => {
            const topic = topics.find((t) => t.num === expandedTopic);
            if (!topic) return null;
            const topicIdx = topics.findIndex((t) => t.num === expandedTopic);
            const topicAngle = topicIdx * angleStep - Math.PI / 2;
            const color = getTopicColor(topic.num);
            // Topics without questions (e.g. topic 15 exam-day briefing)
            // surface their key points as pills instead, so every number on
            // the wheel expands the same way.
            const pills =
              topic.questions.length > 0
                ? topic.questions.map((q) => ({ kind: "question" as const, q }))
                : topic.key_concepts.map((text, ci) => ({ kind: "concept" as const, text, ci }));
            const qCount = pills.length;
            const qAngleSpread = Math.min(Math.PI * 0.8, qCount * 0.18);
            const qStart = topicAngle - qAngleSpread / 2;
            return pills.map((pill, qi) => {
              const qa = qCount === 1 ? topicAngle : qStart + (qi / Math.max(qCount - 1, 1)) * qAngleSpread;
              const qx = center + questionRadius * Math.cos(qa);
              const qy = center + questionRadius * Math.sin(qa);
              const isQuestion = pill.kind === "question";
              const isStudied = isQuestion ? studiedQuestions.has(pill.q.qnum) : false;
              return (
                <motion.button
                  key={isQuestion ? `q-${pill.q.qnum}` : `c-${topic.num}-${pill.ci}`}
                  initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: qi * 0.06 }}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() =>
                    isQuestion ? onQuestionClick(pill.q, topic) : onTopicInfoClick(topic)
                  }
                  className="absolute z-30 -translate-x-1/2 -translate-y-1/2 group"
                  style={{ left: qx, top: qy }}
                  aria-label={
                    isQuestion
                      ? `Open question ${pill.q.qnum}`
                      : `Key point ${pill.ci + 1} — open topic notes`
                  }
                >
                  <div
                    className="rounded-xl shadow-md hover:shadow-xl transition-shadow px-2.5 py-1.5 max-w-[180px] border-2 flex items-start gap-1.5 backdrop-blur-sm"
                    style={{
                      backgroundColor: `${color.bg}f5`,
                      borderColor: color.ring,
                    }}
                  >
                    {isStudied ? (
                      <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0 text-emerald-500" />
                    ) : isQuestion ? (
                      <Lightbulb className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: color.accent }} />
                    ) : (
                      <ScrollText className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: color.accent }} />
                    )}
                    <div className="min-w-0">
                      <div
                        className="text-[8px] font-bold uppercase tracking-wide mb-0.5"
                        style={{ color: color.accent }}
                      >
                        {isQuestion
                          ? `${pill.q.qnum} · Tap to read answer`
                          : `Key point ${pill.ci + 1} · Tap for notes`}
                      </div>
                      <div
                        className="text-[10px] font-medium leading-tight line-clamp-3"
                        style={{ color: color.fg }}
                      >
                        {isQuestion ? pill.q.question : pill.text}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            });
          })()}
        </AnimatePresence>

        {/* Empty state when search has no matches */}
        {topics.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-slate-500 dark:text-slate-400">
              <Search className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium">No matches found</p>
              <p className="text-xs">Try a different keyword</p>
            </div>
          </div>
        )}
        </div>{/* end zoom/pan transform layer */}
      </div>

      {/* Zoom controls (floating, bottom-right of the mind map) */}
      <div className="absolute bottom-3 right-3 z-40 flex flex-col items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-xl shadow-lg border border-amber-200/60 dark:border-slate-700 p-1.5">
        <button
          onClick={zoomIn}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-amber-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Zoom in"
          title="Zoom in (scroll or pinch)"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums select-none">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={zoomOut}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-amber-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Zoom out"
          title="Zoom out (scroll or pinch)"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="w-full h-px bg-amber-200/60 dark:bg-slate-700 my-0.5" />
        <button
          onClick={resetView}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-amber-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40"
          aria-label="Fit map to screen"
          title="Fit map to screen"
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Hint badge (top-left of the mind map — hidden after first interaction
          so it never obstructs the view) */}
      {!hasInteracted && !isDragging && (
        <div className="absolute top-3 left-3 z-40 flex items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm rounded-lg shadow-sm border border-amber-200/50 dark:border-slate-700 px-2.5 py-1.5 text-[10px] text-slate-500 dark:text-slate-400">
          <Move className="w-3 h-3" />
          <span className="hidden sm:inline">Drag to pan · Scroll/pinch to zoom</span>
          <span className="sm:hidden">Drag to pan · Pinch to zoom</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// List View — accordion-style
// ============================================================================
function ListView({
  topics,
  onQuestionClick,
  studiedQuestions,
  expandedTopic,
  setExpandedTopic,
}: {
  topics: LawTopic[];
  onQuestionClick: (q: LawQuestion, t: LawTopic) => void;
  studiedQuestions: Set<string>;
  expandedTopic: number | null;
  setExpandedTopic: (n: number | null) => void;
}) {
  if (topics.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500 dark:text-slate-400">
        <Search className="w-12 h-12 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">No matches found</p>
        <p className="text-xs">Try a different keyword</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-w-4xl mx-auto">
      {topics.map((topic) => {
        const color = getTopicColor(topic.num);
        const isExpanded = expandedTopic === topic.num;
        const studiedInTopic = topic.questions.filter((q) => studiedQuestions.has(q.qnum)).length;
        return (
          <motion.div
            key={topic.num}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden border-2 shadow-sm"
            style={{ borderColor: color.ring, backgroundColor: color.bg }}
          >
            <button
              onClick={() => setExpandedTopic(isExpanded ? null : topic.num)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                style={{ backgroundColor: color.accent }}
              >
                {topic.num}
              </div>
              <div className="flex-1 min-w-0">
                <h3
                  className="font-semibold text-sm leading-tight"
                  style={{ color: color.fg }}
                >
                  {topic.title}
                </h3>
                <p className="text-xs opacity-70 mt-0.5" style={{ color: color.fg }}>
                  {topic.questions.length} question{topic.questions.length > 1 ? "s" : ""}
                  {studiedInTopic > 0 && ` · ${studiedInTopic} studied`}
                </p>
              </div>
              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }}>
                <ChevronRight className="w-4 h-4" style={{ color: color.accent }} />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-3 space-y-2">
                    {/* Key concepts */}
                    {topic.key_concepts.length > 0 && (
                      <div className="rounded-lg bg-white/50 dark:bg-slate-900/30 p-3 mb-2">
                        <p className="text-[10px] font-bold uppercase tracking-wide mb-1.5 flex items-center gap-1" style={{ color: color.accent }}>
                          <ScrollText className="w-3 h-3" /> Key concepts
                        </p>
                        <ul className="space-y-1">
                          {topic.key_concepts.slice(0, 6).map((concept, ci) => (
                            <li key={ci} className="text-xs leading-snug flex gap-1.5" style={{ color: color.fg }}>
                              <span className="opacity-50">•</span>
                              <span className="line-clamp-2">{concept}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Questions */}
                    {topic.questions.map((q) => {
                      const isStudied = studiedQuestions.has(q.qnum);
                      return (
                        <button
                          key={q.qnum}
                          onClick={() => onQuestionClick(q, topic)}
                          className="w-full text-left rounded-lg bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 px-3 py-2.5 transition-colors border border-black/5 dark:border-white/5 group"
                        >
                          <div className="flex items-start gap-2">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: color.accent }}
                            >
                              {q.qnum.replace("Q", "")}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-200 leading-snug line-clamp-2 group-hover:text-slate-900 dark:group-hover:text-white">
                                {q.question}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <FileText className="w-2.5 h-2.5" />
                                  Model answer · ~{Math.max(150, Math.round(q.answer.length / 5))} words
                                </span>
                                {isStudied && (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Studied
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 mt-1 flex-shrink-0" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Question Drawer — slide-out answer panel
// ============================================================================
function QuestionDrawer({
  selected,
  onClose,
  studied,
  onToggleStudied,
}: {
  selected: SelectedQuestion | null;
  onClose: () => void;
  studied: boolean;
  onToggleStudied: () => void;
}) {
  const color = selected ? getTopicColor(selected.topic.num) : null;

  return (
    <Sheet open={!!selected} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col",
          color && "[&>button]:text-slate-500"
        )}
        style={color ? { backgroundColor: `${color.bg}` } : undefined}
      >
        {selected && color && (
          <>
            {/* Header */}
            <SheetHeader className="px-5 pt-5 pb-3 border-b" style={{ borderColor: `${color.ring}80` }}>
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                  style={{ backgroundColor: color.accent }}
                >
                  Topic {selected.topic.num} · {selected.topic.title}
                </div>
              </div>
              <SheetTitle
                className="text-base sm:text-lg font-bold leading-snug"
                style={{ color: color.fg }}
              >
                {selected.question.qnum}. {selected.question.question}
              </SheetTitle>
              <SheetDescription className="text-xs flex items-center gap-3 mt-1" style={{ color: color.fg }}>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Model exam answer · ~250 words
                </span>
                <span className="flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Adapt, don&apos;t copy
                </span>
              </SheetDescription>
            </SheetHeader>

            {/* Answer body */}
            <div
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="px-5 py-4 space-y-4">
                <AnswerBody answer={selected.question.answer} color={color} />
              </div>
            </div>

            {/* Footer with mark-as-studied toggle */}
            <div
              className="border-t px-5 py-3 flex items-center justify-between gap-2"
              style={{ borderColor: `${color.ring}80`, backgroundColor: `${color.bg}e6` }}
            >
              <Button
                variant={studied ? "default" : "outline"}
                size="sm"
                onClick={onToggleStudied}
                className={cn(
                  studied
                    ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500"
                    : "border-emerald-500 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                )}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                {studied ? "Marked as studied" : "Mark as studied"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-600 dark:text-slate-300">
                Close
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Answer body renderer — converts plain text answer into nicely formatted HTML
// ============================================================================
function AnswerBody({ answer, color }: { answer: string; color: { accent: string; fg: string; ring: string } }) {
  // Strip the leading "Answer." prefix if present
  const cleaned = answer.replace(/^Answer\.\s*/, "");
  // Split into paragraphs (the source uses double newlines)
  const paragraphs = cleaned.split(/\n\n+/).filter(Boolean);

  return (
    <div className="space-y-3">
      {paragraphs.map((para, i) => {
        // Highlight case citations (e.g. "Mabo v Queensland (No 2) (1992) 175 CLR 1")
        // and section references (e.g. "s 109", "s 51(xxvi)")
        const html = highlightLegalTerms(para, color);
        return (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="text-sm leading-relaxed"
            style={{ color: color.fg }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      })}
    </div>
  );
}

function highlightLegalTerms(text: string, color: { accent: string; ring: string; fg: string }): string {
  // Escape HTML first so user text can never inject markup
  let s = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // ---------------------------------------------------------------------------
  // Placeholder system: each match is replaced with a NUL-delimited token like
  // \x00<index>\x00. All subsequent regex passes operate on plain text only,
  // so no regex ever sees the HTML we've already inserted. This prevents the
  // quote-highlighter (which looks for "..." pairs) from matching the
  // "color:#...; font-weight:600;" values inside <strong>/<code> style attrs.
  // ---------------------------------------------------------------------------
  const placeholders: string[] = [];
  const store = (html: string): string => {
    const id = placeholders.length;
    placeholders.push(html);
    return `\x00${id}\x00`;
  };

  // 1. Quoted text (smart quotes or straight quotes, 5–200 chars)
  //    Run FIRST so the quote content can still contain case names / sections
  //    that later passes will highlight inside the <em>.
  s = s.replace(
    /(["\u201c\u201d'])([^"\u201c\u201d']{5,200})\1/g,
    (match) =>
      store(
        `<em style="color:${color.fg}; background:${color.ring}22; padding:0 2px; border-radius:2px;">${match}</em>`
      )
  );

  // 2. Case citations: "Party A v Party B" with optional year/volume/reporter
  s = s.replace(
    /([A-Z][A-Za-z'\u2019&]+(?:\s+[A-Z][A-Za-z'\u2019&]+){0,4}\s+v\s+[A-Z][A-Za-z'\u2019&]+(?:\s+[A-Z][A-Za-z'\u2019&]+){0,4}(?:\s*\((?:No\s+\d+|\d{4})\))?(?:\s*\[\d{4}\]\s*[A-Z]+(?:\s+\d+)?)?(?:\s*\(\d{4}\)\s*\d+\s+[A-Z]+\s+\d+)?)/g,
    (match) =>
      store(
        `<strong style="color:${color.accent}; font-weight:600;">${match}</strong>`
      )
  );

  // 3. Section references: "s 109", "s 51(xxvi)", "ss 75-76", "s 128"
  s = s.replace(
    /\b(ss?\.?\s*\d+(?:\([a-z0-9]+\))?(?:[-\u2013]\d+)?|s\s+\d+(?:\([a-z0-9]+\))?(?:[-\u2013]\d+)?)\b/g,
    (match) =>
      store(
        `<code style="background:${color.ring}33; color:${color.accent}; padding:0 4px; border-radius:3px; font-family:ui-monospace,monospace; font-size:0.85em; font-weight:600;">${match}</code>`
      )
  );

  // 4. Medium-neutral citations: [2017] HCA 34
  s = s.replace(
    /(\[\d{4}\]\s*[A-Z]{2,}\s*\d+)/g,
    (match) =>
      store(
        `<strong style="color:${color.accent}; font-weight:600;">${match}</strong>`
      )
  );

  // Restore all placeholders back to their HTML in a single pass.
  // \x00 is a NUL char which cannot appear in normal text and won't be matched
  // by any of the regexes above.
  s = s.replace(/\x00(\d+)\x00/g, (_m, id) => placeholders[parseInt(id, 10)]);

  return s;
}

// ============================================================================
// Topic Info Drawer — shows key concepts / notes for a topic
// ============================================================================
function TopicInfoDrawer({
  topic,
  onClose,
  studiedQuestions,
  onQuestionClick,
}: {
  topic: LawTopic | null;
  onClose: () => void;
  studiedQuestions: Set<string>;
  onQuestionClick: (q: LawQuestion) => void;
}) {
  const color = topic ? getTopicColor(topic.num) : null;
  const studiedInTopic = topic
    ? topic.questions.filter((q) => studiedQuestions.has(q.qnum)).length
    : 0;

  // Text zoom for the notes body (pinch or buttons). Applied via the CSS
  // `zoom` property so the text reflows and the panel stays scrollable.
  const [notesZoom, setNotesZoom] = useState(1);
  const notesZoomRef = useRef(1);
  const [notesScrollEl, setNotesScrollEl] = useState<HTMLDivElement | null>(null);

  const applyNotesZoom = useCallback((z: number) => {
    const clamped = Math.min(2, Math.max(0.8, z));
    notesZoomRef.current = clamped;
    setNotesZoom(clamped);
  }, []);

  // Native touch listeners: one finger keeps native scrolling, two fingers
  // pinch-zoom the text. touchmove must be non-passive so the browser's own
  // scroll/zoom handling can be cancelled for the two-finger gesture only.
  // iOS Safari reports pinches via proprietary gesture* events instead of
  // reliable two-finger touchmove, so both mechanisms are handled.
  useEffect(() => {
    if (!notesScrollEl) return;
    const el = notesScrollEl;
    let startDist = 0;
    let startZoom = 1;
    const pinchDist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDist = pinchDist(e.touches);
        startZoom = notesZoomRef.current;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDist > 0) {
        e.preventDefault();
        applyNotesZoom(startZoom * (pinchDist(e.touches) / startDist));
      }
    };
    const onTouchEnd = () => {
      startDist = 0;
    };
    // iOS Safari pinch: preventDefault stops the whole-page zoom and the
    // event's scale factor drives the text zoom instead.
    const onGestureStart = (e: Event) => {
      e.preventDefault();
      startZoom = notesZoomRef.current;
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const scale = (e as Event & { scale?: number }).scale ?? 1;
      applyNotesZoom(startZoom * scale);
    };
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    el.addEventListener("gesturestart", onGestureStart);
    el.addEventListener("gesturechange", onGestureChange);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
    };
  }, [notesScrollEl, applyNotesZoom]);

  return (
    <Sheet open={!!topic} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl p-0 overflow-hidden flex flex-col"
        style={color ? { backgroundColor: `${color.bg}` } : undefined}
      >
        {topic && color && (
          <>
            {/* Header */}
            <SheetHeader className="px-5 pt-5 pb-3 border-b" style={{ borderColor: `${color.ring}80` }}>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <div
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide text-white shadow-sm"
                  style={{ backgroundColor: color.accent }}
                >
                  Topic {topic.num}
                </div>
                <div
                  className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide flex items-center gap-1"
                  style={{ backgroundColor: `${color.ring}55`, color: color.fg }}
                >
                  <NotebookPen className="w-2.5 h-2.5" />
                  Notes &amp; Key Concepts
                </div>
              </div>
              <SheetTitle
                className="text-base sm:text-lg font-bold leading-snug"
                style={{ color: color.fg }}
              >
                {topic.title}
              </SheetTitle>
              <SheetDescription className="text-xs flex items-center gap-3 mt-1" style={{ color: color.fg }}>
                <span className="flex items-center gap-1">
                  <ScrollText className="w-3 h-3" />
                  {topic.key_concepts.length} key concepts
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {topic.questions.length} exam Q&amp;As · {studiedInTopic} studied
                </span>
              </SheetDescription>
            </SheetHeader>

            {/* Body: key concepts list */}
            <div
              ref={setNotesScrollEl}
              className="flex-1 overflow-y-auto overscroll-contain"
              style={{
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-x pan-y",
                zoom: notesZoom,
              }}
            >
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: color.accent }}>
                  <Sparkles className="w-3 h-3" />
                  Key Concepts
                </div>
                {topic.key_concepts.length === 0 ? (
                  <p className="text-xs italic" style={{ color: color.fg }}>
                    No key concepts extracted for this topic.
                  </p>
                ) : (
                  topic.key_concepts.map((concept, ci) => (
                    <motion.div
                      key={ci}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: ci * 0.04 }}
                      className="rounded-lg bg-white/70 dark:bg-slate-900/50 p-3 border"
                      style={{ borderColor: `${color.ring}66` }}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                          style={{ backgroundColor: color.accent }}
                        >
                          {ci + 1}
                        </div>
                        <div
                          className="text-xs leading-relaxed flex-1"
                          style={{ color: color.fg }}
                          dangerouslySetInnerHTML={{ __html: highlightLegalTerms(concept, color) }}
                        />
                      </div>
                    </motion.div>
                  ))
                )}

                {/* Questions section */}
                {topic.questions.length > 0 && (
                  <div className="pt-3 mt-3 border-t" style={{ borderColor: `${color.ring}55` }}>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: color.accent }}>
                      <FileText className="w-3 h-3" />
                      Exam Questions in this Topic
                    </div>
                    <div className="space-y-2">
                      {topic.questions.map((q) => {
                        const isStudied = studiedQuestions.has(q.qnum);
                        return (
                          <button
                            key={q.qnum}
                            onClick={() => onQuestionClick(q)}
                            className="w-full text-left rounded-lg bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900 px-3 py-2.5 transition-colors border group"
                            style={{ borderColor: `${color.ring}44` }}
                          >
                            <div className="flex items-start gap-2">
                              <div
                                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                                style={{ backgroundColor: color.accent }}
                              >
                                {q.qnum.replace("Q", "")}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium leading-snug line-clamp-2" style={{ color: color.fg }}>
                                  {q.question}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[10px] flex items-center gap-0.5" style={{ color: color.fg, opacity: 0.7 }}>
                                    <ArrowRight className="w-2.5 h-2.5" />
                                    Open model answer
                                  </span>
                                  {isStudied && (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5" /> Studied
                                    </span>
                                  )}
                                </div>
                              </div>
                              <ChevronRight className="w-3.5 h-3.5 mt-1 flex-shrink-0 opacity-40 group-hover:opacity-80" style={{ color: color.fg }} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with zoom controls */}
            <div
              className="border-t px-5 py-3 flex items-center justify-between gap-2"
              style={{ borderColor: `${color.ring}80`, backgroundColor: `${color.bg}e6` }}
            >
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyNotesZoom(notesZoomRef.current / 1.2)}
                  disabled={notesZoom <= 0.8}
                  className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300"
                  aria-label="Zoom text out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <button
                  onClick={() => applyNotesZoom(1)}
                  className="text-[11px] font-semibold tabular-nums px-1.5 py-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300"
                  aria-label="Reset text zoom"
                  title="Reset zoom"
                >
                  {Math.round(notesZoom * 100)}%
                </button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => applyNotesZoom(notesZoomRef.current * 1.2)}
                  disabled={notesZoom >= 2}
                  className="h-8 w-8 p-0 text-slate-600 dark:text-slate-300"
                  aria-label="Zoom text in"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </div>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-600 dark:text-slate-300">
                Close
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
