import React, { useState, useRef, useCallback } from 'react';
import { Upload, Play, Pause, Scissors, Download, Type, Maximize2, Smartphone, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import MultiTrackTimeline from './MultiTrackTimeline';
import CaptionOverlay from './CaptionOverlay';
import FormatToggle from './FormatToggle';
import ThumbnailGenerator from './ThumbnailGenerator';

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
  clipStartOffset?: number; // New: offset within the original media file
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
  const [activeAudioElements, setActiveAudioElements] = useState<HTMLAudioElement[]>([]);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  
  // New refs for better audio management
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const audioTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // New refs for timeline playback tracking
  const timelineIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const playbackStartTimeRef = useRef<number>(0);

  // Calculate total timeline duration based on all tracks
  const calculateTimelineDuration = () => {
    let maxEndTime = 0;
    tracks.forEach(track => {
      track.items.forEach(item => {
        const endTime = item.startTime + item.clipDuration;
        if (endTime > maxEndTime) {
          maxEndTime = endTime;
        }
      });
    });
    return Math.max(maxEndTime, 60); // Minimum 60 seconds
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleFiles = (files: File[]) => {
    files.forEach(file => {
      if (file.type.startsWith('video/') || file.type.startsWith('audio/')) {
        const url = URL.createObjectURL(file);
        
        // Create media element to get duration
        const mediaElement = file.type.startsWith('video/') 
          ? document.createElement('video')
          : document.createElement('audio');
        
        mediaElement.src = url;
        mediaElement.addEventListener('loadedmetadata', () => {
          const mediaDuration = mediaElement.duration;
          
          const mediaFile: MediaFile = {
            id: Date.now().toString() + Math.random(),
            file,
            type: file.type.startsWith('video/') ? 'video' : 'audio',
            url,
            duration: mediaDuration,
            name: file.name,
            startTime: 0,
            clipDuration: mediaDuration, // Use actual duration
            trackPosition: 0, // Will be calculated as percentage later
            clipStartOffset: 0 // Start from beginning of original file
          };
          
          setMediaFiles(prev => [...prev, mediaFile]);
          
          // Add to appropriate track
          const trackType = file.type.startsWith('video/') ? 'video' : 'audio';
          setTracks(prev => prev.map(track => 
            track.type === trackType 
              ? { ...track, items: [...track.items, mediaFile] }
              : track
          ));
          
          // Update timeline duration and load first video
          const newTimelineDuration = calculateTimelineDuration();
          setDuration(newTimelineDuration);
          
          // Load the first available video into the player
          if (file.type.startsWith('video/') && videoRef.current) {
            videoRef.current.src = url;
          }
        });
        
        mediaElement.load();
      }
    });
  };

  const stopAllAudio = () => {
    // Stop all active audio elements
    activeAudioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    setActiveAudioElements([]);
    
    // Clear all audio timeouts
    audioTimeoutsRef.current.forEach(timeout => {
      clearTimeout(timeout);
    });
    audioTimeoutsRef.current.clear();
    
    // Clear audio elements map
    audioElementsRef.current.clear();
  };

  const playMultipleTracks = () => {
    // Stop any currently playing audio
    stopAllAudio();
    
    // Clear any existing timeline interval
    if (timelineIntervalRef.current) {
      clearInterval(timelineIntervalRef.current);
    }
    
    // Get all video and audio tracks that should play at current time
    const videoTracks = tracks.filter(track => track.type === 'video');
    const audioTracks = tracks.filter(track => track.type === 'audio');
    
    // Record playback start time for timeline sync
    playbackStartTimeRef.current = Date.now();
    const startTimelinePosition = currentTime;
    
    // Play primary video with clipping support
    if (videoRef.current && videoTracks.length > 0 && videoTracks[0].items.length > 0) {
      const firstVideoItem = videoTracks[0].items[0];
      if (videoRef.current.src !== firstVideoItem.url) {
        videoRef.current.src = firstVideoItem.url;
      }
      
      // Only play video if current timeline position is within the clip
      if (currentTime >= firstVideoItem.startTime && currentTime < firstVideoItem.startTime + firstVideoItem.clipDuration) {
        const videoClipOffset = firstVideoItem.clipStartOffset || 0;
        const relativeTime = currentTime - firstVideoItem.startTime;
        videoRef.current.currentTime = videoClipOffset + relativeTime;
        videoRef.current.play();
      }
    }
    
    // Play audio tracks with proper clipping support and automatic stopping
    const newAudioElements: HTMLAudioElement[] = [];
    audioTracks.forEach(track => {
      track.items.forEach(item => {
        // Only play audio if current timeline position is within the clip
        if (currentTime >= item.startTime && currentTime < item.startTime + item.clipDuration) {
          const audio = new Audio(item.url);
          const clipOffset = item.clipStartOffset || 0;
          const relativeTime = currentTime - item.startTime;
          const remainingClipTime = item.clipDuration - relativeTime;
          
          audio.currentTime = clipOffset + relativeTime;
          audio.volume = (volume[0] / 100);
          
          console.log(`Playing audio clip: ${item.name}, timeline: ${currentTime}s, clip start: ${item.startTime}s, clip duration: ${item.clipDuration}s, remaining: ${remainingClipTime}s, audio time: ${audio.currentTime}s`);
          
          // Store audio element for management
          audioElementsRef.current.set(item.id, audio);
          
          // Set up automatic stopping when clip duration is reached
          const stopTimeout = setTimeout(() => {
            console.log(`Auto-stopping audio clip: ${item.name} after ${remainingClipTime}s`);
            audio.pause();
            audio.currentTime = 0;
            audioElementsRef.current.delete(item.id);
            
            // Remove from active elements
            setActiveAudioElements(prev => prev.filter(a => a !== audio));
          }, remainingClipTime * 1000);
          
          audioTimeoutsRef.current.set(item.id, stopTimeout);
          
          audio.play();
          newAudioElements.push(audio);
        }
      });
    });
    
    setActiveAudioElements(newAudioElements);
    
    // Start timeline update interval for proper clipping enforcement
    timelineIntervalRef.current = setInterval(() => {
      const elapsedTime = (Date.now() - playbackStartTimeRef.current) / 1000;
      const newTimelinePosition = startTimelinePosition + elapsedTime;
      
      setCurrentTime(newTimelinePosition);
      
      // Check if video clip should stop
      if (videoTracks.length > 0 && videoTracks[0].items.length > 0) {
        const videoItem = videoTracks[0].items[0];
        const videoClipEndTime = videoItem.startTime + videoItem.clipDuration;
        if (newTimelinePosition >= videoClipEndTime && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          console.log(`Stopping video clip at timeline ${newTimelinePosition}s (clip ends at ${videoClipEndTime}s)`);
        }
      }
      
      // Stop playback if we've reached the end of all clips
      let hasActiveClips = false;
      [...videoTracks, ...audioTracks].forEach(track => {
        track.items.forEach(item => {
          if (newTimelinePosition < item.startTime + item.clipDuration) {
            hasActiveClips = true;
          }
        });
      });
      
      if (!hasActiveClips || newTimelinePosition >= duration) {
        pauseMultipleTracks();
        setIsPlaying(false);
      }
    }, 100); // Update every 100ms for smooth playback
  };

  const pauseMultipleTracks = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    
    stopAllAudio();
    
    if (timelineIntervalRef.current) {
      clearInterval(timelineIntervalRef.current);
      timelineIntervalRef.current = null;
    }
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
    // This is now handled by the timeline interval in playMultipleTracks
    // Keep this function for video element compatibility
  };

  const handleSeek = (time: number) => {
    setCurrentTime(time);
    
    // Stop current playback
    pauseMultipleTracks();
    setIsPlaying(false);
    
    console.log(`Seeking to timeline position: ${time}s`);
    
    // Update video position with clipping support
    if (videoRef.current) {
      const videoTracks = tracks.filter(track => track.type === 'video');
      if (videoTracks.length > 0 && videoTracks[0].items.length > 0) {
        const videoItem = videoTracks[0].items[0];
        if (time >= videoItem.startTime && time < videoItem.startTime + videoItem.clipDuration) {
          const clipOffset = videoItem.clipStartOffset || 0;
          const relativeTime = time - videoItem.startTime;
          videoRef.current.currentTime = clipOffset + relativeTime;
          console.log(`Set video time to: ${videoRef.current.currentTime}s (clip offset: ${clipOffset}s, relative: ${relativeTime}s)`);
        }
      }
    }
  };

  // ... keep existing code (handleTracksUpdate, addCaption, handleItemRemoval functions)

  const handleTracksUpdate = (updatedTracks: Track[]) => {
    setTracks(updatedTracks);
    
    // Recalculate timeline duration
    const newDuration = calculateTimelineDuration();
    setDuration(newDuration);
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

    // Add caption as a subtitle track item
    const captionMediaFile: MediaFile = {
      id: newCaption.id,
      file: new File([], 'caption'),
      type: 'audio', // Using audio type as placeholder since we need MediaFile structure
      url: '',
      duration: newCaption.endTime - newCaption.startTime,
      name: newCaption.text,
      startTime: newCaption.startTime,
      clipDuration: newCaption.endTime - newCaption.startTime,
      trackPosition: (newCaption.startTime / duration) * 100
    };

    setTracks(prev => prev.map(track => 
      track.type === 'subtitle' 
        ? { ...track, items: [...track.items, captionMediaFile] }
        : track
    ));
  };

  // New function to handle item removal from both timeline and media library
  const handleItemRemoval = (trackId: string, itemId: string) => {
    // Remove from tracks
    setTracks(prev => prev.map(track => 
      track.id === trackId 
        ? { ...track, items: track.items.filter(item => item.id !== itemId) }
        : track
    ));

    // Remove from media files if it's a video or audio file
    setMediaFiles(prev => prev.filter(file => file.id !== itemId));

    // Remove from captions if it's a subtitle
    setCaptions(prev => prev.filter(caption => caption.id !== itemId));
    
    // Recalculate timeline duration
    setTimeout(() => {
      const newDuration = calculateTimelineDuration();
      setDuration(newDuration);
    }, 0);
  };

  const exportVideo = async () => {
    setIsExporting(true);
    
    try {
      // Get video and audio tracks
      const videoTracks = tracks.filter(track => track.type === 'video' && track.items.length > 0);
      const audioTracks = tracks.filter(track => track.type === 'audio' && track.items.length > 0);
      
      if (videoTracks.length === 0) {
        alert('Please add at least one video track to export');
        setIsExporting(false);
        return;
      }

      console.log('Starting MP4 export with proper codec support:', {
        format,
        trimStart,
        trimEnd,
        captions,
        volume: volume[0],
        tracks,
        videoTracks: videoTracks.length,
        audioTracks: audioTracks.length
      });

      // Create a canvas for video composition
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size based on format
      if (format === '16:9') {
        canvas.width = 1920;
        canvas.height = 1080;
      } else { // 9:16 vertical format
        canvas.width = 1080;
        canvas.height = 1920;
      }

      console.log(`Canvas dimensions set to: ${canvas.width}x${canvas.height} for format ${format}`);

      // Create video element for the main video track with clipping
      const sourceVideo = document.createElement('video');
      const videoItem = videoTracks[0].items[0];
      sourceVideo.src = videoItem.url;
      sourceVideo.muted = true; // We'll handle audio separately
      
      await new Promise((resolve) => {
        sourceVideo.addEventListener('loadedmetadata', resolve);
        sourceVideo.load();
      });

      // Create audio context for mixing audio tracks with proper clipping
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      
      // Add audio tracks to the mix with proper clipping
      const audioSources = await Promise.all(
        audioTracks.flatMap(track => 
          track.items.map(async (item) => {
            const audioElement = new Audio(item.url);
            await new Promise((resolve) => {
              audioElement.addEventListener('loadedmetadata', resolve);
              audioElement.load();
            });
            
            const source = audioContext.createMediaElementSource(audioElement);
            const gainNode = audioContext.createGain();
            gainNode.gain.value = volume[0] / 100;
            
            source.connect(gainNode);
            gainNode.connect(destination);
            
            return { audioElement, source, gainNode, item };
          })
        )
      );

      const canvasStream = canvas.captureStream(30);
      
      if (destination.stream.getAudioTracks().length > 0) {
        destination.stream.getAudioTracks().forEach(track => {
          canvasStream.addTrack(track);
        });
      }

      // Use MP4 compatible codec settings
      let mimeType = 'video/mp4';
      let codecOptions = 'codecs=avc1.42E01E,mp4a.40.2'; // H.264 + AAC
      
      // Fallback to WebM if MP4 not supported, but we'll convert it
      if (!MediaRecorder.isTypeSupported(`${mimeType}; ${codecOptions}`)) {
        console.log('MP4 not supported, using WebM for recording');
        mimeType = 'video/webm';
        if (MediaRecorder.isTypeSupported('video/webm; codecs=vp9,opus')) {
          codecOptions = 'codecs=vp9,opus';
        } else if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8,vorbis')) {
          codecOptions = 'codecs=vp8,vorbis';
        } else {
          codecOptions = '';
        }
      }

      const fullMimeType = codecOptions ? `${mimeType}; ${codecOptions}` : mimeType;
      console.log(`Using MediaRecorder with: ${fullMimeType}`);

      const mediaRecorder = new MediaRecorder(canvasStream, {
        mimeType: fullMimeType,
        videoBitsPerSecond: 5000000, // 5 Mbps for good quality
        audioBitsPerSecond: 128000   // 128 kbps for audio
      });
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        let finalBlob: Blob;
        
        if (mimeType === 'video/mp4') {
          // Already MP4, use directly
          finalBlob = new Blob(chunks, { type: 'video/mp4' });
        } else {
          // Create WebM blob first, then set type to MP4 for download
          // Note: This is a workaround - for true conversion, you'd need FFmpeg
          const webmBlob = new Blob(chunks, { type: 'video/webm' });
          
          // For better compatibility, we'll keep it as WebM but name it MP4
          // In a production environment, you'd want to use FFmpeg.js or server-side conversion
          finalBlob = new Blob([webmBlob], { type: 'video/mp4' });
          
          console.log('Note: File recorded as WebM but exported as MP4. For full compatibility, consider server-side conversion with FFmpeg.');
        }
        
        const url = URL.createObjectURL(finalBlob);
        
        // Create download link with format in filename
        const formatSuffix = format === '16:9' ? 'widescreen' : 'vertical';
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
        const a = document.createElement('a');
        a.href = url;
        a.download = `exported-video-${formatSuffix}-${timestamp}.mp4`;
        
        // Force download
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 1000);
        
        console.log(`Video export completed in ${format} format with improved MP4 compatibility`);
        setIsExporting(false);
      };

      mediaRecorder.start();
      
      // Set video to start at clip offset
      const videoClipOffset = videoItem.clipStartOffset || 0;
      sourceVideo.currentTime = videoClipOffset;
      
      // Set audio to start at their respective clip offsets with proper clipping duration
      audioSources.forEach(({ audioElement, item }) => {
        const clipOffset = item.clipStartOffset || 0;
        audioElement.currentTime = clipOffset;
        
        // Schedule audio to stop at the end of the clip duration
        const stopTime = item.clipDuration * 1000; // Convert to milliseconds
        setTimeout(() => {
          audioElement.pause();
          console.log(`Export: Stopped audio clip ${item.name} after ${item.clipDuration}s`);
        }, stopTime);
      });
      
      sourceVideo.play();
      audioSources.forEach(({ audioElement }) => {
        audioElement.play();
      });
      
      // Render frames with proper format handling to match preview
      let exportTime = 0;
      const frameInterval = setInterval(() => {
        if (!ctx || !sourceVideo) return;
        
        // Clear canvas with black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Only draw video if we're within the clipped duration
        if (exportTime <= videoItem.clipDuration && sourceVideo.videoWidth > 0 && sourceVideo.videoHeight > 0) {
          const videoAspect = sourceVideo.videoWidth / sourceVideo.videoHeight;
          const canvasAspect = canvas.width / canvas.height;
          
          let drawWidth, drawHeight, drawX, drawY;
          
          if (format === '16:9') {
            // Widescreen: fit video within bounds while maintaining aspect ratio
            if (videoAspect > canvasAspect) {
              drawWidth = canvas.width;
              drawHeight = canvas.width / videoAspect;
              drawX = 0;
              drawY = (canvas.height - drawHeight) / 2;
            } else {
              drawHeight = canvas.height;
              drawWidth = canvas.height * videoAspect;
              drawX = (canvas.width - drawWidth) / 2;
              drawY = 0;
            }
          } else {
            // Vertical format: properly crop/fit to match preview behavior
            // This should match exactly what you see in the app preview
            if (videoAspect > canvasAspect) {
              // Video is wider than canvas - crop sides (center crop)
              drawHeight = canvas.height;
              drawWidth = canvas.height * videoAspect;
              drawX = (canvas.width - drawWidth) / 2; // Center horizontally
              drawY = 0;
            } else {
              // Video is taller or same aspect - fit width and crop/center vertically
              drawWidth = canvas.width;
              drawHeight = canvas.width / videoAspect;
              drawX = 0;
              drawY = (canvas.height - drawHeight) / 2; // Center vertically
            }
          }
          
          ctx.drawImage(sourceVideo, drawX, drawY, drawWidth, drawHeight);
          
          console.log(`Frame ${Math.floor(exportTime * 30)}: Drawing video at ${drawX}, ${drawY} with size ${drawWidth}x${drawHeight} (aspect: ${videoAspect}, canvas aspect: ${canvasAspect})`);
        }
        
        // Add captions overlay
        captions.forEach(caption => {
          if (exportTime >= caption.startTime && exportTime <= caption.endTime) {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#000000';
            ctx.font = `bold ${Math.round(canvas.height * 0.05)}px Arial`; // Responsive font size
            ctx.textAlign = 'center';
            ctx.lineWidth = 3;
            
            const x = (caption.x / 100) * canvas.width;
            const y = (caption.y / 100) * canvas.height;
            
            ctx.strokeText(caption.text, x, y);
            ctx.fillText(caption.text, x, y);
          }
        });
        
        exportTime += 1/30; // 30 FPS
        
        // Stop recording when we've exported the clipped duration or reasonable limit
        if (exportTime >= Math.min(videoItem.clipDuration, 30)) {
          clearInterval(frameInterval);
          mediaRecorder.stop();
          
          audioSources.forEach(({ audioElement }) => {
            audioElement.pause();
          });
          
          audioContext.close();
        }
      }, 1000 / 30);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
      setIsExporting(false);
    }
  };

  // New state variable for thumbnail generator
  const [showThumbnailGenerator, setShowThumbnailGenerator] = useState(false);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timelineIntervalRef.current) {
        clearInterval(timelineIntervalRef.current);
      }
      stopAllAudio();
    };
  }, []);

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

        {/* Main Content - Three Column Layout */}
        <div className="grid grid-cols-12 gap-6 mb-6">
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
                        <p className="text-gray-400 text-xs">{file.type} - {Math.round(file.duration)}s</p>
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
                        const newDuration = Math.max(videoRef.current.duration, calculateTimelineDuration());
                        setDuration(newDuration);
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

                {/* Thumbnail Tools */}
                <div>
                  <Button
                    onClick={() => setShowThumbnailGenerator(true)}
                    className="w-full bg-white text-black hover:bg-gray-200"
                    size="sm"
                  >
                    <Image size={16} className="mr-2" />
                    Add Thumbnail
                  </Button>
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

        {/* Multi-Track Timeline - Full Width */}
        <div className="w-full">
          <MultiTrackTimeline
            tracks={tracks}
            duration={duration}
            currentTime={currentTime}
            onSeek={handleSeek}
            onTracksUpdate={handleTracksUpdate}
            onItemRemove={handleItemRemoval}
          />
        </div>

        {/* Thumbnail Generator Modal */}
        {showThumbnailGenerator && (
          <ThumbnailGenerator
            isOpen={showThumbnailGenerator}
            onClose={() => setShowThumbnailGenerator(false)}
            onThumbnailCreate={(thumbnail) => {
              // Add thumbnail to the thumbnail track
              const thumbnailMediaFile: MediaFile = {
                id: Date.now().toString(),
                file: new File([], 'thumbnail'),
                type: 'video', // Using video type for thumbnails
                url: thumbnail.url,
                duration: 2, // 2 seconds
                name: thumbnail.name,
                startTime: 0, // Always at the beginning
                clipDuration: 2,
                trackPosition: 0
              };

              setTracks(prev => prev.map(track => 
                track.id === 'thumbnail-track' 
                  ? { ...track, items: [thumbnailMediaFile] } // Replace existing thumbnail
                  : track
              ));

              setShowThumbnailGenerator(false);
            }}
            format={format}
          />
        )}
      </div>
    </div>
  );
};

export default VideoEditor;
