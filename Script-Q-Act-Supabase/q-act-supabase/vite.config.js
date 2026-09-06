import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const localUploadPlugin = () => ({
  name: 'local-upload',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      if (req.url === '/api/upload-local' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { base64, filename } = data;
            const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
            const uploadDir = path.resolve(__dirname, 'public/images');
            
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            const filePath = path.join(uploadDir, filename);
            fs.writeFileSync(filePath, base64Data, 'base64');
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ url: `/images/${filename}` }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      } else if (req.url.startsWith('/images/') && req.method === 'GET') {
        const filename = req.url.split('/').pop();
        const filePath = path.resolve(__dirname, 'public/images', filename);
        if (fs.existsSync(filePath)) {
          const ext = path.extname(filename).slice(1);
          const mimeTypes = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'webp': 'image/webp',
            'gif': 'image/gif',
            'avif': 'image/avif'
          };
          res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
          // Add cache-control to prevent browser from caching the 404 from earlier if any
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
          fs.createReadStream(filePath).pipe(res);
        } else {
          next();
        }
      } else {
        next();
      }
    });
  }
})

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), localUploadPlugin()],
})
