import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import cors from "cors";
import logger from "./config/logger";
import { pinNote } from "./services/pinata.services";

dotenv.config();

const app = express();

app.use(express.json({ limit: "50mb" }));

app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      callback(null, true);
    },
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.post("/pin", async (req: Request, res: Response) => {
  const { encrypted } = req.body;
  if (!encrypted) {
    res.status(400).json({ error: "Missing encrypted payload" });
    return;
  }
  const cid = await pinNote(encrypted);
  if (!cid) {
    res.status(500).json({ error: "Failed to pin to IPFS" });
    return;
  }
  res.json({ cid });
});

// Proxy for Pinata fetch (CORS bypass)
app.use(
  "/pinata",
  createProxyMiddleware({
    logger: logger,
    target: "https://emerald-odd-bee-965.mypinata.cloud",
    changeOrigin: true,
    pathRewrite: { "^/pinata": "/files" },
  }),
);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
