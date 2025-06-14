import React, { useRef, useState } from 'react';
import { Video, Volume2, Type, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    initialPosition: number;
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

  // Updated removeItem function to use the new prop
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
      initialPosition: item.trackPosition || 0,
      initialDuration: item.clipDuration || item.duration
    });
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragData || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragData.startX;
    const deltaPercentage = (deltaX / rect.width) * 100;

    const updatedTracks = tracks.map(track => {
      if (track.id !== dragData.trackId) return track;
      
      return {
        ...track,
        items: track.items.map(item => {
          if (item.id !== dragData.itemId) return item;

          if (dragData.type === 'move') {
            const newPosition = Math.max(0, Math.min(100, dragData.initialPosition + deltaPercentage));
            return { ...item, trackPosition: newPosition };
          } else if (dragData.type === 'resize-end') {
            const minDuration = 5; // 5% minimum
            const newDuration = Math.max(minDuration, dragData.initialDuration + deltaPercentage);
            return { ...item, clipDuration: Math.min(newDuration, 100 - (item.trackPosition || 0)) };
          } else if (dragData.type === 'resize-start') {
            const deltaTime = (deltaPercentage / 100) * duration;
            const newStartTime = Math.max(0, (item.startTime || 0) + deltaTime);
            const newPosition = Math.max(0, dragData.initialPosition + deltaPercentage);
            const newDuration = Math.max(5, dragData.initialDuration - deltaPercentage);
            return { 
              ...item, 
              startTime: newStartTime,
              trackPosition: newPosition,
              clipDuration: newDuration
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

  const currentTimePercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

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

      {/* Timeline Header */}
      <div className="relative mb-2">
        <div
          ref={timelineRef}
          className="h-6 bg-gray-800 rounded cursor-pointer relative"
          onClick={handleTimelineClick}
        >
          {/* Time markers */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 11 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 border-l border-gray-600 text-xs text-gray-400 pl-1"
                style={{ fontSize: '10px' }}
              >
                {i === 0 ? '0:00' : ''}
              </div>
            ))}
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
            <div className="w-20 flex items-center gap-2 text-sm">
              {getTrackIcon(track.type)}
              <span className="text-white capitalize text-xs">
                {track.type}
              </span>
              {tracks.filter(t => t.type === track.type).length > 1 && (
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
                const itemWidth = item.clipDuration || 30;
                const itemLeft = item.trackPosition || 0;
                
                return (
                  <div
                    key={item.id}
                    className="absolute top-1 bottom-1 bg-gray-600 rounded border border-gray-500 flex items-center px-2 cursor-move hover:bg-gray-500 transition-colors group"
                    style={{
                      left: `${itemLeft}%`,
                      width: `${itemWidth}%`
                    }}
                    onMouseDown={(e) => handleMouseDown(e, item, track.id, 'move')}
                  >
                    {/* Resize handle - start */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseDown={(e) => handleMouseDown(e, item, track.id, 'resize-start')}
                    />
                    
                    {/* Content */}
                    <span className="text-white text-xs truncate flex-1">
                      {item.name}
                    </span>
                    
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
                    Drop {track.type} files here
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
        <span>0:00</span>
        <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
      </div>
    </div>
  );
};

export default MultiTrackTimeline;
