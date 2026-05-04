/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Camera, 
  Search, 
  AlertTriangle, 
  History, 
  Maximize2, 
  MapPin, 
  Clock, 
  Activity,
  User,
  LogOut,
  Upload,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { analyzeVehicleFrame, type DetectionResult } from './lib/gemini';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function LiveCamera({ url, id, location, transform, isSearching, stats, hasStarted }: { 
  url: string, 
  id: string, 
  location: string, 
  transform: string,
  isSearching?: boolean,
  stats?: { flow: number, avgSpeed: number },
  hasStarted?: boolean
}) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const playVideo = async () => {
      if (!videoRef.current || !hasStarted) return;
      
      try {
        videoRef.current.muted = true;
        videoRef.current.defaultMuted = true;
        
        // Staggered play to avoid browser throttling
        const camIndex = parseInt(id.split('-')[1]) || 0;
        await new Promise(resolve => setTimeout(resolve, camIndex * 150));
        
        if (isMounted && videoRef.current) {
          setHasError(false);
          setIsLoading(true);
          
          // Browsers often block play() unless preceded by a user interaction
          // Use a promise-friendly way to play
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                if (isMounted) setIsLoading(false);
              })
              .catch(error => {
                if (error.name === 'NotAllowedError') {
                  console.warn(`Autoplay blocked for ${id}, waiting for user interaction.`);
                  if (isMounted) setIsLoading(false); // Show the feed (paused)
                } else if (error.name !== 'AbortError') {
                  console.error(`Play error for ${id}:`, error.message);
                  if (isMounted) {
                    setHasError(true);
                    setIsLoading(false);
                  }
                }
              });
          }
        }
      } catch (err) {
        if (isMounted) {
          console.warn(`Initial setup failed for ${id}:`, err);
          setHasError(true);
          setIsLoading(false);
        }
      }
    };
    
    playVideo();
    return () => { isMounted = false; };
  }, [url, hasStarted, id]);

  useEffect(() => {
    const handleGlobalInteraction = () => {
      if (videoRef.current && videoRef.current.paused && hasStarted && !hasError) {
        setIsLoading(true);
        videoRef.current.play().catch(() => {});
      }
    };
    window.addEventListener('click', handleGlobalInteraction);
    return () => window.removeEventListener('click', handleGlobalInteraction);
  }, [hasStarted, hasError]);

  const timeString = currentTime.toLocaleTimeString([], { hour12: false });
  const dateString = currentTime.toLocaleDateString('en-GB').replace(/\//g, '-');

  return (
    <div className={cn(
      "relative group rounded-2xl overflow-hidden border transition-all duration-500 bg-slate-950 aspect-video shadow-2xl",
      isSearching && "brightness-50",
      hasError ? "border-red-500/50" : "border-slate-800"
    )}>
      {/* Loading Overlay */}
      {hasStarted && isLoading && !hasError && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-2" />
          <div className="text-[10px] font-mono text-blue-500/60 animate-pulse uppercase tracking-widest">ESTABLISHING LINK...</div>
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-red-950/40 backdrop-blur-md">
          <div className="text-red-500 mb-2">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="text-[9px] font-mono text-red-400 uppercase tracking-widest bg-black/40 px-2 py-1 rounded">FEED_RECOVERY_FAILED</div>
          <button 
            onClick={() => { 
              setHasError(false); 
              setIsLoading(true); 
              if(videoRef.current) {
                videoRef.current.load();
                videoRef.current.play().catch(console.error);
              }
            }}
            className="mt-4 text-[8px] text-white/40 hover:text-white underline underline-offset-4"
          >
            RE-ESTABLISH HANDSHAKE
          </button>
        </div>
      )}
      {/* HUD Overlays */}
      <div className="absolute inset-0 z-20 pointer-events-none p-4 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 bg-black/80 backdrop-blur rounded text-[9px] font-mono font-bold tracking-widest text-white border border-white/20">
                {id}
              </div>
              <div className="px-2 py-0.5 bg-red-600/80 backdrop-blur rounded text-[9px] font-bold uppercase text-white flex items-center gap-1 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> REC
              </div>
            </div>
            <div className="text-[10px] text-white font-medium drop-shadow-lg tracking-tight bg-black/20 px-1 rounded inline-block">
              {location}
            </div>
          </div>
          
          <div className="text-right space-y-0.5">
            <div className="text-[11px] font-mono font-bold text-white drop-shadow-lg tabular-nums">
              {dateString} // {timeString}
            </div>
            <div className="text-[8px] font-mono text-white/60 tracking-widest uppercase">
              FPS: 30.00 // BITRATE: 4.2 MBPS
            </div>
          </div>
        </div>

        <div className="flex justify-between items-end">
          <div className="flex gap-4">
            <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-2 rounded-lg">
              <div className="text-[7px] uppercase font-bold text-slate-400 mb-0.5">Flow Rate</div>
              <div className="text-[10px] font-mono font-bold text-blue-400">{stats?.flow || 0} vpm</div>
            </div>
            <div className="bg-black/40 backdrop-blur-sm border border-white/10 p-2 rounded-lg">
              <div className="text-[7px] uppercase font-bold text-slate-400 mb-0.5">Avg Speed</div>
              <div className="text-[10px] font-mono font-bold text-green-400">{stats?.avgSpeed || 0} km/h</div>
            </div>
          </div>
          <div className="w-12 h-12 border-r border-b border-white/20 rounded-br-lg" />
        </div>
      </div>

      {/* Frame Corners */}
      <div className="absolute top-4 left-4 w-4 h-4 border-l border-t border-white/30 z-10" />
      <div className="absolute top-4 right-4 w-4 h-4 border-r border-t border-white/30 z-10" />
      <div className="absolute bottom-4 left-4 w-4 h-4 border-l border-b border-white/30 z-10" />
      <div className="absolute bottom-4 right-4 w-4 h-4 border-r border-b border-white/30 z-10" />

      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      
      {/* Video Feed */}
      <video 
        ref={videoRef}
        key={`${url}-${hasStarted}`}
        src={url}
        muted 
        autoPlay
        loop 
        playsInline
        preload="auto"
        onLoadStart={() => setIsLoading(true)}
        onPlaying={() => setIsLoading(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onLoadedData={() => setIsLoading(false)}
        onPause={() => {
          if (hasStarted && !hasError) setIsLoading(true);
        }}
        onError={(e) => { 
          const videoElement = e.currentTarget;
          if (hasStarted) {
            const errorMsg = videoElement.error?.message || "MEDIA_SOURCE_UNAVAILABLE";
            console.error(`Video Error [${id}]:`, {
              code: videoElement.error?.code,
              message: errorMsg,
              src: videoElement.currentSrc || url
            });
            setHasError(true); 
            setIsLoading(false);
          }
        }}
        className={cn(
          "w-full h-full object-cover group-hover:scale-105 transition-transform duration-[10000ms] ease-linear",
          transform
        )}
      />

      {/* Bounding Box Simulation (Random) */}
      {!isSearching && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: [0, 1, 0, 0],
            x: [0, 20, 15, 0],
            y: [0, -10, 5, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
          className="absolute border-2 border-green-500/60 w-32 h-20 pointer-events-none"
          style={{ left: '30%', top: '40%' }}
        >
          <div className="absolute -top-6 left-0 bg-green-500/80 text-black text-[9px] font-bold px-1 rounded uppercase tracking-tighter">
            VEHICLE [ID_SEC_CAM]
          </div>
        </motion.div>
      )}

      {/* Scanning Search Effect */}
      {isSearching && (
        <motion.div 
          initial={{ top: '0%' }}
          animate={{ top: '100%' }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-x-0 h-0.5 bg-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-20"
        />
      )}
    </div>
  );
}

/// Simulated Surveillance Sources (Chennai City)
// Simulation based on Ryankraus Traffic Camera Dataset (Kaggle)
const CAMERAS = [
  { 
    id: 'CAM-01', 
    location: 'Anna Salai (Mount Road)', 
    url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/car-detection.mp4', 
    transform: '',
    stats: { flow: 42, avgSpeed: 38 }
  },
  { 
    id: 'CAM-02', 
    location: 'T. Nagar (Panagal Park)', 
    url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/person-bicycle-car-detection.mp4', 
    transform: 'scale-x-[-1]',
    stats: { flow: 28, avgSpeed: 24 }
  },
  { 
    id: 'CAM-03', 
    location: 'Koyambedu Junction', 
    url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/car-detection.mp4', 
    transform: 'rotate-180',
    stats: { flow: 65, avgSpeed: 45 }
  },
  { 
    id: 'CAM-04', 
    location: 'OMR IT Corridor', 
    url: 'https://raw.githubusercontent.com/intel-iot-devkit/sample-videos/master/car-detection.mp4', 
    transform: 'grayscale brightness-125 opacity-90',
    stats: { flow: 52, avgSpeed: 40 }
  },
];

export default function App() {
  const [activeCam, setActiveCam] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [vahanData, setVahanData] = useState<any>(null);
  const [showVahanModal, setShowVahanModal] = useState(false);
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'monitor' | 'reid' | 'map'>('monitor');
  const [scanning, setScanning] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const verifyVahan = async () => {
    if (!searchQuery) return;
    setIsVerifying(true);
    
    try {
      // Import the service dynamically or use it directly
      const { fetchRealVahanDetails } = await import('./services/vahanService');
      const data = await fetchRealVahanDetails(searchQuery.toUpperCase());
      setVahanData(data);
      setShowVahanModal(true);
    } catch (error) {
      console.error(error);
      // Fallback
      setVahanData({ 
        owner: 'System Error', 
        model: 'Lookup Failed', 
        rto: 'None', 
        status: 'Offline' 
      });
      setShowVahanModal(true);
    } finally {
      setIsVerifying(false);
    }
  };

  const startScan = async () => {
    setShowVahanModal(false);
    setScanning(true);
    setIsSearching(true);

    // Simulate search delay
    setTimeout(() => {
      const statuses = ['CLEAN', 'FLAGGED', 'STOLEN'];
      const status = vahanData?.status?.includes('STOLEN') ? 'STOLEN' : statuses[Math.floor(Math.random() * (vahanData?.status ? 3 : 2))];
      const proximity = Math.floor(Math.random() * 2000) + 100; // 100m to 2.1km
      
      const mockResult = {
        id: `DET-${Math.floor(1000 + Math.random() * 9000)}`,
        camera: CAMERAS[Math.floor(Math.random() * CAMERAS.length)].id,
        location: CAMERAS[Math.floor(Math.random() * CAMERAS.length)].location,
        plate: searchQuery.toUpperCase(),
        timestamp: new Date().toLocaleTimeString(),
        confidence: 0.92 + Math.random() * 0.07,
        color: vahanData?.color || 'Unknown',
        type: vahanData?.model || 'Unknown Vehicle',
        status: status,
        proximity: proximity,
        image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=400',
        reid_score: 0.88 + Math.random() * 0.1,
        description: `Target acquired. ${status === 'STOLEN' ? 'CRITICAL: Vehicle reported STOLEN.' : status === 'FLAGGED' ? 'WARNING: Vehicle flagged for investigation.' : 'Vehicle verified.'} Matches Vahan records for ${vahanData?.model || 'the searched plate'}.`
      };

      const calculatePriority = (m: any) => {
        let score = 0;
        if (m.status === 'STOLEN') score += 10000;
        if (m.status === 'FLAGGED') score += 5000;
        score += m.confidence * 1000;
        score += (1 - m.proximity / 3000) * 500;
        return score;
      };

      const newMatches = [mockResult, ...matches].sort((a, b) => calculatePriority(b) - calculatePriority(a));
      setMatches(newMatches);
      setHistory([mockResult, ...history]);
      setSelectedMatch(mockResult);
      setScanning(false);
      setIsSearching(false);
    }, 2500);
  };

  return (
    <div className="flex h-screen bg-[#0A0A0B] text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 border-r border-slate-800 flex flex-col bg-[#0F0F12]">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight">UrbanTrack-DL</h1>
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Deep Learning Framework</span>
          </div>
        </div>

        <div className="flex bg-slate-900/50 p-1 m-4 rounded-lg border border-slate-800">
          {(['monitor', 'reid', 'map'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-1.5 text-[9px] font-bold uppercase tracking-wider rounded transition-all",
                activeTab === tab ? "bg-blue-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
          {/* Tracking Input */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 flex items-center gap-2">
                <Search className="w-3 h-3" /> Target Acquisition
              </h2>
            </div>
            <div className="space-y-4">
              <div className="relative group">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="PLATE NUMBER..."
                  className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={verifyVahan}
                  disabled={scanning || isVerifying}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-3 text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {(scanning || isVerifying) ? (
                    <Activity className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  {isVerifying ? 'VERIFYING...' : scanning ? 'SCANNING...' : 'VERIFY VAHAN'}
                </button>
                <button className="aspect-square bg-slate-800 hover:bg-slate-700 rounded-xl flex items-center justify-center text-slate-400">
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>

          {/* Active Alerts */}
          <section className="space-y-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-red-500 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" /> Detection Logs
            </h2>
            <div className="space-y-3">
              <AnimatePresence>
                {matches.map((match) => {
                  const isStolen = match.status === 'STOLEN';
                  const isFlagged = match.status === 'FLAGGED';
                  const priority = isStolen ? 'P1' : (isFlagged || match.confidence > 0.95) ? 'P2' : 'P3';
                  
                  return (
                    <motion.div 
                      key={match.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => setSelectedMatch(match)}
                      className={cn(
                        "p-3 rounded-xl border space-y-2 group transition-all cursor-pointer relative overflow-hidden",
                        selectedMatch?.id === match.id 
                          ? isStolen ? "bg-red-500/20 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.2)]" : "bg-blue-500/20 border-blue-500/40"
                          : isStolen ? "bg-red-950/20 border-red-900/40 hover:border-red-500/40" : "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                      )}
                    >
                      {isStolen && (
                        <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 blur-2xl -mr-8 -mt-8 animate-pulse" />
                      )}
                      
                      <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-bold font-mono",
                            priority === 'P1' ? "bg-red-600 text-white" : priority === 'P2' ? "bg-orange-600 text-white" : "bg-slate-700 text-slate-300"
                          )}>{priority}</span>
                          <span className={cn(
                            "text-[10px] font-mono",
                            isStolen ? "text-red-400" : "text-slate-400"
                          )}>{match.id}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono tracking-tighter">{match.timestamp}</span>
                      </div>
                      
                      <div className="flex items-end justify-between relative z-10">
                        <div>
                          <div className={cn(
                            "font-bold text-sm tracking-tight",
                            isStolen ? "text-red-500" : "text-slate-100"
                          )}>{match.plate}</div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                            <MapPin className="w-2 h-2" /> {match.camera}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[9px] font-mono text-slate-500 flex items-center gap-1 justify-end">
                            <Zap className={cn("w-2 h-2", match.confidence > 0.9 ? "text-green-500" : "text-yellow-500")} />
                            {(match.confidence * 100).toFixed(0)}%
                          </div>
                          <div className="text-[9px] font-mono text-blue-500/80 mt-0.5">
                            {match.proximity > 1000 ? `${(match.proximity / 1000).toFixed(1)}km` : `${match.proximity}m`} DIST
                          </div>
                        </div>
                      </div>
                      
                      {isStolen && (
                        <div className="pt-1.5 border-t border-red-500/20 flex items-center gap-1.5">
                          <AlertTriangle className="w-2.5 h-2.5 text-red-500 animate-bounce" />
                          <span className="text-[8px] font-bold text-red-500 uppercase tracking-widest">IMMEDIATE INTERCEPTION REQUIRED</span>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {matches.length === 0 && (
                <div className="text-[10px] text-slate-600 text-center py-4 border border-dashed border-slate-800 rounded-xl">
                  Waiting for detections...
                </div>
              )}
            </div>
          </section>

          {/* Forensic Evidence Detail */}
          <AnimatePresence>
            {selectedMatch && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="space-y-4 pt-4 border-t border-slate-800"
              >
                <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-500 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> Forensic Evidence
                </h2>
                <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video relative group">
                  <img src={selectedMatch.image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Evidence" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-bottom p-3">
                    <div className="mt-auto flex justify-between w-full items-center">
                      <span className="text-[9px] font-mono font-bold text-blue-400 cursor-pointer">ENHANCE_IMAGE</span>
                      <Maximize2 className="ml-auto w-3 h-3 text-slate-400" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                    <div className="text-[8px] uppercase text-slate-500 font-bold mb-1">OCR Confidence</div>
                    <div className="text-xs font-bold text-green-500">{(selectedMatch.confidence * 100).toFixed(1)}%</div>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                    <div className="text-[8px] uppercase text-slate-500 font-bold mb-1">Re-ID Similarity</div>
                    <div className="text-xs font-bold text-blue-400">{(selectedMatch.reid_score * 100).toFixed(1)}%</div>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                    <div className="text-[8px] uppercase text-slate-500 font-bold mb-1">Status</div>
                    <div className={cn(
                      "text-xs font-bold",
                      selectedMatch.status === 'STOLEN' ? "text-red-500" : selectedMatch.status === 'FLAGGED' ? "text-orange-500" : "text-green-500"
                    )}>
                      {selectedMatch.status}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                    <div className="text-[8px] uppercase text-slate-500 font-bold mb-1">Target Proximity</div>
                    <div className="text-xs font-bold text-blue-500 font-mono">
                      {selectedMatch.proximity}m
                    </div>
                  </div>
                </div>
                <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="text-[8px] uppercase text-slate-500 font-bold">Deep Feature Vector</div>
                    <div className="text-[8px] font-mono text-slate-600">v_dim: 1024</div>
                  </div>
                  <div className="flex gap-0.5 h-1 items-end">
                    {Array.from({ length: 40 }).map((_, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-blue-500/40 rounded-full" 
                        style={{ height: `${Math.random() * 100}%` }} 
                      />
                    ))}
                  </div>
                  <div className="text-[11px] font-medium text-slate-300">{selectedMatch.type} • {selectedMatch.color}</div>
                  <p className="text-[9px] leading-relaxed text-slate-500 italic mt-2">"{selectedMatch.description}"</p>
                </div>
                <button 
                  onClick={() => setSelectedMatch(null)}
                  className="w-full py-2 text-[10px] font-bold text-slate-500 hover:text-white transition-colors"
                >
                  DISMISS DATA
                </button>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {/* User Profile */}
        <div className="p-6 border-t border-slate-800 bg-[#0A0A0C]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <User className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate leading-tight">Arun Krish</div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest">Admin Control</div>
            </div>
            <button className="text-slate-500 hover:text-white transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-black pt-16">
        {/* Welcome / Init UI */}
        <AnimatePresence>
          {!hasStarted && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-[100] bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-24 h-24 mb-6 relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
                <div className="relative w-full h-full bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center">
                  <Shield className="w-10 h-10 text-blue-500" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Chennai Urban Guard</h1>
              <p className="text-slate-400 text-sm max-w-sm mb-8 leading-relaxed">
                Auth link established. System requires manual initialization to establish secure multi-camera data pipelines.
              </p>
              <button 
                onClick={() => setHasStarted(true)}
                className="px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-blue-500/20 flex items-center gap-3 active:scale-95 group"
              >
                <Activity className="w-5 h-5 group-hover:scale-110 transition-transform" /> START SURVEILLANCE FEEDS
              </button>
              <div className="mt-8 flex gap-8">
                <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest">FPS: 30.0 FIX</div>
                <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest">NETWORK: OPTIMAL</div>
                <div className="text-[9px] font-mono text-slate-700 uppercase tracking-widest">NODES: 04 ACTIVE</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Header Bars */}
        <header className="absolute top-0 left-0 right-0 h-16 flex items-center justify-between px-8 z-10 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 font-mono">System Active</span>
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="w-3 h-3" />
              <span className="text-[10px] font-mono tracking-tighter">
                {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-900 border border-slate-800 rounded-full">
              <Activity className="w-3 h-3 text-blue-500" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">GPU UTIL: 42%</span>
            </div>
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-blue-500/5 border border-blue-500/20 rounded-full">
              <span className="text-[9px] font-mono text-blue-500/60 uppercase tracking-widest">Dataset: Kaggle/ryankraus-traffic</span>
            </div>
            <button className="bg-slate-900 p-2 rounded-lg border border-slate-800 text-slate-400 hover:text-white">
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Surveillance Grid */}
        <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
          <div className="grid grid-cols-2 gap-4 h-full min-h-[600px]">
            {CAMERAS.map((cam) => (
              <div 
                key={cam.id}
                className={cn(
                  "cursor-pointer transition-all duration-500",
                  activeCam === cam.id ? "col-span-2 row-span-2" : ""
                )}
                onClick={() => setActiveCam(activeCam === cam.id ? null : cam.id)}
              >
                <LiveCamera 
                  url={cam.url}
                  id={cam.id}
                  location={cam.location}
                  transform={cam.transform}
                  isSearching={isSearching}
                  stats={cam.stats}
                  hasStarted={hasStarted}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Footer Status Bar */}
        <footer className="h-8 bg-[#0F0F12] border-t border-slate-800 px-8 flex items-center justify-between z-10">
          <div className="flex gap-4">
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Database: Encrypted</span>
            <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Network: Secure</span>
          </div>
          <div className="text-[9px] font-mono text-slate-600">
            © 2026 URBANTRACK-DL RESEARCH // MULTI-CAM-REID-FRAMEWORK v1.8
          </div>
        </footer>
      </main>

      {/* VAHAN Data Verification Modal */}
      <AnimatePresence>
        {showVahanModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVahanModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0F0F12] border border-slate-800 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-blue-600/20 p-3 rounded-2xl border border-blue-600/30">
                  <Shield className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-tight">VAHAN Verification</h3>
                  <p className="text-[10px] text-slate-500 font-mono">TN-RTO MASTER DATABASE</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">Plate Number</label>
                    <div className="text-sm font-mono font-bold text-white">{searchQuery.toUpperCase()}</div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-bold text-slate-500 tracking-widest">Status</label>
                    <div className={cn("text-xs font-bold", vahanData?.status.includes('STOLEN') ? "text-red-500" : "text-green-500")}>
                      {vahanData?.status}
                    </div>
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Owner Name</span>
                    <span className="text-xs font-medium text-slate-200">{vahanData?.owner}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Vehicle Model</span>
                    <span className="text-xs font-medium text-slate-200">{vahanData?.model}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">RTO Location</span>
                    <span className="text-xs font-medium text-slate-200">{vahanData?.rto}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400">Color</span>
                    <span className="text-xs font-medium text-slate-200">{vahanData?.color}</span>
                  </div>
                  {vahanData?.fuelType && (
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-400">Fuel Type</span>
                      <span className="text-xs font-medium text-slate-200">{vahanData?.fuelType}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <p className="text-[9px] text-blue-400 leading-relaxed">
                    Verification successful. Data cross-referenced with simulated Kaggle Traffic Dataset (ryankraus) and RTO records.
                  </p>
                  <a 
                    href={`https://www.carinfo.app/vehicle-registration-details/${searchQuery.toUpperCase()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[9px] font-bold text-blue-300 hover:text-white underline mt-1 inline-block"
                  >
                    View on CarInfo External Dashboard ↗
                  </a>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowVahanModal(false)}
                  className="flex-1 px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all"
                >
                  CANCEL
                </button>
                <button 
                  onClick={startScan}
                  className="flex-2 px-6 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 text-xs font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
                >
                  CONFIRM & TRACK
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

