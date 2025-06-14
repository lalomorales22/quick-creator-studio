
import React from 'react';
import { Button } from '@/components/ui/button';
import { Maximize2, Smartphone } from 'lucide-react';

interface FormatToggleProps {
  format: '16:9' | '9:16';
  onFormatChange: (format: '16:9' | '9:16') => void;
}

const FormatToggle: React.FC<FormatToggleProps> = ({ format, onFormatChange }) => {
  return (
    <div className="flex items-center gap-2 justify-center">
      <Button
        variant={format === '16:9' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFormatChange('16:9')}
        className={`transition-all duration-300 ${
          format === '16:9' 
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105' 
            : 'bg-purple-900/30 border-purple-500/50 text-purple-200 hover:bg-purple-800/50'
        }`}
      >
        <Maximize2 size={16} className="mr-2" />
        Widescreen (16:9)
      </Button>
      
      <div className="w-px h-6 bg-purple-500/30" />
      
      <Button
        variant={format === '9:16' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFormatChange('9:16')}
        className={`transition-all duration-300 ${
          format === '9:16' 
            ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105' 
            : 'bg-purple-900/30 border-purple-500/50 text-purple-200 hover:bg-purple-800/50'
        }`}
      >
        <Smartphone size={16} className="mr-2" />
        Vertical (9:16)
      </Button>
    </div>
  );
};

export default FormatToggle;
