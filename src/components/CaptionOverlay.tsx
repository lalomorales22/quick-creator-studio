
import React, { useState } from 'react';
import { Input } from '@/components/ui/input';

interface Caption {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  x: number;
  y: number;
}

interface CaptionOverlayProps {
  captions: Caption[];
  currentTime: number;
  selectedCaption: string | null;
  onCaptionSelect: (id: string | null) => void;
  onCaptionUpdate: (id: string, updates: Partial<Caption>) => void;
}

const CaptionOverlay: React.FC<CaptionOverlayProps> = ({
  captions,
  currentTime,
  selectedCaption,
  onCaptionSelect,
  onCaptionUpdate
}) => {
  const [dragData, setDragData] = useState<{
    id: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  } | null>(null);

  const visibleCaptions = captions.filter(
    caption => currentTime >= caption.startTime && currentTime <= caption.endTime
  );

  const handleMouseDown = (e: React.MouseEvent, caption: Caption) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.parentElement!.getBoundingClientRect();
    setDragData({
      id: caption.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: (caption.x / 100) * rect.width,
      initialY: (caption.y / 100) * rect.height
    });
    
    onCaptionSelect(caption.id);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragData) return;

    const container = document.querySelector('[data-caption-container]') as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const deltaX = e.clientX - dragData.startX;
    const deltaY = e.clientY - dragData.startY;
    
    const newX = Math.max(0, Math.min(100, ((dragData.initialX + deltaX) / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, ((dragData.initialY + deltaY) / rect.height) * 100));

    onCaptionUpdate(dragData.id, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    setDragData(null);
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

  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      data-caption-container
      onClick={() => onCaptionSelect(null)}
    >
      {visibleCaptions.map((caption) => (
        <div
          key={caption.id}
          className={`absolute pointer-events-auto cursor-move transition-all duration-200 ${
            selectedCaption === caption.id 
              ? 'ring-2 ring-blue-400 ring-opacity-75' 
              : ''
          }`}
          style={{
            left: `${caption.x}%`,
            top: `${caption.y}%`,
            transform: 'translate(-50%, -50%)'
          }}
          onMouseDown={(e) => handleMouseDown(e, caption)}
        >
          {selectedCaption === caption.id ? (
            <Input
              value={caption.text}
              onChange={(e) => onCaptionUpdate(caption.id, { text: e.target.value })}
              className="bg-black/80 text-white border-blue-400 text-center font-bold text-lg min-w-32"
              onBlur={() => onCaptionSelect(null)}
              autoFocus
            />
          ) : (
            <div className="bg-black/80 text-white px-3 py-1 rounded-lg font-bold text-lg shadow-lg backdrop-blur-sm border border-white/20">
              {caption.text}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CaptionOverlay;
