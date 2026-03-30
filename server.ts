import express from "express";
import { createServer as createViteServer } from "vite";
import { exec } from "child_process";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

async function startServer() {
  const app = express();
  const PORT = 36364;

  app.use(express.json());

  // Helper to run dualsensectl commands
  const runCommand = async (args: string) => {
    try {
      // In a real environment, this would call dualsensectl
      // For the preview, we'll mock the output if the command fails or doesn't exist
      const { stdout, stderr } = await execAsync(`dualsensectl ${args}`);
      return { success: true, stdout, stderr };
    } catch (error: any) {
      console.error(`Error executing dualsensectl ${args}:`, error.message);
      
      // Mocking for development environment
      if (process.env.NODE_ENV !== "production") {
        if (args === "-l") {
          return { success: true, stdout: "Device 1: DualSense Wireless Controller (Mock)\n", stderr: "" };
        }
        if (args.includes("battery")) {
          return { success: true, stdout: "80%\n", stderr: "" };
        }
        if (args.includes("info")) {
          return { success: true, stdout: "Firmware: 0.0.1 (Mock)\n", stderr: "" };
        }
        return { success: true, stdout: "Mock success", stderr: "" };
      }
      
      return { success: false, error: error.message };
    }
  };

  // API Routes
  app.get("/api/devices", async (req, res) => {
    const result = await runCommand("-l");
    res.json(result);
  });

  app.post("/api/command", async (req, res) => {
    const { device, command, args } = req.body;
    const deviceFlag = device ? `-d ${device} ` : "";
    const fullArgs = `${deviceFlag}${command}${args ? " " + args : ""}`;
    const result = await runCommand(fullArgs);
    res.json(result);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
