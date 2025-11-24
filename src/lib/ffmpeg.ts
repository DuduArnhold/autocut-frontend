// src/lib/ffmpeg.ts
import { createFFmpeg } from "@ffmpeg/ffmpeg";

let ffmpegInstance: any = null;

export const ensureFFmpeg = async (setProgress: (n: number) => void) => {
  if (ffmpegInstance) return ffmpegInstance;

  ffmpegInstance = createFFmpeg({
    log: true,
    corePath: "https://unpkg.com/@ffmpeg/core@0.10.0/dist/ffmpeg-core.js",
    progress: ({ ratio }) => {
      setProgress(Math.round(ratio * 100));
    },
  });

  await ffmpegInstance.load();
  return ffmpegInstance;
};
