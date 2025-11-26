import { createFFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegInstance: any = null;

export const ensureFFmpeg = async (setProgress: (n: number) => void) => {
  if (ffmpegInstance) return ffmpegInstance;

  ffmpegInstance = createFFmpeg({
    log: true,
    corePath: "https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js",
    progress: ({ ratio }) => {
      const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
      setProgress(pct);
    },
  });

  await ffmpegInstance.load();
  return ffmpegInstance;
};