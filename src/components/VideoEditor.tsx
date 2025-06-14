
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
    console.log('Exporting video with settings:', {
      format,
      trimStart,
      trimEnd,
      captions,
      volume: volume[0],
      tracks
    });
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
                    className="w-full bg-white text-black hover:bg-gray-200"
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
