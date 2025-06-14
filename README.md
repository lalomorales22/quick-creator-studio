
# Quick Creator Studio
<img width="1046" alt="Screenshot 2025-06-14 at 1 05 23 PM" src="https://github.com/user-attachments/assets/86b34a2d-b72a-46aa-a32a-d1dd56270de7" />

A powerful web-based video editor built with React that allows you to create professional videos with AI-generated thumbnails, captions, and multi-track timeline editing.

## Project Info

**GitHub Repository**: https://github.com/lalomorales22/quick-creator-studio.git


## Features

- **Video Editing**: Upload and edit video files with a professional timeline interface
- **AI Thumbnail Generation**: Create eye-catching thumbnails using OpenAI's DALL-E API
- **Custom Thumbnails**: Upload your own thumbnail images
- **Caption System**: Add text overlays and captions to your videos
- **Multi-Track Timeline**: Work with multiple video tracks simultaneously
- **Format Support**: Switch between 16:9 and 9:16 aspect ratios
- **Export Functionality**: Export your finished videos
- **Responsive Design**: Works on desktop and mobile devices

## How to Run the Project

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation & Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/lalomorales22/quick-creator-studio.git
   cd quick-creator-studio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open the application**:
   - Navigate to `http://localhost:8080` in your browser
   - The app will automatically reload when you make changes

## How to Use Quick Creator Studio

### Getting Started
1. **Upload a Video**: Click the upload area or drag and drop a video file
2. **Choose Format**: Select between 16:9 (landscape) or 9:16 (portrait) format
3. **Edit Your Video**: Use the timeline to trim and arrange your content

### Adding Thumbnails
1. **AI-Generated Thumbnails**:
   - Click "Add Thumbnail" in the tools panel
   - Enter your OpenAI API key when prompted
   - Describe your desired thumbnail in the prompt field
   - Click "Generate Thumbnail"

2. **Custom Thumbnails**:
   - Click "Add Thumbnail" in the tools panel
   - Switch to the "Upload Custom" tab
   - Upload your own image file

### Adding Captions
1. Click "Add Caption" in the tools panel
2. Enter your caption text
3. Adjust timing and positioning as needed

### Exporting Your Video
1. Click the "Export" button when you're ready
2. Your video will be processed and made available for download

## API Configuration

### OpenAI API Key (for AI Thumbnails)
To use AI thumbnail generation, you'll need an OpenAI API key:
1. Visit [OpenAI's API platform](https://platform.openai.com/api-keys)
2. Create an account and generate an API key
3. Enter the key in the thumbnail generator when prompted

## Technologies Used

- **Frontend**: React 18 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui component library
- **Icons**: Lucide React
- **Build Tool**: Vite
- **State Management**: React hooks and context
- **API Integration**: OpenAI DALL-E for thumbnail generation

## Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

### Project Structure
```
src/
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── VideoEditor.tsx  # Main editor component
│   ├── Timeline.tsx     # Timeline interface
│   └── ...
├── services/            # API services
├── pages/               # Page components
└── lib/                 # Utility functions
```

## Deployment

### Using Lovable
1. Open the [Lovable Project](https://lovable.dev/projects/3d789f07-c028-45b6-a9dd-e5d23418f735)
2. Click Share → Publish to deploy instantly

### Manual Deployment
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your hosting service

### Custom Domain
To connect a custom domain:
1. Navigate to Project > Settings > Domains in Lovable
2. Click Connect Domain
3. Follow the setup instructions

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and commit: `git commit -m 'Add feature'`
4. Push to the branch: `git push origin feature-name`
5. Submit a pull request

## Support

For questions or issues:
- Open an issue on GitHub
- Check the Lovable documentation for platform-specific help

## License

This project is open source and available under the MIT License.
