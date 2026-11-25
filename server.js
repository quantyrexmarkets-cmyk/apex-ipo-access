require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON & form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Dynamic API handler for all /api/:route files
app.all("/api/:route", async (req, res) => {
  const route = req.params.route;
  const filePath = path.join(__dirname, "api", `${route}.js`);
  
  if (fs.existsSync(filePath)) {
    try {
      const handler = require(filePath);
      await handler(req, res);
    } catch (err) {
      console.error(`[API Error] ${route}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  } else {
    res.status(404).json({ error: "API endpoint not found" });
  }
});

// Serve static assets
app.use(express.static(__dirname));

// Clean URL fallback: e.g. /dashboard -> dashboard.html
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  
  let cleanPath = req.path.replace(/^\//, "");
  if (!cleanPath) cleanPath = "index.html";
  if (!path.extname(cleanPath)) cleanPath += ".html";
  
  const fullPath = path.join(__dirname, cleanPath);
  if (fs.existsSync(fullPath)) {
    res.sendFile(fullPath);
  } else {
    res.status(404).sendFile(path.join(__dirname, "index.html"));
  }
});

app.listen(PORT, () => {
  console.log(`Apex IPO Access running at http://localhost:${PORT}`);
});
