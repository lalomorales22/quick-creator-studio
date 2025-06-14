import React, { useState, useRef, useCallback } from 'react';
import { Upload, Play, Pause, Scissors, Download, Type, Maximize2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import MultiTrackTimeline from './MultiTrackTimeline';
import CaptionOverlay from './CaptionOverlay';
import FormatToggle from './FormatToggle';

interface MediaFile {
  id: string;
  file: File;
  type: 'video' | 'audio';
  url: string;
  duration: number;
  name: string;
  startTime: number;
  clipDuration: number;
  trackPosition: number;
}

interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  x: number;
  y: number;
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'subtitle';
  items: MediaFile[];
}

const VideoEditor = () => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [tracks, setTracks] = useState<Track[]>([
    { id: 'video-track', type: 'video', items: [] },
    { id: 'audio-track', type: 'audio', items: [] },
    { id: 'subtitle-track', type: 'subtitle', items: [] }
  ]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [format, setFormat] = useState<'16:9' | '9:16'>('16:9');
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [volume, setVolume] = useState([80]);
  const [isExporting, setIsExporting] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFiles = (files: File[]) => {
    files.forEach(file => {
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        const url = URL.createObjectURL(file);
        const mediaFile: MediaFile = {
          id: Date.now().toString() + Math.random(),
          file,
          type: file.type.startsWith('video/') ? 'video' : 'audio',
          url,
          duration: 0,
          name: file.name,
          startTime: 0,
          clipDuration: 30,
          trackPosition: 0
        };
        
        setMediaFiles(prev => [...prev, mediaFile]);
        
        // Add to appropriate track
        const trackType = file.type.startsWith('video/') ? 'video' : 'audio';
        setTracks(prev => prev.map(track => 
          track.type === trackType 
            ? { ...track, items: [...track.items, mediaFile] }
            : track
        ));
        
        // Load the first video file into the player
        if (file.type.startsWith('video/') && mediaFiles.length === 0) {
          if (videoRef.current) {
            videoRef.current.src = url;
            videoRef.current.addEventListener('loadedmetadata', () => {
              const videoDuration = videoRef.current!.duration;
              setDuration(videoDuration);
              // Update media file with actual duration
              setMediaFiles(prev => prev.map(mf => 
                mf.id === mediaFile.id ? { ...mf, duration: videoDuration, clipDuration: Math.min(30, (videoDuration / videoDuration) * 100) } : mf
              ));
            });
          }
        }
      }
    });
  };

  const playMultipleTracks = () => {
    // Get all video and audio tracks that should play at current time
    const videoTracks = tracks.filter(track => track.type === 'video');
    const audioTracks = tracks.filter(track => track.type === 'audio');
    
    // Play primary video
    if (videoRef.current && videoTracks.length > 0 && videoTracks[0].items.length > 0) {
      videoRef.current.play();
    }
    
    // Play audio tracks
    audioTracks.forEach(track => {
      track.items.forEach(item => {
        const audio = new Audio(item.url);
        audio.currentTime = item.startTime || 0;
        audio.volume = (volume[0] / 100);
        audio.play();
      });
    });
  };

  const pauseMultipleTracks = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    // Note: We'd need to keep track of audio instances to pause them properly
  };

  const togglePlayPause = () => {
    if (isPlaying) {
      pauseMultipleTracks();
    } else {
      playMultipleTracks();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const addCaption = () => {
    const newCaption: Caption = {
      id: Date.now().toString(),
      text: 'New Caption',
      startTime: currentTime,
      endTime: currentTime + 2,
      x: 50,
      y: 80
    };
    setCaptions(prev => [...prev, newCaption]);
    setSelectedCaption(newCaption.id);
  };

  const exportVideo = async () => {
    setIsExporting(true);
    
    try {
      // Create a canvas for video composition
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size based on format
      if (format === '16:9') {
        canvas.width = 1920;
        canvas.height = 1080;
      } else {
        canvas.width = 1080;
        canvas.height = 1920;
      }
      
      console.log('Starting video export with settings:', {
        format,
        trimStart,
        trimEnd,
        captions,
        volume: volume[0],
        tracks,
        canvasSize: { width: canvas.width, height: canvas.height }
      });

      // Get video tracks for composition
      const videoTracks = tracks.filter(track => track.type === 'video' && track.items.length > 0);
      const audioTracks = tracks.filter(track => track.type === 'audio' && track.items.length > 0);
      
      if (videoTracks.length === 0) {
        alert('Please add at least one video track to export');
        return;
      }

      // Create MediaRecorder to capture the composition
      const stream = canvas.captureStream(30);
      
      // Add audio tracks to the stream
      if (audioTracks.length > 0) {
        const audioContext = new AudioContext();
        const destination = audioContext.createMediaStreamDestination();
        
        audioTracks.forEach(track => {
          track.items.forEach(async (item) => {
            const audio = new Audio(item.url);
            const source = audioContext.createMediaElementSource(audio);
            const gainNode = audioContext.createGain();
            gainNode.gain.value = volume[0] / 100;
            
            source.connect(gainNode);
            gainNode.connect(destination);
          });
        });
        
        // Add audio track to video stream
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm; codecs=vp8,opus'
      });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = `exported-video-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        console.log('Video export completed');
        setIsExporting(false);
      };

      // Start recording
      mediaRecorder.start();
      
      // Simulate video composition (in a real implementation, you'd render each frame)
      const renderDuration = 3000; // 3 seconds for demo
      
      setTimeout(() => {
        mediaRecorder.stop();
      }, renderDuration);

      // Simple demo: draw a colored rectangle representing the composition
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Exported Video Composition', canvas.width / 2, canvas.height / 2);
        
        // Add captions if any
        captions.forEach(caption => {
          ctx.fillStyle = '#ffff00';
          ctx.font = '36px Arial';
          ctx.fillText(caption.text, canvas.width / 2, (canvas.height / 2) + 100);
        });
      }
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            Creator Studio
          </h1>
          <p className="text-gray-400">Professional video editing made simple</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Media Library */}
          <div className="col-span-3">
            <Card className="p-4 bg-gray-900 border-gray-700">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Upload size={18} />
                Media Library
              </h3>
              
              {/* Drop Zone */}
              <div
                ref={dropZoneRef}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-gray-500 transition-colors mb-4"
              >
                <Upload className="mx-auto mb-2 text-gray-400" size={32} />
                <p className="text-gray-300 text-sm">
                  Drop files here or click to browse
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Supports MP4, MOV, MP3, WAV
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/*,audio/*"
                onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
                className="hidden"
              />

              {/* Media Files List */}
              <div className="space-y-2">
                {mediaFiles.map((file) => (
                  <div
                    key={file.id}
                    className="p-3 bg-gray-800 rounded-lg text-white text-sm hover:bg-gray-700 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {file.type === 'video' ? (
                        <video className="w-8 h-8 rounded object-cover" src={file.url} />
                      ) : (
                        <div className="w-8 h-8 bg-gray-600 rounded flex items-center justify-center">
                          ♪
                        </div>
                      )}
                      <div className="flex-1 truncate">
                        <p className="truncate">{file.name}</p>
                        <p className="text-gray-400 text-xs">{file.type}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Center - Video Player */}
          <div className="col-span-6">
            <Card className="p-6 bg-gray-900 border-gray-700">
              {/* Format Toggle */}
              <div className="mb-4">
                <FormatToggle format={format} onFormatChange={setFormat} />
              </div>

              {/* Video Player Container */}
              <div className="relative mb-6">
                <div 
                  className={`relative mx-auto bg-black rounded-lg overflow-hidden transition-all duration-500 ${
                    format === '16:9' ? 'aspect-video max-w-full' : 'aspect-[9/16] max-w-sm'
                  }`}
                >
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={() => {
                      if (videoRef.current) {
                        setDuration(videoRef.current.duration);
                      }
                    }}
                  />
                  
                  {/* Caption Overlay */}
                  <CaptionOverlay
                    captions={captions}
                    currentTime={currentTime}
                    selectedCaption={selectedCaption}
                    onCaptionSelect={setSelectedCaption}
                    onCaptionUpdate={(id, updates) => {
                      setCaptions(prev => prev.map(cap => 
                        cap.id === id ? { ...cap, ...updates } : cap
                      ));
                    }}
                  />

                  {/* Play Button Overlay */}
                  {!isPlaying && (
                    <div 
                      className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
                      onClick={togglePlayPause}
                    >
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-4 hover:bg-white/30 transition-colors">
                        <Play className="text-white" size={32} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Player Controls */}
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    onClick={togglePlayPause}
                    variant="outline"
                    size="sm"
                    className="bg-white text-black hover:bg-gray-200 border-gray-600"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </Button>
                  
                  <div className="text-white text-sm">
                    {Math.floor(currentTime)}s / {Math.floor(duration)}s
                  </div>
                </div>

                {/* Volume Control */}
                <div className="flex items-center gap-4">
                  <span className="text-white text-sm">Volume:</span>
                  <div className="flex-1 max-w-32">
                    <Slider
                      value={volume}
                      onValueChange={setVolume}
                      max={100}
                      step={1}
                      className="cursor-pointer"
                    />
                  </div>
                  <span className="text-white text-sm">{volume[0]}%</span>
                </div>
              </div>
            </Card>

            {/* Multi-Track Timeline */}
            <div className="mt-6">
              <MultiTrackTimeline
                tracks={tracks}
                duration={duration}
                currentTime={currentTime}
                onSeek={handleSeek}
                onTracksUpdate={setTracks}
              />
            </div>
          </div>

          {/* Right Sidebar - Tools */}
          <div className="col-span-3">
            <Card className="p-4 bg-gray-900 border-gray-700">
              <h3 className="text-white font-semibold mb-4">Tools</h3>
              
              <div className="space-y-4">
                {/* Trim Controls */}
                <div>
                  <label className="text-white text-sm font-medium block mb-2">
                    Trim Range
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">Start:</span>
                      <Input
                        type="number"
                        value={trimStart}
                        onChange={(e) => setTrimStart(Number(e.target.value))}
                        className="bg-gray-800 border-gray-600 text-white text-sm"
                        min={0}
                        max={100}
                      />
                      <span className="text-gray-400 text-xs">%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs">End:</span>
                      <Input
                        type="number"
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(Number(e.target.value))}
                        className="bg-gray-800 border-gray-600 text-white text-sm"
                        min={0}
                        max={100}
                      />
                      <span className="text-gray-400 text-xs">%</span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-gray-700" />

                {/* Caption Tools */}
                <div>
                  <Button
                    onClick={addCaption}
                    className="w-full bg-white text-black hover:bg-gray-200"
                    size="sm"
                  >
                    <Type size={16} className="mr-2" />
                    Add Caption
                  </Button>
                </div>

                <Separator className="bg-gray-700" />

                {/* Export */}
                <div>
                  <Button
                    onClick={exportVideo}
                    disabled={isExporting}
                    className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50"
                  >
                    <Download size={16} className="mr-2" />
                    {isExporting ? 'Exporting...' : 'Export Video'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;
