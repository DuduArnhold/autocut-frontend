import { createFFmpeg } from "@ffmpeg/ffmpeg";
import { track } from "./analytics";

let ffmpegInstance: any = null;
let context = { kind: "unknown", vertical: false };

export const setFFmpegContext = (c: { kind: string; vertical: boolean }) => {
  context = c;
};

export const ensureFFmpeg = async (setProgress: (n: number) => void) => {
  if (ffmpegInstance) return ffmpegInstance;

  ffmpegInstance = createFFmpeg({
    log: true,
    corePath: "/ffmpeg-core.js",
    progress: ({ ratio }) => {
      const pct = Math.min(100, Math.max(0, Math.round(ratio * 100)));
      setProgress(pct);
    },
    logger: (msg) => {
      if (msg.type === "error") {
        track("ffmpeg_worker_error", {
          message: msg.message,
          file_type: context.kind,
          vertical: context.vertical,
        });
      }
    },
  });

  try {
    await ffmpegInstance.load();
  } catch (err: any) {
    track("ffmpeg_init_error", {
      step: "init",
      message: err.message || String(err),
    });
    throw err;
  }

  return ffmpegInstance;
};