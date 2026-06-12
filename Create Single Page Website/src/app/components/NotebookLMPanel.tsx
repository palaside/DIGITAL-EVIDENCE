import React, { useState, useEffect, useRef } from "react";
import { 
  FileText, Globe, File, Plus, MessageSquare, AudioLines, 
  Table, HelpCircle, GitFork, Clipboard, Sparkles, Send, 
  Trash2, Play, Pause, RotateCw, Download, ArrowRight, 
  CheckCircle, ArrowLeft, Lightbulb, Volume2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "./ui/progress";
import { toast } from "sonner";
import { 
  ACTUAL_SOURCES, NotebookSource, ChatMessage, queryCaseCopilot, 
  MOCK_REPORT_CONTENT, MOCK_DATA_TABLE, MOCK_FLASHCARDS, MOCK_MIND_MAP 
} from "../utils/notebooklmApi";

export function NotebookLMPanel() {
  const [sources, setSources] = useState<NotebookSource[]>(ACTUAL_SOURCES);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "copilot",
      content: `สวัสดีครับพนักงานสอบสวน ยินดีต้อนรับสู่ **NotebookLM Case Copilot** ฐานข้อมูลคดีความมั่นคงสูง **หลักฐานดิจิทัล DIGITAL EVIDENCE** (รหัสคดี: \`4ebd1ce5-dba7-4c90-a0cc-6c9ae0ac6af9\`)

ผมได้อ่านและนำเข้าแหล่งข้อมูลเอกสารทั้ง 14 แฟ้มหลักฐานแล้ว ครอบคลุมระบบ **Slip OCR**, **LINE Chat Paginator** และคู่มือการแพ็กเกจ **SFX Archive**

ต้องการให้ช่วยสรุปความสัมพันธ์ของหลักฐาน หรือให้หาช่องโหว่ทางนิติวิทยาศาสตร์ในส่วนใด พิมพ์ถามได้ทันทีครับ!`,
      timestamp: "16:18",
      sources: ["643eb74d-ff69-4c90-a0cc-643eb74dff69", "ee4f7c50-908c-4c90-a0cc-6c9ae0ac6af9"]
    }
  ]);
  const [inputVal, setInputVal] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  
  // Active viewing window inside Column 2: "chat" | "report" | "table" | "flashcards" | "mindmap" | "podcast"
  const [activeView, setActiveView] = useState<"chat" | "report" | "table" | "flashcards" | "mindmap" | "podcast">("chat");
  
  // Generation progresses
  const [genStatus, setGenStatus] = useState<Record<string, "idle" | "generating" | "done">>({
    report: "idle",
    table: "idle",
    flashcards: "idle",
    mindmap: "idle",
    podcast: "idle",
  });
  
  const [genProgress, setGenProgress] = useState<Record<string, number>>({
    report: 0,
    table: 0,
    flashcards: 0,
    mindmap: 0,
    podcast: 0,
  });

  // Source upload states
  const [showAddSource, setShowAddSource] = useState(false);
  const [sourceType, setSourceType] = useState<"text" | "url">("text");
  const [newTextTitle, setNewTextTitle] = useState("");
  const [newTextBody, setNewTextBody] = useState("");
  const [newUrl, setNewUrl] = useState("");

  // Podcast state
  const [podcastPlaying, setPodcastPlaying] = useState(false);
  const [podcastProgress, setPodcastProgress] = useState(25); // initial progress percent
  const [podcastTime, setPodcastTime] = useState("02:14");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  // Auto scroll chat
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (activeView === "chat") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeView]);

  // Canvas Waveform Animation for Podcast Overview
  useEffect(() => {
    if (activeView !== "podcast") {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let phase = 0;
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;
      
      // Draw ambient background behind waveform
      const grad = ctx.createLinearGradient(0, 0, width, 0);
      grad.addColorStop(0, "rgba(59, 130, 246, 0.05)");
      grad.addColorStop(0.5, "rgba(99, 102, 241, 0.1)");
      grad.addColorStop(1, "rgba(147, 51, 234, 0.05)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      
      // Draw grid lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 20) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      
      // Draw center line
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();

      const waveCount = 4;
      const colors = [
        "rgba(59, 130, 246, 0.7)",  // blue
        "rgba(99, 102, 241, 0.5)",  // indigo
        "rgba(147, 51, 234, 0.3)",  // purple
        "rgba(34, 211, 238, 0.2)",  // cyan
      ];

      // Draw waves
      for (let w = 0; w < waveCount; w++) {
        ctx.beginPath();
        ctx.lineWidth = w === 0 ? 3 : 1.5;
        ctx.strokeStyle = colors[w];
        
        // If not playing, keep a quiet pulse; if playing, make it active
        const multiplier = podcastPlaying ? (1.2 - w * 0.25) : 0.2;
        const speed = podcastPlaying ? (0.08 - w * 0.015) : 0.01;
        const frequency = 0.012 + w * 0.005;

        for (let x = 0; x < width; x++) {
          // Soften edges using sine envelope
          const envelope = Math.sin((x / width) * Math.PI);
          const y = centerY + Math.sin(x * frequency + phase * (w + 1) * speed) * 35 * multiplier * envelope;
          
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }
      
      phase += 1;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [activeView, podcastPlaying]);

  // Podcast progress timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (podcastPlaying && activeView === "podcast") {
      interval = setInterval(() => {
        setPodcastProgress((prev) => {
          if (prev >= 100) {
            setPodcastPlaying(false);
            return 100;
          }
          
          // update display time
          const totalSeconds = 538; // 8:58
          const currentSec = Math.round((prev / 100) * totalSeconds);
          const mins = Math.floor(currentSec / 60);
          const secs = currentSec % 60;
          setPodcastTime(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
          
          return prev + 0.2;
        });
      }, 500);
    }
    return () => clearInterval(interval);
  }, [podcastPlaying, activeView]);

  // Handle document generation
  const triggerGeneration = (type: "report" | "table" | "flashcards" | "mindmap" | "podcast") => {
    if (genStatus[type] === "generating") return;
    
    setGenStatus(prev => ({ ...prev, [type]: "generating" }));
    setGenProgress(prev => ({ ...prev, [type]: 0 }));
    
    toast.info(`Generating ${type.toUpperCase()} from your case files...`);

    const interval = setInterval(() => {
      setGenProgress(prev => {
        const nextVal = prev[type] + 10;
        if (nextVal >= 100) {
          clearInterval(interval);
          setGenStatus(prevStatus => ({ ...prevStatus, [type]: "done" }));
          toast.success(`Successfully synthesized ${type.toUpperCase()}!`);
          setActiveView(type);
          return { ...prev, [type]: 100 };
        }
        return { ...prev, [type]: nextVal };
      });
    }, 200);
  };

  // Add source handler
  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (sourceType === "text") {
      if (!newTextTitle || !newTextBody) {
        toast.error("Please fill in both the title and text content!");
        return;
      }
      const newSource: NotebookSource = {
        id: `local-text-${Date.now()}`,
        title: newTextTitle,
        type: "markdown",
        created: "Today (Just Now)",
        status: "ready",
        wordCount: newTextBody.trim().split(/\s+/).length
      };
      setSources(prev => [newSource, ...prev]);
      toast.success(`Text source "${newTextTitle}" successfully added to Notebook!`);
      setNewTextTitle("");
      setNewTextBody("");
    } else {
      if (!newUrl) {
        toast.error("Please enter a valid URL!");
        return;
      }
      const newSource: NotebookSource = {
        id: `local-url-${Date.now()}`,
        title: newUrl.replace(/https?:\/\/(www\.)?/, ""),
        type: "web",
        created: "Today (Just Now)",
        status: "ready",
        wordCount: 380
      };
      setSources(prev => [newSource, ...prev]);
      toast.success("Web page successfully queued and crawled!");
      setNewUrl("");
    }
    setShowAddSource(false);
  };

  // Chat send handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      sender: "user",
      content: inputVal,
      timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputVal("");
    setIsTyping(true);
    setActiveView("chat");

    try {
      const response = await queryCaseCopilot(userMsg.content);
      
      const copilotMsg: ChatMessage = {
        sender: "copilot",
        content: response.answer,
        timestamp: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }),
        sources: response.sources
      };
      
      setMessages(prev => [...prev, copilotMsg]);
    } catch (err) {
      toast.error("Failed to query case Copilot.");
    } finally {
      setIsTyping(false);
    }
  };

  // Quick prompt suggestions
  const triggerSuggestion = (prompt: string) => {
    setInputVal(prompt);
  };

  const removeSource = (id: string, name: string) => {
    setSources(prev => prev.filter(s => s.id !== id));
    toast.error(`Removed source from notebook: ${name}`);
  };

  // Flashcards state
  const [activeCardIdx, setActiveCardIdx] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mt-2 select-none animate-in fade-in duration-300">
      
      {/* COLUMN 1 (span 3): Document Case Workspace */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        <Card className="glass-panel glass-panel-hover border-none rounded-2xl shadow-lg flex-1 flex flex-col justify-between overflow-hidden relative">
          <CardHeader className="pb-3 px-6 pt-5 flex flex-row justify-between items-center shrink-0">
            <div>
              <CardTitle className="text-lg font-bold text-blue-950 dark:text-blue-200">Case Sources</CardTitle>
              <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Notebook Base Docs</p>
            </div>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setShowAddSource(!showAddSource)}
              className="rounded-full w-8 h-8 cursor-pointer bg-white/20 border-white/40 dark:bg-white/5 dark:border-white/10 dark:text-blue-100 hover:scale-105 transition-all shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="px-6 pb-6 flex-1 flex flex-col gap-4 overflow-hidden">
            
            {showAddSource && (
              <form onSubmit={handleAddSource} className="bg-white/40 dark:bg-black/30 p-3.5 rounded-xl border border-white/30 dark:border-white/5 space-y-3 animate-in slide-in-from-top-4 duration-300">
                <div className="flex gap-2 p-0.5 bg-gray-200/50 dark:bg-white/5 rounded-lg border border-gray-300/20">
                  <button 
                    type="button"
                    onClick={() => setSourceType("text")}
                    className={`flex-1 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${sourceType === "text" ? "bg-white dark:bg-blue-600 text-blue-950 dark:text-white shadow-sm" : "text-gray-500"}`}
                  >
                    Add Note
                  </button>
                  <button 
                    type="button"
                    onClick={() => setSourceType("url")}
                    className={`flex-1 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${sourceType === "url" ? "bg-white dark:bg-blue-600 text-blue-950 dark:text-white shadow-sm" : "text-gray-500"}`}
                  >
                    Add Link/URL
                  </button>
                </div>
                
                {sourceType === "text" ? (
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      placeholder="Title of note..."
                      value={newTextTitle}
                      onChange={(e) => setNewTextTitle(e.target.value)}
                      className="w-full text-xs font-bold p-2 bg-white/50 dark:bg-white/5 border border-white/30 dark:border-white/10 rounded-lg outline-none focus:border-blue-600"
                    />
                    <textarea 
                      placeholder="Type evidence brief..."
                      value={newTextBody}
                      onChange={(e) => setNewTextBody(e.target.value)}
                      rows={3}
                      className="w-full text-[11px] p-2 bg-white/50 dark:bg-white/5 border border-white/30 dark:border-white/10 rounded-lg outline-none focus:border-blue-600 resize-none"
                    />
                  </div>
                ) : (
                  <input 
                    type="url" 
                    placeholder="https://example.com/case-brief"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="w-full text-xs p-2 bg-white/50 dark:bg-white/5 border border-white/30 dark:border-white/10 rounded-lg outline-none focus:border-blue-600"
                  />
                )}
                
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setShowAddSource(false)}
                    className="flex-1 h-8 rounded-lg font-bold text-[10px] cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 h-8 rounded-lg bg-blue-900 text-white dark:bg-blue-600 font-bold text-[10px] cursor-pointer"
                  >
                    Add Source
                  </Button>
                </div>
              </form>
            )}

            <ScrollArea className="flex-1 h-[360px] rounded-xl border border-white/20 dark:border-white/5 bg-white/10 dark:bg-white/2 p-2">
              <div className="space-y-2">
                {sources.map((src) => (
                  <div 
                    key={src.id} 
                    className="flex justify-between items-center bg-white/40 dark:bg-white/5 p-2 rounded-xl text-xs border border-white/20 dark:border-white/5 group hover:scale-[1.01] hover:border-blue-500/30 transition-all duration-300"
                  >
                    <div className="flex items-center gap-2.5 max-w-[80%]">
                      <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-700 dark:text-blue-400 shrink-0">
                        {src.type === "web" && <Globe className="w-3.5 h-3.5" />}
                        {src.type === "markdown" && <FileText className="w-3.5 h-3.5" />}
                        {(src.type === "docx" || src.type === "pdf") && <File className="w-3.5 h-3.5" />}
                      </div>
                      <div className="truncate space-y-0.5">
                        <p className="font-bold text-blue-950 dark:text-blue-200 truncate pr-1">{src.title}</p>
                        <p className="text-[8px] text-gray-500 font-bold tracking-wide uppercase shrink-0">
                          {src.type.toUpperCase()} &bull; {src.wordCount} words
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeSource(src.id, src.title)}
                      className="text-red-400 hover:text-red-600 cursor-pointer p-1 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-300 shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-3.5 bg-gradient-to-tr from-blue-900/10 to-indigo-900/10 border border-blue-500/10 rounded-xl space-y-1 mt-auto shrink-0">
              <p className="text-[10px] font-bold text-blue-900 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                Evidence Model Synced
              </p>
              <p className="text-[9.5px] text-gray-500 dark:text-gray-400 font-semibold leading-relaxed">
                Active context synchronizes EasyOCR outputs and LINE chat pagination criteria automatically.
              </p>
            </div>

          </CardContent>
        </Card>
      </div>

      {/* COLUMN 2 (span 6): Active Viewer / Chat / Audio Player */}
      <div className="lg:col-span-6 flex flex-col gap-6">
        <Card className="glass-panel border-none rounded-2xl shadow-xl flex-1 flex flex-col overflow-hidden relative">
          
          <CardHeader className="pb-3 px-6 pt-5 flex flex-row items-center justify-between border-b border-white/20 dark:border-white/5 shrink-0">
            <div className="flex items-center gap-2">
              {activeView !== "chat" && (
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={() => setActiveView("chat")}
                  className="rounded-full w-8 h-8 cursor-pointer shrink-0 text-blue-950 dark:text-blue-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              )}
              <div>
                <CardTitle className="text-lg font-bold text-blue-950 dark:text-blue-200">
                  {activeView === "chat" && "Case Copilot Chat"}
                  {activeView === "report" && "Forensic PDF Case Report"}
                  {activeView === "table" && "Case Document Data Table"}
                  {activeView === "flashcards" && "Digital Concept Flashcards"}
                  {activeView === "mindmap" && "Digital Evidence Pipeline"}
                  {activeView === "podcast" && "AI Audio Study Overview"}
                </CardTitle>
                <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">
                  {activeView === "chat" ? "Conversational Sandbox" : "Synthesized AI Artifact"}
                </p>
              </div>
            </div>

            {activeView !== "chat" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  toast.success(`Exported ${activeView.toUpperCase()} artifact successfully!`);
                }}
                className="h-8 text-[10px] cursor-pointer border-white/40 dark:border-white/10 dark:text-blue-200 font-bold bg-white/20 dark:bg-white/5"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Export
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-0 flex-1 flex flex-col min-h-[500px] overflow-hidden bg-gray-100/40 dark:bg-[#030213]/40 relative">
            
            {/* VIEW 1: Active Chat Viewport */}
            {activeView === "chat" && (
              <div className="flex-1 flex flex-col justify-between h-full p-4 overflow-hidden">
                <ScrollArea className="flex-1 pr-2 max-h-[380px]">
                  <div className="space-y-4">
                    {messages.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                      >
                        <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs ${msg.sender === "user" ? "bg-[#030213] text-white dark:bg-blue-600" : "bg-gradient-to-tr from-blue-900 to-indigo-900 text-white shadow-md shadow-blue-500/10"}`}>
                          {msg.sender === "user" ? "IN" : "AI"}
                        </div>
                        
                        <div className="space-y-2">
                          <div className={`p-3 rounded-2xl text-xs leading-relaxed ${msg.sender === "user" ? "bg-blue-900 text-white rounded-tr-none" : "bg-white dark:bg-white/5 border border-white/30 dark:border-white/5 text-blue-950 dark:text-blue-100 rounded-tl-none shadow-sm"}`}>
                            {msg.sender === "copilot" ? (
                              <div className="whitespace-pre-line font-medium">{msg.content}</div>
                            ) : (
                              <p className="font-semibold">{msg.content}</p>
                            )}
                          </div>
                          
                          {/* Reference badges */}
                          {msg.sources && msg.sources.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              <span className="text-[8px] font-extrabold text-blue-900 dark:text-blue-400 uppercase tracking-widest">Sources used:</span>
                              {msg.sources.map(srcId => {
                                const found = sources.find(s => s.id === srcId);
                                return (
                                  <span key={srcId} className="px-2 py-0.5 bg-blue-600/10 text-blue-700 dark:text-cyan-400 dark:bg-cyan-500/5 rounded font-bold text-[8px] border border-blue-500/10">
                                    {found ? found.title : "Document"}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {isTyping && (
                      <div className="flex gap-3 max-w-[80%] mr-auto items-center">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-900 to-indigo-900 text-white shadow-md flex items-center justify-center font-bold text-xs">
                          AI
                        </div>
                        <div className="p-3 bg-white dark:bg-white/5 border border-white/30 dark:border-white/5 rounded-2xl rounded-tl-none flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-blue-900 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-1.5 h-1.5 bg-blue-900 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-1.5 h-1.5 bg-blue-900 dark:bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Suggestions and Chat Input Form */}
                <div className="space-y-3 mt-4">
                  <div className="flex gap-2 overflow-x-auto pb-1 border-t border-white/20 dark:border-white/5 pt-3">
                    <button 
                      type="button" 
                      onClick={() => triggerSuggestion("ระบบ OCR ของสลิปธนาคาร ทำงานอย่างไร?")}
                      className="px-2.5 py-1 text-[9.5px] font-bold bg-white/50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 text-blue-900 dark:text-blue-200 border border-white/40 dark:border-white/10 rounded-full transition-all shrink-0 cursor-pointer"
                    >
                      💡 YOLOv8 & OCR Setup
                    </button>
                    <button 
                      type="button"
                      onClick={() => triggerSuggestion("อัลกอริทึมหั่นหน้าแชต LINE Chat Paginator?")}
                      className="px-2.5 py-1 text-[9.5px] font-bold bg-white/50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 text-blue-900 dark:text-blue-200 border border-white/40 dark:border-white/10 rounded-full transition-all shrink-0 cursor-pointer"
                    >
                      💡 LINE Bubble Pagination
                    </button>
                    <button 
                      type="button"
                      onClick={() => triggerSuggestion("การตั้งค่าความปลอดภัยของ SFX WinRAR Archive?")}
                      className="px-2.5 py-1 text-[9.5px] font-bold bg-white/50 hover:bg-white dark:bg-white/5 dark:hover:bg-white/10 text-blue-900 dark:text-blue-200 border border-white/40 dark:border-white/10 rounded-full transition-all shrink-0 cursor-pointer"
                    >
                      💡 WinRAR SFX Packaging
                    </button>
                  </div>

                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ask copilot about case files (e.g. YOLOv8 ocr, LINE split page, WinRAR sfx...)"
                      value={inputVal}
                      onChange={(e) => setInputVal(e.target.value)}
                      disabled={isTyping}
                      className="flex-1 h-11 text-xs font-medium px-4 bg-white/40 dark:bg-black/30 border border-white/40 dark:border-white/10 rounded-xl outline-none focus:border-blue-600 focus:bg-white/70 dark:focus:bg-black/50 transition-all shadow-inner"
                    />
                    <Button 
                      type="submit"
                      disabled={isTyping || !inputVal.trim()}
                      className="w-11 h-11 shrink-0 bg-blue-900 hover:bg-blue-950 dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </div>
            )}

            {/* VIEW 2: AI Generated Report */}
            {activeView === "report" && (
              <ScrollArea className="flex-1 p-6 h-[460px] max-h-[460px]">
                <div className="bg-white border border-gray-300/60 rounded-2xl shadow-xl p-6 text-black flex flex-col justify-between text-left select-text animate-in zoom-in-95 duration-300">
                  <div className="whitespace-pre-line text-xs font-semibold text-gray-800 leading-relaxed font-sans">
                    {MOCK_REPORT_CONTENT}
                  </div>
                  <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between items-center text-[8px] font-extrabold text-gray-400 tracking-wider">
                    <span className="text-red-500">CONFIDENTIAL - FORENSIC RECORDS</span>
                    <span>GENERATED AT MAY 2026</span>
                  </div>
                </div>
              </ScrollArea>
            )}

            {/* VIEW 3: AI Generated Data Table */}
            {activeView === "table" && (
              <div className="flex-1 p-6 flex flex-col gap-4 overflow-hidden h-[460px] max-h-[460px] animate-in zoom-in-95 duration-300">
                <div className="overflow-x-auto rounded-xl border border-white/20 dark:border-white/5 bg-white/50 dark:bg-[#030213]/40 shadow-xl">
                  <table className="w-full border-collapse text-xs text-left">
                    <thead>
                      <tr className="bg-white/50 dark:bg-white/5 border-b border-white/20 dark:border-white/5 text-[9px] uppercase tracking-wider text-blue-900 dark:text-blue-300">
                        {MOCK_DATA_TABLE.headers.map((h, idx) => (
                          <th key={idx} className="p-3 font-extrabold">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-blue-950 dark:text-blue-100">
                      {MOCK_DATA_TABLE.rows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/30 dark:hover:bg-white/2 transition-colors">
                          <td className="p-3 font-extrabold text-blue-900 dark:text-blue-400">{row[0]}</td>
                          <td className="p-3 font-semibold">{row[1]}</td>
                          <td className="p-3 font-medium text-gray-500">{row[2]}</td>
                          <td className="p-3 font-semibold text-indigo-900 dark:text-indigo-400">{row[3]}</td>
                          <td className="p-3 font-mono text-[10px] font-semibold text-gray-600 dark:text-gray-400">{row[4]}</td>
                          <td className="p-3"><span className="px-2 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-md font-bold text-[9px] uppercase tracking-wider">{row[5]}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 italic bg-amber-500/5 p-3.5 rounded-xl border border-amber-500/10 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Synthesized directly from your 14 case document schemas. Confidence averages 98.8% for all text parameters.</span>
                </div>
              </div>
            )}

            {/* VIEW 4: AI Concept Flashcards */}
            {activeView === "flashcards" && (
              <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6 h-[460px] max-h-[460px] animate-in zoom-in-95 duration-300">
                <div className="text-center">
                  <span className="px-2.5 py-1 bg-blue-600/10 text-blue-700 dark:text-blue-400 rounded-full font-bold text-[9px] uppercase tracking-wider">
                    Card {activeCardIdx + 1} of {MOCK_FLASHCARDS.length}
                  </span>
                </div>

                {/* 3D card wrapper */}
                <div 
                  className="w-full max-w-sm h-56 cursor-pointer relative transition-all duration-500"
                  style={{ perspective: "1000px" }}
                  onClick={() => setCardFlipped(!cardFlipped)}
                >
                  <div 
                    className="w-full h-full rounded-2xl relative shadow-2xl transition-transform duration-500 border border-white/20 dark:border-white/5"
                    style={{ 
                      transformStyle: "preserve-3d",
                      transform: cardFlipped ? "rotateY(180deg)" : "rotateY(0deg)"
                    }}
                  >
                    {/* Front of card */}
                    <div 
                      className="absolute inset-0 rounded-2xl p-6 bg-gradient-to-tr from-blue-900 to-indigo-900 text-white flex flex-col justify-between items-center text-center shadow-lg"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      <HelpCircle className="w-8 h-8 text-blue-300 animate-pulse" />
                      <p className="font-extrabold text-sm leading-relaxed px-2">
                        {MOCK_FLASHCARDS[activeCardIdx].front}
                      </p>
                      <span className="text-[9px] font-extrabold tracking-widest text-blue-300 uppercase">
                        Click Card to Flip
                      </span>
                    </div>

                    {/* Back of card */}
                    <div 
                      className="absolute inset-0 rounded-2xl p-6 bg-white dark:bg-[#030213] text-blue-950 dark:text-blue-100 flex flex-col justify-between items-center text-center shadow-lg"
                      style={{ 
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)"
                      }}
                    >
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                      <p className="font-semibold text-xs leading-relaxed px-2 text-gray-700 dark:text-gray-300">
                        {MOCK_FLASHCARDS[activeCardIdx].back}
                      </p>
                      <span className="text-[9px] font-extrabold tracking-widest text-green-600 dark:text-green-400 uppercase">
                        Answer Confirmed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    disabled={activeCardIdx === 0}
                    onClick={() => {
                      setActiveCardIdx(prev => prev - 1);
                      setCardFlipped(false);
                    }}
                    className="h-9 px-4 text-xs font-bold bg-white/20 dark:bg-white/5 cursor-pointer rounded-lg"
                  >
                    Previous
                  </Button>
                  <Button 
                    disabled={activeCardIdx === MOCK_FLASHCARDS.length - 1}
                    onClick={() => {
                      setActiveCardIdx(prev => prev + 1);
                      setCardFlipped(false);
                    }}
                    className="h-9 px-4 text-xs font-bold bg-blue-900 text-white dark:bg-blue-600 cursor-pointer rounded-lg"
                  >
                    Next Card
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* VIEW 5: Pipeline Map / Mindmap */}
            {activeView === "mindmap" && (
              <ScrollArea className="flex-1 p-6 h-[460px] max-h-[460px] animate-in zoom-in-95 duration-300">
                <div className="bg-white/50 dark:bg-[#030213]/40 border border-white/20 dark:border-white/5 rounded-2xl shadow-2xl p-5 flex flex-col gap-6 text-center">
                  
                  {/* Styled Pipeline Diagram */}
                  <div className="space-y-4">
                    
                    {/* Step 1 */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-white/20 dark:border-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-400 font-extrabold text-[10px] flex items-center justify-center shrink-0">1</span>
                        <div className="text-left">
                          <p className="font-bold text-xs text-blue-950 dark:text-blue-200">Evidence Ingestion</p>
                          <p className="text-[9px] text-gray-500 font-semibold">14 case files loaded from active notebook</p>
                        </div>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                    </div>

                    <ArrowRight className="w-4 h-4 mx-auto text-gray-400 rotate-90" />

                    {/* Step 2 */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white dark:bg-white/5 border border-white/20 dark:border-white/5 rounded-xl space-y-1">
                        <span className="px-2 py-0.5 bg-blue-600/10 text-blue-700 dark:text-blue-400 rounded text-[8px] font-extrabold uppercase">LINE Chat</span>
                        <p className="font-bold text-[11px] text-blue-950 dark:text-blue-200">Horizontal Pixel Profile</p>
                        <p className="text-[9px] text-gray-500 font-semibold">Safe Splice Bubble Gap Detection</p>
                      </div>
                      <div className="p-3 bg-white dark:bg-white/5 border border-white/20 dark:border-white/5 rounded-xl space-y-1">
                        <span className="px-2 py-0.5 bg-amber-600/10 text-amber-700 dark:text-amber-400 rounded text-[8px] font-extrabold uppercase">Bank Slip</span>
                        <p className="font-bold text-[11px] text-blue-950 dark:text-blue-200">OCR & YOLOv8 Detection</p>
                        <p className="text-[9px] text-gray-500 font-semibold">Easy + Paddle + Bank API check</p>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 mx-auto text-gray-400 rotate-90" />

                    {/* Step 3 */}
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-white/20 dark:border-white/5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-blue-600/10 text-blue-700 dark:text-blue-400 font-extrabold text-[10px] flex items-center justify-center shrink-0">3</span>
                        <div className="text-left">
                          <p className="font-bold text-xs text-blue-950 dark:text-blue-200">SFX Packing (WinRAR)</p>
                          <p className="text-[9px] text-gray-500 font-semibold">Consolidated executable with 3% Recovery Records</p>
                        </div>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                    </div>

                  </div>
                </div>
              </ScrollArea>
            )}

            {/* VIEW 6: Podcast Player Overview */}
            {activeView === "podcast" && (
              <div className="flex-1 p-6 flex flex-col items-center justify-between gap-6 h-[460px] max-h-[460px] animate-in zoom-in-95 duration-300">
                
                {/* Podcast Graphic Card */}
                <div className="w-full max-w-sm bg-gradient-to-br from-[#0a0f1d] to-[#04060d] border border-white/10 rounded-2xl p-5 shadow-2xl flex items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-xl pointer-events-none" />
                  
                  {/* Square cover art */}
                  <div className="w-20 h-20 bg-gradient-to-tr from-blue-900 via-indigo-900 to-purple-900 rounded-xl shadow-lg border border-white/10 flex items-center justify-center text-white shrink-0 relative group">
                    <AudioLines className="w-8 h-8 text-blue-300 animate-pulse" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-xl">
                      <Volume2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="text-left space-y-1">
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md font-bold text-[8px] uppercase tracking-wider">
                      NotebookLM Podcast
                    </span>
                    <h4 className="font-black text-sm text-white tracking-wide">
                      Digital Evidence Synthesis
                    </h4>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      Hosts: David & Sarah (AI Dual-Host Voice)
                    </p>
                  </div>
                </div>

                {/* Animated Audio Waveform Canvas */}
                <div className="w-full max-w-sm border border-white/20 dark:border-white/5 rounded-2xl overflow-hidden shadow-inner bg-white/20 dark:bg-white/2">
                  <canvas 
                    ref={canvasRef} 
                    width={380} 
                    height={100}
                    className="w-full h-full block"
                  />
                </div>

                {/* Audio controls */}
                <div className="w-full max-w-sm space-y-4">
                  {/* Time Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 font-bold">
                      <span>{podcastTime}</span>
                      <span>08:58</span>
                    </div>
                    <Progress value={podcastProgress} className="w-full h-1.5 bg-white/30 dark:bg-white/5 border border-white/20 dark:border-white/5 shadow-inner" />
                  </div>

                  {/* Play Buttons */}
                  <div className="flex items-center justify-center gap-6">
                    <button 
                      onClick={() => {
                        setPodcastProgress(0);
                        setPodcastTime("00:00");
                        toast.info("Podcast restarted");
                      }}
                      className="p-2 text-gray-500 hover:text-blue-900 dark:text-gray-400 dark:hover:text-blue-400 transition-colors cursor-pointer shrink-0"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    
                    <button 
                      onClick={() => setPodcastPlaying(!podcastPlaying)}
                      className="w-12 h-12 bg-blue-950 text-white dark:bg-blue-600 hover:scale-105 active:scale-95 transition-all shadow-lg rounded-full cursor-pointer flex items-center justify-center shrink-0"
                    >
                      {podcastPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 w-12 shrink-0">
                      {podcastPlaying ? "PLAYING" : "PAUSED"}
                    </span>
                  </div>
                </div>

              </div>
            )}

          </CardContent>
        </Card>
      </div>

      {/* COLUMN 3 (span 3): AI Study Aids Hub */}
      <div className="lg:col-span-3 flex flex-col gap-6">
        
        {/* Artifact generator buttons */}
        <Card className="glass-panel glass-panel-hover border-none rounded-2xl shadow-lg shrink-0">
          <CardHeader className="pb-3 px-6 pt-5">
            <CardTitle className="text-lg font-bold text-blue-950 dark:text-blue-200">AI Artifacts</CardTitle>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Generate Study Aids</p>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-3">
            
            {/* Artifact 1: Report */}
            <div className="space-y-1">
              <Button
                onClick={() => triggerGeneration("report")}
                disabled={genStatus.report === "generating"}
                className={`w-full h-10 font-bold text-xs justify-between rounded-xl cursor-pointer transition-all ${
                  genStatus.report === "done" 
                    ? "bg-green-600/10 text-green-700 border border-green-500/20" 
                    : "bg-white/40 border border-white/50 text-blue-950 dark:bg-white/5 dark:border-white/10 dark:text-blue-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Clipboard className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
                  Forensic Report
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide">
                  {genStatus.report === "idle" && "Generate"}
                  {genStatus.report === "generating" && `${genProgress.report}%`}
                  {genStatus.report === "done" && "Ready"}
                </span>
              </Button>
              {genStatus.report === "generating" && <Progress value={genProgress.report} className="h-1 bg-blue-500/20" />}
            </div>

            {/* Artifact 2: Data Table */}
            <div className="space-y-1">
              <Button
                onClick={() => triggerGeneration("table")}
                disabled={genStatus.table === "generating"}
                className={`w-full h-10 font-bold text-xs justify-between rounded-xl cursor-pointer transition-all ${
                  genStatus.table === "done" 
                    ? "bg-green-600/10 text-green-700 border border-green-500/20" 
                    : "bg-white/40 border border-white/50 text-blue-950 dark:bg-white/5 dark:border-white/10 dark:text-blue-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
                  Evidence Data Table
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide">
                  {genStatus.table === "idle" && "Generate"}
                  {genStatus.table === "generating" && `${genProgress.table}%`}
                  {genStatus.table === "done" && "Ready"}
                </span>
              </Button>
              {genStatus.table === "generating" && <Progress value={genProgress.table} className="h-1 bg-blue-500/20" />}
            </div>

            {/* Artifact 3: Flashcards */}
            <div className="space-y-1">
              <Button
                onClick={() => triggerGeneration("flashcards")}
                disabled={genStatus.flashcards === "generating"}
                className={`w-full h-10 font-bold text-xs justify-between rounded-xl cursor-pointer transition-all ${
                  genStatus.flashcards === "done" 
                    ? "bg-green-600/10 text-green-700 border border-green-500/20" 
                    : "bg-white/40 border border-white/50 text-blue-950 dark:bg-white/5 dark:border-white/10 dark:text-blue-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
                  Study Flashcards
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide">
                  {genStatus.flashcards === "idle" && "Generate"}
                  {genStatus.flashcards === "generating" && `${genProgress.flashcards}%`}
                  {genStatus.flashcards === "done" && "Ready"}
                </span>
              </Button>
              {genStatus.flashcards === "generating" && <Progress value={genProgress.flashcards} className="h-1 bg-blue-500/20" />}
            </div>

            {/* Artifact 4: Mindmap */}
            <div className="space-y-1">
              <Button
                onClick={() => triggerGeneration("mindmap")}
                disabled={genStatus.mindmap === "generating"}
                className={`w-full h-10 font-bold text-xs justify-between rounded-xl cursor-pointer transition-all ${
                  genStatus.mindmap === "done" 
                    ? "bg-green-600/10 text-green-700 border border-green-500/20" 
                    : "bg-white/40 border border-white/50 text-blue-950 dark:bg-white/5 dark:border-white/10 dark:text-blue-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <GitFork className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
                  Evidence Pipeline Map
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide">
                  {genStatus.mindmap === "idle" && "Generate"}
                  {genStatus.mindmap === "generating" && `${genProgress.mindmap}%`}
                  {genStatus.mindmap === "done" && "Ready"}
                </span>
              </Button>
              {genStatus.mindmap === "generating" && <Progress value={genProgress.mindmap} className="h-1 bg-blue-500/20" />}
            </div>

            {/* Artifact 5: Podcast */}
            <div className="space-y-1">
              <Button
                onClick={() => triggerGeneration("podcast")}
                disabled={genStatus.podcast === "generating"}
                className={`w-full h-10 font-bold text-xs justify-between rounded-xl cursor-pointer transition-all ${
                  genStatus.podcast === "done" 
                    ? "bg-green-600/10 text-green-700 border border-green-500/20" 
                    : "bg-white/40 border border-white/50 text-blue-950 dark:bg-white/5 dark:border-white/10 dark:text-blue-200"
                }`}
              >
                <span className="flex items-center gap-2">
                  <AudioLines className="w-4 h-4 text-blue-800 dark:text-blue-400 shrink-0" />
                  Audio Podcast Brief
                </span>
                <span className="text-[9px] font-extrabold uppercase tracking-wide">
                  {genStatus.podcast === "idle" && "Generate"}
                  {genStatus.podcast === "generating" && `${genProgress.podcast}%`}
                  {genStatus.podcast === "done" && "Ready"}
                </span>
              </Button>
              {genStatus.podcast === "generating" && <Progress value={genProgress.podcast} className="h-1 bg-blue-500/20" />}
            </div>

          </CardContent>
        </Card>

        {/* Viewport controls / selector */}
        <Card className="glass-panel glass-panel-hover border-none rounded-2xl shadow-lg flex-1 overflow-hidden relative">
          <CardHeader className="pb-3 px-6 pt-5">
            <CardTitle className="text-lg font-bold text-blue-950 dark:text-blue-200">Active Viewport</CardTitle>
            <p className="text-[10px] text-gray-500 font-bold tracking-widest uppercase">Quick Switch Panel</p>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-2">
            <Button
              onClick={() => setActiveView("chat")}
              className={`w-full h-9 justify-start text-[11px] font-bold rounded-lg cursor-pointer transition-all ${activeView === "chat" ? "bg-[#030213] text-white dark:bg-blue-600" : "bg-white/20 border border-white/40 dark:bg-white/5 dark:border-white/10 dark:text-blue-200"}`}
            >
              <MessageSquare className="w-3.5 h-3.5 mr-2 shrink-0" />
              Copilot Chat Sandbox
            </Button>
            
            {genStatus.report === "done" && (
              <Button
                onClick={() => setActiveView("report")}
                className={`w-full h-9 justify-start text-[11px] font-bold rounded-lg cursor-pointer transition-all ${activeView === "report" ? "bg-[#030213] text-white dark:bg-blue-600" : "bg-white/20 border border-white/40 dark:bg-white/5 dark:border-white/10 dark:text-blue-200"}`}
              >
                <Clipboard className="w-3.5 h-3.5 mr-2 shrink-0" />
                Forensic Case Report
              </Button>
            )}

            {genStatus.table === "done" && (
              <Button
                onClick={() => setActiveView("table")}
                className={`w-full h-9 justify-start text-[11px] font-bold rounded-lg cursor-pointer transition-all ${activeView === "table" ? "bg-[#030213] text-white dark:bg-blue-600" : "bg-white/20 border border-white/40 dark:bg-white/5 dark:border-white/10 dark:text-blue-200"}`}
              >
                <Table className="w-3.5 h-3.5 mr-2 shrink-0" />
                Case Document Data Table
              </Button>
            )}

            {genStatus.flashcards === "done" && (
              <Button
                onClick={() => setActiveView("flashcards")}
                className={`w-full h-9 justify-start text-[11px] font-bold rounded-lg cursor-pointer transition-all ${activeView === "flashcards" ? "bg-[#030213] text-white dark:bg-blue-600" : "bg-white/20 border border-white/40 dark:bg-white/5 dark:border-white/10 dark:text-blue-200"}`}
              >
                <HelpCircle className="w-3.5 h-3.5 mr-2 shrink-0" />
                Study Concept Flashcards
              </Button>
            )}

            {genStatus.mindmap === "done" && (
              <Button
                onClick={() => setActiveView("mindmap")}
                className={`w-full h-9 justify-start text-[11px] font-bold rounded-lg cursor-pointer transition-all ${activeView === "mindmap" ? "bg-[#030213] text-white dark:bg-blue-600" : "bg-white/20 border border-white/40 dark:bg-white/5 dark:border-white/10 dark:text-blue-200"}`}
              >
                <GitFork className="w-3.5 h-3.5 mr-2 shrink-0" />
                Evidence Pipeline Map
              </Button>
            )}

            {genStatus.podcast === "done" && (
              <Button
                onClick={() => setActiveView("podcast")}
                className={`w-full h-9 justify-start text-[11px] font-bold rounded-lg cursor-pointer transition-all ${activeView === "podcast" ? "bg-[#030213] text-white dark:bg-blue-600" : "bg-white/20 border border-white/40 dark:bg-white/5 dark:border-white/10 dark:text-blue-200"}`}
              >
                <AudioLines className="w-3.5 h-3.5 mr-2 shrink-0" />
                AI Audio Study Overview
              </Button>
            )}

          </CardContent>
        </Card>
      </div>

    </div>
  );
}
