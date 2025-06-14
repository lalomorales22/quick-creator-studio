
import React, { useRef, useEffect, useState } from 'react';

interface TimelineProps {
  duration: number;
  currentTime: number;
  onSeek: (time: number) => void;
  trimStart: number;
  trimEnd: number;
  onTrimChange: (start: number, end: number) => void;
}

const Timeline: React.FC<TimelineProps> = ({
  duration,
  currentTime,
  onSeek,
  trimStart,
  trimEnd,
  onTrimChange
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<'playhead' | 'trim-start' | 'trim-end' | null>(null);

  const handleMouseDown = (e: React.MouseEvent, type: 'playhead' | 'trim-start' | 'trim-end') => {
    e.preventDefault();
    setIsDragging(type);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !timelineRef.current) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;

    if (isDragging === 'playhead') {
      const time = (percentage / 100) * duration;
      onSeek(time);
    } else if (isDragging === 'trim-start') {
      onTrimChange(Math.min(percentage, trimEnd - 1), trimEnd);
    } else if (isDragging === 'trim-end') {
      onTrimChange(trimStart, Math.max(percentage, trimStart + 1));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(null);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (isDragging) return;
    
    const rect = timelineRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    const time = (percentage / 100) * duration;
    onSeek(time);
  };

  const currentTimePercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative">
      {/* Timeline Track */}
      <div
        ref={timelineRef}
        className="relative h-12 bg-purple-900/40 rounded-lg cursor-pointer overflow-hidden"
        onClick={handleTimelineClick}
      >
        {/* Waveform Background (simplified) */}
        <div className="absolute inset-0 flex items-center justify-center">
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              className="w-1 bg-purple-400/30 rounded-full mx-px"
              style={{
                height: `${Math.random() * 60 + 20}%`
              }}
            />
          ))}
        </div>

        {/* Trim Overlay */}
        <div className="absolute inset-0 flex">
          {/* Left trim area (dimmed) */}
          <div 
            className="bg-black/60"
            style={{ width: `${trimStart}%` }}
          />
          
          {/* Active area */}
          <div 
            className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-t-2 border-b-2 border-purple-400"
            style={{ width: `${trimEnd - trimStart}%` }}
          />
          
          {/* Right trim area (dimmed) */}
          <div 
            className="bg-black/60 flex-1"
          />
        </div>

        {/* Trim Handles */}
        <div
          className="absolute top-0 bottom-0 w-2 bg-purple-400 cursor-ew-resize hover:bg-purple-300 transition-colors"
          style={{ left: `${trimStart}%`, transform: 'translateX(-50%)' }}
          onMouseDown={(e) => handleMouseDown(e, 'trim-start')}
        />
        
        <div
          className="absolute top-0 bottom-0 w-2 bg-purple-400 cursor-ew-resize hover:bg-purple-300 transition-colors"
          style={{ left: `${trimEnd}%`, transform: 'translateX(-50%)' }}
          onMouseDown={(e) => handleMouseDown(e, 'trim-end')}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg cursor-ew-resize"
          style={{ left: `${currentTimePercentage}%` }}
          onMouseDown={(e) => handleMouseDown(e, 'playhead')}
        >
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
        </div>
      </div>

      {/* Time Markers */}
      <div className="flex justify-between text-xs text-purple-300 mt-1">
        <span>0:00</span>
        <span>{Math.floor(duration / 60)}:{String(Math.floor(duration % 60)).padStart(2, '0')}</span>
      </div>
    </div>
  );
};

export default Timeline;
