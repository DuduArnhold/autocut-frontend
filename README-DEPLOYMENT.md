# AutoCut - AI Podcast Highlights Generator

## 🎉 What's Working Right Now

The **frontend and AI analysis** are fully functional in Lovable:
- ✅ Beautiful dark-mode UI
- ✅ File upload (MP3, WAV, MP4)
- ✅ AI transcription (simulated for demo)
- ✅ AI highlight detection using Lovable AI
- ✅ Results display with timestamps

## 🎬 What You Need to Add: FFmpeg Backend

To actually **cut the video clips**, you need to deploy a separate backend with FFmpeg. Here's the complete code:

### Option 1: Deploy on Replit

1. Create a new Replit Python project
2. Add these files:

**`server.py`**
```python
from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
import os
import uuid

app = Flask(__name__)
CORS(app)

# Create directories
os.makedirs("uploads", exist_ok=True)
os.makedirs("clips", exist_ok=True)

@app.route('/cut', methods=['POST'])
def cut_video():
    try:
        data = request.json
        file_url = data.get('file_url')
        start = data.get('start')
        end = data.get('end')
        clip_id = data.get('clip_id', str(uuid.uuid4()))
        
        if not all([file_url, start, end]):
            return jsonify({"error": "Missing required parameters"}), 400
        
        # Download the file
        import urllib.request
        input_file = f"uploads/{uuid.uuid4()}.mp4"
        urllib.request.urlretrieve(file_url, input_file)
        
        # Output file
        output_file = f"clips/clip_{clip_id}.mp4"
        
        # Run FFmpeg
        cmd = [
            'ffmpeg', '-y',
            '-i', input_file,
            '-ss', start,
            '-to', end,
            '-c', 'copy',
            output_file
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"FFmpeg error: {result.stderr}")
            return jsonify({"error": "FFmpeg processing failed"}), 500
        
        # Clean up input
        os.remove(input_file)
        
        # Return public URL (adjust based on your deployment)
        public_url = f"{request.host_url}clips/clip_{clip_id}.mp4"
        
        return jsonify({"cut_url": public_url}), 200
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/clips/<filename>')
def serve_clip(filename):
    from flask import send_from_directory
    return send_from_directory('clips', filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

**`requirements.txt`**
```
flask==2.3.3
flask-cors==4.0.0
```

**`.replit`**
```
run = "python server.py"

[nix]
channel = "stable-22_11"

[deployment]
run = ["python", "server.py"]
```

**`replit.nix`**
```nix
{ pkgs }: {
  deps = [
    pkgs.python310
    pkgs.ffmpeg
  ];
}
```

3. FFmpeg will be automatically installed via the `replit.nix` file
4. Click "Run" to start the server
5. Copy your Replit URL (e.g., `https://your-project.repl.co`)

### Option 2: Deploy on Render

1. Create a new Web Service on Render
2. Connect your GitHub repo with the files above
3. Settings:
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt && apt-get update && apt-get install -y ffmpeg`
   - **Start Command**: `python server.py`
4. Deploy and copy your service URL

## 🔗 Connect the Backend to Your Frontend

Once deployed, update the `downloadClip` function in `src/pages/Index.tsx`:

```typescript
const downloadClip = async (highlight: Highlight) => {
  try {
    toast.info("Cutting clip...");
    
    const response = await fetch('YOUR_BACKEND_URL/cut', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: fileUrl, // Store this from upload
        start: highlight.start,
        end: highlight.end,
        clip_id: highlight.clip_id,
      }),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Download the clip
      window.open(data.cut_url, '_blank');
      toast.success("Clip ready for download!");
    } else {
      toast.error(data.error || "Failed to cut clip");
    }
  } catch (error) {
    toast.error("Failed to cut clip");
  }
};
```

## 🧪 Testing

1. Use a short test audio/video (under 5MB for quick testing)
2. Upload and wait for AI analysis
3. Click "Download Clip" on any highlight
4. If backend is connected, clip will download automatically

## 📦 Sample Test Files

You can test with these free resources:
- Short MP3: https://www2.cs.uic.edu/~i101/SoundFiles/StarWars60.wav
- Test video: https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4

## 🔐 Security Notes

- Add authentication for production use
- Implement rate limiting
- Set up file size limits
- Add file cleanup cron jobs (delete after 24 hours)
- Use environment variables for sensitive data

## 💰 Costs

- **Lovable Cloud**: Free tier includes storage and edge functions
- **Lovable AI**: Free tier includes limited requests
- **Replit**: Free tier available
- **Render**: Free tier available

## 📚 Tech Stack

**Frontend (in Lovable):**
- React + TypeScript
- Tailwind CSS
- Lovable Cloud (Supabase)
- Lovable AI (Gemini 2.5 Flash)

**Backend (separate deployment):**
- Python + Flask
- FFmpeg for video processing
- File storage

## 🚀 Next Steps

1. Deploy the FFmpeg backend on Replit or Render
2. Update the frontend with your backend URL
3. Test with a short audio file
4. Scale up with authentication and rate limiting
5. Add more features (subtitles, social media export, etc.)

## 📖 License

MIT License - feel free to use and modify!

## 🤝 Contributing

This is an MVP. Contributions welcome:
- Better transcription (Whisper API integration)
- Real-time progress updates
- Batch processing
- Social media optimization
- Advanced editing features

---

Built with ❤️ using Lovable, Lovable AI, and open-source tools
