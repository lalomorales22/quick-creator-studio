import React, { useRef, useState } from 'react';
import { Video, Volume2, Type, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface MediaFile {
  id: string;
  file: File;
  type: 'video' | 'audio' | 'thumbnail';
  url: string;
  duration: number;
  name: string;
  startTime: number;
  clipDuration: number;
  trackPosition: number;
  thumbnailData?: {
    type: 'ai' | 'upload';
    prompt?: string;
  };
}

interface Track {
  id: string;
  type: 'video' | 'audio' | 'subtitle';
  items: MediaFile[];
}

interface MultiTrackTimelineProps {
  tracks: Track[];
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  onTracksUpdate: (tracks: Track[]) => void;
  onItemRemove: (trackId: string, itemId: string) => void;
}

const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  tracks,
  duration,
  currentTime,
  onSeek,
  onTracksUpdate,
  onItemRemove
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragData, setDragData] = useState<{
    itemId: string;
    trackId: string;
    type: 'move' | 'resize-start' | 'resize-end';
    startX: number;
    initialStartTime: number;
    initialDuration: number;
  } | null>(null);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || isDragging || dragData) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    const time = (percentage / 100) * duration;
    onSeek(time);
  };

  const addTrack = (type: 'video' | 'audio' | 'subtitle') => {
    const newTrack: Track = {
      id: `${type}-track-${Date.now()}`,
      type,
      items: []
    };
    onTracksUpdate([...tracks, newTrack]);
  };

  const removeTrack = (trackId: string) => {
    onTracksUpdate(tracks.filter(track => track.id !== trackId));
  };

  const removeItem = (trackId: string, itemId: string) => {
    onItemRemove(trackId, itemId);
  };

  const handleMouseDown = (e: React.MouseEvent, item: MediaFile, trackId: string, type: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault();
    e.stopPropagation();
    
    setDragData({
      itemId: item.id,
      trackId,
      type,
      startX: e.clientX,
      initialStartTime: item.startTime,
      initialDuration: item.clipDuration
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragData || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragData.startX;
    const deltaTime = (deltaX / rect.width) * duration;

    const updatedTracks = tracks.map(track => {
      if (track.id !== dragData.trackId) return track;
      
      return {
        ...track,
        items: track.items.map(item => {
          if (item.id !== dragData.itemId) return item;

          if (dragData.type === 'move') {
            const newStartTime = Math.max(0, dragData.initialStartTime + deltaTime);
            return { 
              ...item, 
              startTime: newStartTime,
              trackPosition: (newStartTime / duration) * 100
            };
          } else if (dragData.type === 'resize-end')  {
            const minDuration = 1; // 1 second minimum
            const newDuration = Math.max(minDuration, dragData.initialDuration + deltaTime);
            const maxDuration = duration - item.startTime;
            return { 
              ...item, 
              clipDuration: Math.min(newDuration, Math.min(maxDuration, item.duration))
            };
          } else if (dragData.type === 'resize-start') {
            const newStartTime = Math.max(0, dragData.initialStartTime + deltaTime);
            const maxStartTimeChange = dragData.initialDuration - 1; // Keep at least 1 second
            const actualStartTimeChange = Math.min(deltaTime, maxStartTimeChange);
            const newDuration = dragData.initialDuration - actualStartTimeChange;
            
            return { 
              ...item, 
              startTime: newStartTime,
              clipDuration: Math.max(1, newDuration),
              trackPosition: (newStartTime / duration) * 100
            };
          }
          return item;
        })
      };
    });

    onTracksUpdate(updatedTracks);
  };

  const handleMouseUp = () => {
    setDragData(null);
    setIsDragging(false);
  };

  React.useEffect(() => {
    if (dragData) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragData]);

  const getTrackIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video size={16} className="text-white" />;
      case 'audio':
        return <Volume2 size={16} className="text-white" />;
      case 'subtitle':
        return <Type size={16} className="text-white" />;
      default:
        return null;
    }
  };

  const getTrackLabel = (track: Track) => {
    if (track.id === 'thumbnail-track') {
      return 'Thumbnail';
    }
    return track.type.charAt(0).toUpperCase() + track.type.slice(1);
  };

  const currentTimePercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Helper function to convert time to display format
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold">Timeline</h3>
        <div className="flex gap-2">
          <Button
            onClick={() => addTrack('video')}
            size="sm"
            className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1"
          >
            <Plus size={12} className="mr-1" />
            Video
          </Button>
          <Button
            onClick={() => addTrack('audio')}
            size="sm"
            className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1"
          >
            <Plus size={12} className="mr-1" />
            Audio
          </Button>
          <Button
            onClick={() => addTrack('subtitle')}
            size="sm"
            className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1"
          >
            <Plus size={12} className="mr-1" />
            Subtitle
          </Button>
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="min-w-[800px]">
          {/* Timeline Header */}
          <div className="relative mb-2">
            <div
              ref={timelineRef}
              className="h-6 bg-gray-800 rounded cursor-pointer relative"
              onClick={handleTimelineClick}
            >
              {/* Time markers */}
              <div className="absolute inset-0 flex">
                {Array.from({ length: 11 }).map((_, i) => {
                  const timeAtMarker = (duration * i) / 10;
                  return (
                    <div
                      key={i}
                      className="flex-1 border-l border-gray-600 text-xs text-gray-400 pl-1"
                      style={{ fontSize: '10px' }}
                    >
                      {i === 0 ? formatTime(timeAtMarker) : i === 10 ? formatTime(timeAtMarker) : ''}
                    </div>
                  );
                })}
              </div>
              
              {/* Playhead */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white z-10"
                style={{ left: `${currentTimePercentage}%` }}
              >
                <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full" />
              </div>
            </div>
          </div>

          {/* Tracks */}
          <div className="space-y-2">
            {tracks.map((track) => (
              <div key={track.id} className="flex items-center gap-3">
                {/* Track Label */}
                <div className="w-20 flex items-center gap-2 text-sm flex-shrink-0">
                  {getTrackIcon(track.type)}
                  <span className="text-white capitalize text-xs">
                    {getTrackLabel(track)}
                  </span>
                  {tracks.filter(t => t.type === track.type).length > 1 && track.id !== 'thumbnail-track' && (
                    <Button
                      onClick={() => removeTrack(track.id)}
                      size="sm"
                      className="w-4 h-4 p-0 bg-red-600 hover:bg-red-700"
                    >
                      <X size={10} />
                    </Button>
                  )}
                </div>

                {/* Track Content */}
                <div className="flex-1 h-12 bg-gray-800 rounded relative border border-gray-700">
                  {track.items.map((item) => {
                    const itemLeft = (item.startTime / duration) * 100;
                    const itemWidth = (item.clipDuration / duration) * 100;
                    
                    return (
                      <div
                        key={item.id}
                        className={`absolute top-1 bottom-1 rounded border flex items-center px-2 cursor-move transition-colors group ${
                          item.type === 'thumbnail' 
                            ? 'bg-purple-600 border-purple-500 hover:bg-purple-500' 
                            : 'bg-gray-600 border-gray-500 hover:bg-gray-500'
                        }`}
                        style={{
                          left: `${itemLeft}%`,
                          width: `${itemWidth}%`,
                          minWidth: '20px'
                        }}
                        onMouseDown={(e) => handleMouseDown(e, item, track.id, 'move')}
                      >
                        {/* Resize handle - start */}
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => handleMouseDown(e, item, track.id, 'resize-start')}
                        />
                        
                        {/* Content with thumbnail preview */}
                        {item.type === 'thumbnail' && (
                          <div className="flex items-center gap-2 flex-1">
                            <img 
                              src={item.url} 
                              alt="Thumbnail" 
                              className="w-6 h-6 rounded object-cover"
                            />
                            <span className="text-white text-xs truncate">
                              {item.thumbnailData?.type === 'ai' ? '🤖' : '📁'} {item.name}
                            </span>
                          </div>
                        )}
                        
                        {item.type !== 'thumbnail' && (
                          <>
                            <span className="text-white text-xs truncate flex-1">
                              {item.name}
                            </span>
                            <span className="text-gray-300 text-xs ml-1">
                              {Math.round(item.clipDuration)}s
                            </span>
                          </>
                        )}
                        
                        {/* Duration display for thumbnails */}
                        {item.type === 'thumbnail' && (
                          <span className="text-gray-200 text-xs ml-1">
                            {Math.round(item.clipDuration)}s
                          </span>
                        )}
                        
                        {/* Remove button */}
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeItem(track.id, item.id);
                          }}
                          size="sm"
                          className="w-4 h-4 p-0 bg-red-600 hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity ml-1"
                        >
                          <X size={8} />
                        </Button>
                        
                        {/* Resize handle - end */}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => handleMouseDown(e, item, track.id, 'resize-end')}
                        />
                      </div>
                    );
                  })}
                  
                  {/* Empty track indicator */}
                  {track.items.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-gray-500 text-xs">
                        {track.id === 'thumbnail-track' ? 'Add thumbnail here' : `Drop ${track.type} files here`}
                      </span>
                    </div>
                  )}

                  {/* Playhead overlay */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/50"
                    style={{ left: `${currentTimePercentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Timeline Footer */}
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            <span>{formatTime(0)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
};

export default MultiTrackTimeline;
