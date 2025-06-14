
import React, { useState } from 'react';
import { Image, Wand2, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ThumbnailService } from '@/services/thumbnailService';

interface ThumbnailGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  onThumbnailCreate: (thumbnailData: {
    url: string;
    name: string;
    type: 'ai' | 'upload';
    prompt?: string;
  }) => void;
  format: '16:9' | '9:16';
}

const ThumbnailGenerator: React.FC<ThumbnailGeneratorProps> = ({
  isOpen,
  onClose,
  onThumbnailCreate,
  format
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'upload'>('ai');
  const [prompt, setPrompt] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const thumbnailService = new ThumbnailService();

  const handleAIGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please enter a description for your thumbnail');
      return;
    }

    if (!apiKey.trim()) {
      alert('Please enter your OpenAI API key');
      return;
    }

    setIsGenerating(true);
    try {
      thumbnailService.setApiKey(apiKey);
      
      const dimensions = format === '16:9' 
        ? { width: 1920, height: 1080 }
        : { width: 1080, height: 1920 };

      const result = await thumbnailService.generateThumbnail({
        prompt,
        ...dimensions
      });

      setPreviewUrl(result.url);
    } catch (error) {
      console.error('Generation failed:', error);
      alert('Failed to generate thumbnail. Please check your API key and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setActiveTab('upload');
    }
  };

  const handleCreateThumbnail = () => {
    if (!previewUrl) {
      alert('Please generate or upload a thumbnail first');
      return;
    }

    onThumbnailCreate({
      url: previewUrl,
      name: activeTab === 'ai' ? `AI: ${prompt}` : 'Uploaded Thumbnail',
      type: activeTab,
      prompt: activeTab === 'ai' ? prompt : undefined
    });

    // Reset state
    setPreviewUrl(null);
    setPrompt('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Image size={20} />
            Create Thumbnail ({format})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tab Selection */}
          <div className="flex gap-2">
            <Button
              onClick={() => setActiveTab('ai')}
              variant={activeTab === 'ai' ? 'default' : 'outline'}
              size="sm"
              className={activeTab === 'ai' ? 'bg-white text-black' : 'bg-gray-800 text-white border-gray-600'}
            >
              <Wand2 size={16} className="mr-1" />
              AI Generated
            </Button>
            <Button
              onClick={() => setActiveTab('upload')}
              variant={activeTab === 'upload' ? 'default' : 'outline'}
              size="sm"
              className={activeTab === 'upload' ? 'bg-white text-black' : 'bg-gray-800 text-white border-gray-600'}
            >
              <Upload size={16} className="mr-1" />
              Upload Image
            </Button>
          </div>

          {/* AI Generation Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">OpenAI API Key</label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Get your API key from OpenAI dashboard
                </p>
              </div>
              
              <div>
                <label className="text-sm font-medium block mb-1">Describe your thumbnail</label>
                <Textarea
                  placeholder="e.g., A professional cooking video thumbnail with fresh ingredients and bright lighting"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white resize-none"
                  rows={3}
                />
              </div>

              <Button
                onClick={handleAIGenerate}
                disabled={isGenerating || !prompt.trim() || !apiKey.trim()}
                className="w-full bg-white text-black hover:bg-gray-200"
              >
                {isGenerating ? 'Generating...' : 'Generate Thumbnail'}
              </Button>
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium block mb-1">Upload Image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="bg-gray-800 border-gray-600 text-white"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Recommended: {format === '16:9' ? '1920x1080' : '1080x1920'} pixels
                </p>
              </div>
            </div>
          )}

          {/* Preview */}
          {previewUrl && (
            <Card className="p-3 bg-gray-800 border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Preview</span>
                <Button
                  onClick={() => setPreviewUrl(null)}
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <X size={12} />
                </Button>
              </div>
              <div 
                className={`relative mx-auto bg-black rounded overflow-hidden ${
                  format === '16:9' ? 'aspect-video max-w-full' : 'aspect-[9/16] max-w-32'
                }`}
              >
                <img
                  src={previewUrl}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                />
              </div>
            </Card>
          )}

          {/* Create Button */}
          <Button
            onClick={handleCreateThumbnail}
            disabled={!previewUrl}
            className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50"
          >
            Add to Timeline
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThumbnailGenerator;
