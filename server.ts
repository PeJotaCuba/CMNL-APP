import express from "express";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import path from "path";
import Database from "better-sqlite3";

let db: Database.Database;
try {
  const isProduction = process.env.NODE_ENV === "production";
  const dbPath = isProduction 
    ? path.join("/tmp", "data.db") 
    : path.join(process.cwd(), "data.db");
  
  console.log(`[Server] Initializing database at: ${dbPath} (Mode: ${process.env.NODE_ENV})`);
  db = new Database(dbPath);
  
  // Initialize database schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS shared_pdfs (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      content BLOB NOT NULL,
      createdAt TEXT NOT NULL,
      month TEXT,
      weekLabel TEXT
    );

    CREATE TABLE IF NOT EXISTS system_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);
  console.log("[Server] Database initialized successfully");
} catch (error) {
  console.error("[Server] Critical database error:", error);
  // Fail fast to see error in logs
  process.exit(1);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/db-status", (req, res) => {
    try {
      const stats = db.prepare("SELECT count(*) as count FROM shared_pdfs").get();
      res.json({ 
        status: "ready", 
        dbPath, 
        count: (stats as any).count,
        nodeEnv: process.env.NODE_ENV,
        cwd: process.cwd()
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message, dbPath });
    }
  });

  // Endpoints para PDFs compartidos
  app.get("/api/agenda-pdfs", (req, res) => {
    try {
      const rows = db.prepare("SELECT id, filename, createdAt, month, weekLabel FROM shared_pdfs ORDER BY createdAt DESC").all();
      res.json(rows);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/agenda-pdfs/:id", (req, res) => {
    try {
      const row: any = db.prepare("SELECT content, filename FROM shared_pdfs WHERE id = ?").get(req.params.id);
      if (row) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${row.filename}"`);
        res.send(row.content);
      } else {
        res.status(404).send("Not found");
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/agenda-pdfs", (req, res) => {
    const { id, filename, content, createdAt, month, weekLabel } = req.body;
    console.log(`[Server] Received request to save PDF: ${filename} (${id})`);
    
    if (!content) {
      console.error("[Server] Error: No content in body");
      return res.status(400).json({ error: "No content provided" });
    }

    try {
      // content llega como base64 string
      const buffer = Buffer.from(content, 'base64');
      console.log(`[Server] Buffer size: ${buffer.length} bytes`);
      
      const stmt = db.prepare("INSERT OR REPLACE INTO shared_pdfs (id, filename, content, createdAt, month, weekLabel) VALUES (?, ?, ?, ?, ?, ?)");
      stmt.run(id, filename, buffer, createdAt, month, weekLabel);
      
      console.log("[Server] PDF saved successfully to database");
      res.json({ status: "ok" });
    } catch (error: any) {
      console.error("[Server] Error saving PDF to DB:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/agenda-pdfs/:id", (req, res) => {
    try {
      db.prepare("DELETE FROM shared_pdfs WHERE id = ?").run(req.params.id);
      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/agenda-pdfs", (req, res) => {
    try {
      db.prepare("DELETE FROM shared_pdfs").run();
      res.json({ status: "ok" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Endpoints para sincronización global (CML)
  app.get("/api/sync-data", (req, res) => {
    try {
      const row: any = db.prepare("SELECT value FROM system_state WHERE key = 'current'").get();
      if (row) {
        res.json(JSON.parse(row.value));
      } else {
        res.status(404).json({ error: "No state found" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sync-data", (req, res) => {
    try {
      const value = JSON.stringify(req.body);
      const updatedAt = new Date().toISOString();
      db.prepare("INSERT OR REPLACE INTO system_state (key, value, updatedAt) VALUES (?, ?, ?)")
        .run('current', value, updatedAt);
      res.json({ status: "ok", updatedAt });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/news', async (req, res) => {
    const { url } = req.body;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      const html = await response.text();
      const $ = cheerio.load(html);
      const headlines: any[] = [];

      // Selectores personalizados por dominio
      let elements;
      if (url.includes('cubadebate.cu')) {
        elements = $('.title a, .note_title a, article h2 a');
      } else {
        elements = $('article h2 a, .main-content h2 a, h2 a');
      }

      elements.each((i, el) => {
        if (headlines.length >= 5) return false;
        const title = $(el).text().trim();
        if (!title) return;
        let link = $(el).attr('href');
        if (link && link.startsWith('/')) {
          try {
            const domain = new URL(url).origin;
            link = domain + link;
          } catch (e) {
            // Ignore invalid URLs
          }
        }
        // Resumen: buscar párrafo cercano
        let summary = '';
        const parent = $(el).closest('article, .news-item, .item');
        if (parent.length) {
          summary = parent.find('p').first().text().trim();
        }
        headlines.push({ id: i, title, summary, link });
      });

      res.json(headlines);
    } catch (error: any) {
      console.error(`Error scraping ${url}:`, error.message);
      res.status(200).json([{ title: 'Conexión interrumpida', link: url }]);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
