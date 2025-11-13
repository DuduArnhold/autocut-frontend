# 🎙️ AutoCut - AI Podcast Highlights Generator

<div align="center">

![AutoCut](https://img.shields.io/badge/AutoCut-AI%20Powered-blueviolet?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-MVP-success?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**Turn your podcast into instant viral clips with AI**

[View Demo](https://lovable.dev/projects/8dad7962-20dd-46f9-a033-e30929ac5b08) • [Report Bug](https://github.com/yourusername/autocut/issues) • [Request Feature](https://github.com/yourusername/autocut/issues)

</div>

---

## ✨ What is AutoCut?

AutoCut is an AI-powered web application that automatically analyzes your podcast episodes and extracts the most engaging moments as shareable clips. Upload your audio or video, and let AI do the heavy lifting.

### 🎯 Key Features

- 🤖 **AI Transcription** - Automatic speech-to-text with timestamps
- 🎬 **Smart Highlight Detection** - AI finds the 3 best moments (30-90 seconds)
- 📊 **Visual Results** - Beautiful interface showing all highlights with context
- 💾 **Easy Downloads** - One-click download for each clip
- 🌙 **Dark Mode Design** - Modern, professional interface
- 📱 **Fully Responsive** - Works on desktop, tablet, and mobile

## 🚀 Live Demo

**Frontend + AI Analysis**: [Try it now](https://lovable.dev/projects/8dad7962-20dd-46f9-a033-e30929ac5b08)

The demo includes:
- ✅ File upload (MP3, WAV, MP4)
- ✅ AI transcription (simulated for demo)
- ✅ AI highlight detection using Lovable AI
- ✅ Beautiful results display
- ⚠️ Video cutting requires FFmpeg backend (see [Deployment Guide](./README-DEPLOYMENT.md))

## 🛠️ Tech Stack

### Frontend (Fully Working)
- **React** + **TypeScript** - Modern UI framework
- **Tailwind CSS** - Utility-first styling
- **Lovable Cloud** - Backend infrastructure (Supabase)
- **Lovable AI** - AI transcription and analysis (Gemini 2.5 Flash)
- **Shadcn UI** - Beautiful component library

### Backend (Requires Separate Deployment)
- **Python** + **Flask** - API server
- **FFmpeg** - Video/audio processing
- **Replit** or **Render** - Hosting platforms

## 📋 Prerequisites

For frontend development:
- Node.js 18+ and npm
- Lovable account (free tier available)

For backend deployment:
- Python 3.9+
- FFmpeg installed
- Replit or Render account

## 🎮 Quick Start

### 1. Run the Frontend

This project runs in Lovable:

1. Open [the project](https://lovable.dev/projects/8dad7962-20dd-46f9-a033-e30929ac5b08)
2. The app is already deployed and running
3. Click the preview to test file upload and AI analysis

### 2. Deploy the Backend (Optional)

For full video cutting functionality, see the [Deployment Guide](./README-DEPLOYMENT.md).

## 📖 How It Works

```mermaid
graph LR
    A[Upload File] --> B[Lovable Cloud Storage]
    B --> C[AI Transcription]
    C --> D[AI Analysis]
    D --> E[Highlight Results]
    E --> F[FFmpeg Backend]
    F --> G[Download Clips]
```

1. **Upload**: User uploads MP3/WAV/MP4 file (max 50MB)
2. **Transcribe**: AI converts speech to text with timestamps
3. **Analyze**: AI identifies the 3 best moments for social media
4. **Display**: Shows clips with titles, context, and timestamps
5. **Cut** (optional): FFmpeg backend creates downloadable clips

## 🎨 Design System

AutoCut uses a carefully crafted dark theme:

- **Primary**: Purple gradient (#A855F7 → #3B82F6)
- **Background**: Deep dark blue (#1a1f2e)
- **Cards**: Subtle gradients with glow effects
- **Animations**: Smooth transitions and fade-ins
- **Typography**: Clean, modern font hierarchy

All colors are defined semantically in `src/index.css` using HSL values.

## 🔧 Configuration

### Environment Variables

Automatically configured by Lovable Cloud:
- `VITE_SUPABASE_URL` - Backend API endpoint
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Public API key
- `LOVABLE_API_KEY` - AI gateway access (server-side only)

### File Limits

- **Max file size**: 50 MB
- **Supported formats**: MP3, WAV, MP4
- **Clip length**: 30-90 seconds per highlight

## 📁 Project Structure

```
autocut/
├── src/
│   ├── assets/              # Images and static files
│   │   └── hero-waves.jpg   # Hero background
│   ├── components/          # React components
│   │   └── ui/             # Shadcn components
│   ├── pages/              
│   │   └── Index.tsx       # Main application
│   ├── integrations/
│   │   └── supabase/       # Backend integration
│   ├── index.css           # Design system
│   └── main.tsx            # Entry point
├── supabase/
│   ├── functions/          # Edge functions
│   │   ├── transcribe-audio/
│   │   └── analyze-highlights/
│   └── config.toml         # Supabase configuration
├── index.html              # HTML template with SEO
└── README-DEPLOYMENT.md    # Backend deployment guide
```

## 🧪 Testing

### Test with Sample Files

1. **Short audio**: [StarWars60.wav](https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav)
2. **Test video**: [Big Buck Bunny 10s](https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4)

### Local Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## 🔐 Security

- ✅ File type validation
- ✅ File size limits (50MB)
- ✅ Public storage bucket (suitable for demo)
- ⚠️ Add authentication for production use
- ⚠️ Implement rate limiting
- ⚠️ Set up file cleanup (24-hour retention)

## 💰 Pricing & Limits

### Lovable Cloud (Supabase)
- **Free tier**: 500MB storage, 2GB bandwidth
- **Edge functions**: 500K invocations/month
- **Upgrade**: Starting at $25/month

### Lovable AI
- **Free tier**: Limited requests per month
- **Pay-as-you-go**: Usage-based pricing
- **Cost**: ~$0.001 per request (Gemini 2.5 Flash)

### FFmpeg Backend
- **Replit Free**: Limited compute hours
- **Render Free**: 750 hours/month
- **Paid plans**: From $7/month

## 🚧 Roadmap

- [x] File upload and validation
- [x] AI transcription (simulated)
- [x] AI highlight detection
- [x] Beautiful UI with animations
- [ ] Real Whisper transcription integration
- [ ] FFmpeg backend connection
- [ ] User authentication
- [ ] Batch processing
- [ ] Subtitle generation
- [ ] Social media export (Twitter, TikTok, Instagram)
- [ ] Custom clip durations
- [ ] Advanced editing controls

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Lovable](https://lovable.dev) - The AI-powered web app builder
- UI components from [Shadcn UI](https://ui.shadcn.com/)
- Icons from [Lucide React](https://lucide.dev/)
- AI powered by [Lovable AI](https://docs.lovable.dev/features/ai) (Google Gemini)

## 📞 Support

- **Documentation**: [Deployment Guide](./README-DEPLOYMENT.md)
- **Lovable Docs**: [docs.lovable.dev](https://docs.lovable.dev)
- **Issues**: [GitHub Issues](https://github.com/yourusername/autocut/issues)

---

<div align="center">

**Made with ❤️ using Lovable, AI, and open-source tools**

[⭐ Star this project](https://github.com/yourusername/autocut) if you find it helpful!

</div>
