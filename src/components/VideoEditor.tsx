
import React, { useState, useRef, useCallback } from 'react';
import { Upload, Play, Pause, Scissors, Download, Type, Maximize2, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import Timeline from './Timeline';
import CaptionOverlay from './CaptionOverlay';
import FormatToggle from './FormatToggle';

interface MediaFile {
  id: string;
  file: File;
  type: 'video' | 'audio';
  url: string;
  duration: number;
  name: string;
}

interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  x: number;
  y: number;
}

const VideoEditor = () => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [format, setFormat] = useState<'16:9' | '9:16'>('16:9');
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [selectedCaption, setSelectedCaption] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [volume, setVolume] = useState([80]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
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
          name: file.name
        };
        
        setMediaFiles(prev => [...prev, mediaFile]);
        
        // Load the first video file into the player
        if (file.type.startsWith('video/') && mediaFiles.length === 0) {
          if (videoRef.current) {
            videoRef.current.src = url;
            videoRef.current.addEventListener('loadedmetadata', () => {
              setDuration(videoRef.current!.duration);
            });
          }
        }
      }
    });
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
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

  const exportVideo = () => {
    // This would trigger the export process
    console.log('Exporting video with settings:', {
      format,
      trimStart,
      trimEnd,
      captions,
      volume: volume[0]
    });
    // In a real app, this would process the video with FFmpeg or similar
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Creator Studio
          </h1>
          <p className="text-blue-200">Professional video editing made simple</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - Media Library */}
          <div className="col-span-3">
            <Card className="p-4 bg-black/20 border-purple-500/30 backdrop-blur-sm">
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
                className="border-2 border-dashed border-purple-400/50 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors mb-4"
              >
                <Upload className="mx-auto mb-2 text-purple-400" size={32} />
                <p className="text-purple-200 text-sm">
                  Drop files here or click to browse
                </p>
                <p className="text-purple-300 text-xs mt-1">
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
                    className="p-3 bg-purple-800/30 rounded-lg text-white text-sm hover:bg-purple-800/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      {file.type === 'video' ? (
                        <video className="w-8 h-8 rounded object-cover" src={file.url} />
                      ) : (
                        <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                          ♪
                        </div>
                      )}
                      <div className="flex-1 truncate">
                        <p className="truncate">{file.name}</p>
                        <p className="text-purple-300 text-xs">{file.type}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Center - Video Player */}
          <div className="col-span-6">
            <Card className="p-6 bg-black/20 border-purple-500/30 backdrop-blur-sm">
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
                    className="bg-purple-600 hover:bg-purple-700 border-purple-500 text-white"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </Button>
                  
                  <div className="flex-1">
                    <Timeline
                      duration={duration}
                      currentTime={currentTime}
                      onSeek={handleSeek}
                      trimStart={trimStart}
                      trimEnd={trimEnd}
                      onTrimChange={(start, end) => {
                        setTrimStart(start);
                        setTrimEnd(end);
                      }}
                    />
                  </div>
                  
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
          </div>

          {/* Right Sidebar - Tools */}
          <div className="col-span-3">
            <Card className="p-4 bg-black/20 border-purple-500/30 backdrop-blur-sm">
              <h3 className="text-white font-semibold mb-4">Tools</h3>
              
              <div className="space-y-4">
                {/* Trim Controls */}
                <div>
                  <label className="text-white text-sm font-medium block mb-2">
                    Trim Range
                  </label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-purple-300 text-xs">Start:</span>
                      <Input
                        type="number"
                        value={trimStart}
                        onChange={(e) => setTrimStart(Number(e.target.value))}
                        className="bg-purple-900/30 border-purple-500/50 text-white text-sm"
                        min={0}
                        max={100}
                      />
                      <span className="text-purple-300 text-xs">%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-300 text-xs">End:</span>
                      <Input
                        type="number"
                        value={trimEnd}
                        onChange={(e) => setTrimEnd(Number(e.target.value))}
                        className="bg-purple-900/30 border-purple-500/50 text-white text-sm"
                        min={0}
                        max={100}
                      />
                      <span className="text-purple-300 text-xs">%</span>
                    </div>
                  </div>
                </div>

                <Separator className="bg-purple-500/30" />

                {/* Caption Tools */}
                <div>
                  <Button
                    onClick={addCaption}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    size="sm"
                  >
                    <Type size={16} className="mr-2" />
                    Add Caption
                  </Button>
                </div>

                <Separator className="bg-purple-500/30" />

                {/* Export */}
                <div>
                  <Button
                    onClick={exportVideo}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                  >
                    <Download size={16} className="mr-2" />
                    Export Video
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
