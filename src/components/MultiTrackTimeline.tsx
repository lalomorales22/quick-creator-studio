
import React, { useRef, useState } from 'react';
import { Video, Volume2, Type, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MediaFile {
  id: string;
  file: File;
  type: 'video' | 'audio';
  url: string;
  duration: number;
  name: string;
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
}

const MultiTrackTimeline: React.FC<MultiTrackTimelineProps> = ({
  tracks,
  duration,
  currentTime,
  onSeek,
  onTracksUpdate
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || isDragging) return;
    
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
            </div>

            {/* Track Content */}
            <div className="flex-1 h-12 bg-gray-800 rounded relative border border-gray-700">
              {track.items.map((item, index) => (
                <div
                  key={item.id}
                  className="absolute top-1 bottom-1 bg-gray-600 rounded border border-gray-500 flex items-center px-2"
                  style={{
                    left: `${index * 20}%`,
                    width: `${Math.min(30, 80 - index * 20)}%`
                  }}
                >
                  <span className="text-white text-xs truncate">
                    {item.name}
                  </span>
                </div>
              ))}
              
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
