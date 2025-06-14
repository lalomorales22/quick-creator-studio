
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
            ? 'bg-white text-black hover:bg-gray-200' 
            : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
        }`}
      >
        <Maximize2 size={16} className="mr-2" />
        Widescreen (16:9)
      </Button>
      
      <div className="w-px h-6 bg-gray-600" />
      
      <Button
        variant={format === '9:16' ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFormatChange('9:16')}
        className={`transition-all duration-300 ${
          format === '9:16' 
            ? 'bg-white text-black hover:bg-gray-200' 
            : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
        }`}
      >
        <Smartphone size={16} className="mr-2" />
        Vertical (9:16)
      </Button>
    </div>
  );
};

export default FormatToggle;
