/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Music, 
  Upload, 
  Play, 
  Pause, 
  RotateCcw, 
  Mic2, 
  Settings2, 
  Sparkles, 
  FileAudio, 
  X,
  Volume2,
  ListMusic,
  Info
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

import { GENRES, MOODS, INSTRUMENTS, TEMPOS, VOCAL_TYPES } from "./constants";

export default function App() {
  // Form State
  const [lyrics, setLyrics] = useState("");
  const [genre, setGenre] = useState("");
  const [mood, setMood] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [vocalType, setVocalType] = useState("");
  const [tempo, setTempo] = useState("");
  const [audioRef, setAudioRef] = useState<File | null>(null);
  const [audioRefBase64, setAudioRefBase64] = useState<string | null>(null);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedMusic, setGeneratedMusic] = useState<{
    url: string;
    lyrics: string;
    style: string;
    title: string;
  } | null>(null);

  // Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioRef(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(",")[1];
        setAudioRefBase64(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleInstrument = (inst: string) => {
    setSelectedInstruments(prev => 
      prev.includes(inst) ? prev.filter(i => i !== inst) : [...prev, inst]
    );
  };

  const generateMusic = async () => {
    if (!genre || !mood || !tempo) {
      toast.error("Missing Information", {
        description: "Please select at least Genre, Mood, and Tempo."
      });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(10);
    setGeneratedMusic(null);

    try {
      // 1. Start Generation
      const tags = [genre, mood, tempo, ...selectedInstruments, vocalType].filter(Boolean).join(", ");
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: lyrics || "A beautiful song",
          tags: tags,
          title: `Composition - ${genre}`,
          make_instrumental: vocalType === "None (Instrumental)",
          mv: "chirp-v3-5"
        })
      });

      if (!response.ok) {
        let errorMessage = "Failed to start generation";
        try {
          const err = await response.json();
          errorMessage = err.error || err.message || errorMessage;
        } catch (e) {
          // Jika bukan JSON, ambil teks status
          errorMessage = `Error ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log("API Response Data:", data);

      // Handle different response structures (Object, Array, or {data: [...]})
      let taskId = "";
      if (data.id) {
        taskId = data.id;
      } else if (Array.isArray(data) && data.length > 0 && data[0].id) {
        taskId = data[0].id;
      } else if (data.data && Array.isArray(data.data) && data.data.length > 0 && data.data[0].id) {
        taskId = data.data[0].id;
      }

      if (!taskId) {
        console.error("Could not find task ID in response:", data);
        throw new Error("No task ID received from API. Check console for details.");
      }

      setGenerationProgress(30);

      // 2. Poll for Status
      let attempts = 0;
      const maxAttempts = 60; // 5 minutes with 5s interval
      
      const poll = async () => {
        if (attempts >= maxAttempts) {
          throw new Error("Generation timed out");
        }
        
        attempts++;
        setGenerationProgress(prev => Math.min(prev + 1, 95));

        const statusRes = await fetch(`/api/feed/${taskId}`);
        if (!statusRes.ok) throw new Error("Failed to check status");
        
        const statusData = await statusRes.json();
        const task = Array.isArray(statusData) ? statusData[0] : statusData;

        if (task.status === "streaming" || task.status === "complete" || task.audio_url) {
          setGeneratedMusic({
            url: task.audio_url,
            lyrics: task.lyrics || lyrics,
            style: tags,
            title: task.title || `AI Composition - ${genre}`
          });
          return true;
        } else if (task.status === "error" || task.status === "failed") {
          throw new Error("Generation failed on server");
        }
        
        return false;
      };

      const interval = setInterval(async () => {
        try {
          const finished = await poll();
          if (finished) {
            clearInterval(interval);
            setIsGenerating(false);
            setGenerationProgress(0);
            toast.success("Music Generated!");
          }
        } catch (err: any) {
          clearInterval(interval);
          console.error(err);
          toast.error("Generation Failed", { description: err.message });
          setIsGenerating(false);
          setGenerationProgress(0);
        }
      }, 5000);

    } catch (error: any) {
      console.error("Generation failed:", error);
      toast.error("Generation Failed", {
        description: error.message || "Failed to generate music. Please try again."
      });
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const togglePlay = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text-main font-sans p-6 overflow-x-hidden">
      <header className="flex justify-between items-center mb-6 max-w-[1400px] mx-auto">
        <div className="font-extrabold text-2xl tracking-tighter text-accent">SONIC-AI.</div>
        <div className="text-xs text-text-dim bg-card px-3 py-1.5 rounded-full border border-border uppercase tracking-wider font-medium">
          PRO ACCOUNT • 500 CREDITS LEFT
        </div>
      </header>

      <main className="bento-container max-w-[1400px] mx-auto">
        {/* Column 1: Input */}
        <Card className="lyrics-input-area bg-card border-border rounded-2xl p-5 flex flex-col shadow-none">
          <div className="text-[11px] uppercase tracking-widest text-text-dim mb-3 font-semibold">Lyric Column</div>
          <Textarea 
            placeholder="Input lirik lagu di sini... \n\n[Verse 1]\nDi bawah langit biru yang luas\nKukejar mimpi tanpa batas..."
            className="flex-grow bg-[#242429] border-border text-white rounded-lg p-3 resize-none text-sm leading-relaxed focus:ring-1 focus:ring-accent/50"
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
          />
        </Card>

        <Card className="audio-upload-area bg-card border-border rounded-2xl p-5 flex flex-col shadow-none">
          <div className="text-[11px] uppercase tracking-widest text-text-dim mb-3 font-semibold">Reference Audio</div>
          <div className="flex-grow">
            <input 
              type="file" 
              accept="audio/*" 
              onChange={handleFileUpload}
              className="hidden" 
              id="audio-upload"
            />
            <label 
              htmlFor="audio-upload"
              className={`h-full flex flex-col items-center justify-center border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                audioRef ? 'border-accent/50 bg-accent/5' : 'border-border hover:border-text-dim/30 bg-[#242429]'
              }`}
            >
              {audioRef ? (
                <div className="text-center p-4">
                  <FileAudio className="w-8 h-8 text-accent mx-auto mb-2" />
                  <p className="text-sm font-medium text-white truncate max-w-[200px]">{audioRef.name}</p>
                  <p className="text-[10px] text-text-dim mt-1">{(audioRef.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="text-center">
                  <Upload className="w-8 h-8 text-text-dim mx-auto mb-2" />
                  <div className="text-sm font-medium">Upload Audio (.wav, .mp3)</div>
                  <div className="text-[11px] text-text-dim mt-1">Max file size 25MB</div>
                </div>
              )}
            </label>
          </div>
        </Card>

        {/* Column 2: Parameters */}
        <Card className="config-main-area bg-card border-border rounded-2xl p-5 flex flex-col shadow-none">
          <div className="text-[11px] uppercase tracking-widest text-text-dim mb-4 font-semibold">Music Attributes</div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-1.5">
              <label className="text-[12px] text-text-dim">Genre</label>
              <Select onValueChange={setGenre} value={genre}>
                <SelectTrigger className="bg-[#242429] border-border text-white h-10 text-xs">
                  <SelectValue placeholder="Select Genre" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-white">
                  {GENRES.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-text-dim">Moods</label>
              <Select onValueChange={setMood} value={mood}>
                <SelectTrigger className="bg-[#242429] border-border text-white h-10 text-xs">
                  <SelectValue placeholder="Select Mood" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-white">
                  {MOODS.map(m => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="space-y-1.5">
              <label className="text-[12px] text-text-dim">Vocal Type</label>
              <Select onValueChange={setVocalType} value={vocalType}>
                <SelectTrigger className="bg-[#242429] border-border text-white h-10 text-xs">
                  <SelectValue placeholder="Select Vocal" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-white">
                  {VOCAL_TYPES.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] text-text-dim">Tempo</label>
              <Select onValueChange={setTempo} value={tempo}>
                <SelectTrigger className="bg-[#242429] border-border text-white h-10 text-xs">
                  <SelectValue placeholder="Select Tempo" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border text-white">
                  {TEMPOS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="text-[12px] text-text-dim mb-2">Primary Instruments</label>
          <ScrollArea className="flex-grow">
            <div className="flex flex-wrap gap-2 pb-2">
              {INSTRUMENTS.map(inst => (
                <div 
                  key={inst}
                  className={`text-[12px] px-3 py-1.5 rounded-full border cursor-pointer transition-all ${
                    selectedInstruments.includes(inst) 
                      ? 'border-accent text-accent bg-accent/5' 
                      : 'bg-[#2D2D33] border-border text-text-main hover:border-text-dim/30'
                  }`}
                  onClick={() => toggleInstrument(inst)}
                >
                  {inst}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>

        <div className="action-area-area">
          <Button 
            className="w-full h-full bg-accent hover:bg-accent/90 text-black font-bold text-lg rounded-2xl transition-all flex items-center justify-center gap-2"
            onClick={generateMusic}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                <span>{generationProgress}%</span>
              </div>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                GENERATE TRACK
              </>
            )}
          </Button>
        </div>

        {/* Column 3: Results */}
        <Card className="results-preview-area bg-card border-border rounded-2xl p-5 flex flex-col shadow-none">
          <div className="text-[11px] uppercase tracking-widest text-text-dim mb-4 font-semibold">Output Result</div>
          
          <AnimatePresence mode="wait">
            {generatedMusic ? (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col h-full"
              >
                <div className="bg-[#242429] rounded-xl p-4 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-accent to-zinc-800 rounded-md flex items-center justify-center">
                      <Music className="w-6 h-6 text-black/50" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white truncate max-w-[180px]">{generatedMusic.title}</div>
                      <div className="text-[11px] text-text-dim">00:30 • High Fidelity</div>
                    </div>
                  </div>
                  
                  <div className="h-1 bg-zinc-700 rounded-full relative mb-4 overflow-hidden">
                    <motion.div 
                      className="absolute inset-y-0 left-0 bg-accent"
                      animate={{ width: isPlaying ? "100%" : "0%" }}
                      transition={{ duration: 30, ease: "linear" }}
                    />
                  </div>

                  <div className="flex justify-center gap-6">
                    <Button variant="ghost" size="icon" className="text-text-dim hover:text-white">
                      <RotateCcw className="w-5 h-5" onClick={() => { if(audioPlayerRef.current) audioPlayerRef.current.currentTime = 0; }} />
                    </Button>
                    <Button 
                      size="icon" 
                      className="w-10 h-10 rounded-full bg-accent hover:bg-accent/90 text-black"
                      onClick={togglePlay}
                    >
                      {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="text-text-dim hover:text-white">
                      <Volume2 className="w-5 h-5" />
                    </Button>
                  </div>
                  <audio 
                    ref={audioPlayerRef} 
                    src={generatedMusic.url} 
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                </div>

                <div className="text-[11px] uppercase tracking-widest text-text-dim mb-3 font-semibold">Track Style Analysis</div>
                <div className="flex flex-wrap gap-1.5 mb-6">
                  {generatedMusic.style.split('|').map((s, i) => (
                    <span key={i} className="bg-accent/10 text-accent text-[10px] px-2 py-1 rounded border border-accent/20 uppercase font-medium">
                      {s.trim()}
                    </span>
                  ))}
                  <span className="bg-accent/10 text-accent text-[10px] px-2 py-1 rounded border border-accent/20 uppercase font-medium">AI GEN</span>
                </div>

                <div className="text-[11px] uppercase tracking-widest text-text-dim mb-3 font-semibold">Visualized Lyrics</div>
                <ScrollArea className="flex-grow">
                  <div className="text-[13px] leading-relaxed text-text-dim whitespace-pre-wrap pr-4 pb-4">
                    {generatedMusic.lyrics.split('\n').map((line, i) => (
                      <div key={i} className={line.startsWith('[') ? 'text-accent font-bold mt-2 mb-1' : ''}>
                        {line}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </motion.div>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-xl bg-[#242429]/50">
                <Music className="w-10 h-10 text-text-dim/20 mb-4" />
                <div className="text-sm font-medium text-text-dim">Ready to Compose</div>
                <div className="text-[11px] text-text-dim/60 mt-1">Configure settings and generate track</div>
              </div>
            )}
          </AnimatePresence>
        </Card>
      </main>

      <Toaster position="top-center" richColors />
    </div>
  );
}
