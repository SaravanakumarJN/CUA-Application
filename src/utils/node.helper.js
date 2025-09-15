import { exec, spawn } from "child_process";
import sharp from "sharp";
import fs from "fs";
import path from "path";

export function execAsync(command, options = {}) {
  // options.maxBuffer = options.maxBuffer || 5 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(stdout);
    });
  });
}

export function spawnAsync(command, args = [], options = {}, asBuffer = true) {
  return new Promise((resolve, reject) => {
    try {
      const spawned = spawn(command, args, options);

      const stdoutChunks = [];
      const stderrChunks = [];

      spawned.stdout.on("data", (chunk) => stdoutChunks.push(chunk));
      spawned.stderr.on("data", (chunk) => stderrChunks.push(chunk));

      spawned.on("close", (code) => {
        if (code !== 0) {
          reject(new Error("Command failed"));
          return;
        }

        const stdout = asBuffer
          ? Buffer.concat(stdoutChunks)
          : Buffer.concat(stdoutChunks).toString("utf8");
        const stderr = asBuffer
          ? Buffer.concat(stderrChunks)
          : Buffer.concat(stderrChunks).toString("utf8");

        resolve({ stdout, stderr });
      });

      spawned.on("error", (error) => reject(error));
    } catch (error) {
      reject(error);
    }
  });
}

export function backgroundSpawnAsync(command, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    try {
      const opts = {
        detached: true,
        stdio: "ignore",
        ...options,
      };
      const child = spawn(command, args, opts);
      child.unref();
      resolve(child);
    } catch (error) {
      reject(error);
    }
  });
}

export function saveScreenshot(buffer, filePath) {
  if (!filePath) {
    const folder = path.join(process.cwd(), "screenshot");
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
    const file = `${Date.now()}.png`;
    filePath = path.join(folder, file);
  }
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export async function getImageDetails(buffer) {
  const data = await sharp(buffer).metadata();
  return data;
}
