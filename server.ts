/**
 * Servidor local do LocaDoc.
 *
 * - Desenvolvimento: Vite em modo middleware (HMR) + rotas /api do Express.
 * - Produção local (NODE_ENV=production): serve o build de dist/ + rotas /api.
 * - Na Vercel o processo é outro: api/index.ts exporta o mesmo app Express como
 *   função serverless e os arquivos estáticos são servidos pela própria Vercel.
 */
import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './src/server/app';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? parseInt(process.argv[portArgIndex + 1]) : null;
const envPort = parseInt(process.env.PORT || '', 10);
const PORT = (cliPort && cliPort > 0 ? cliPort : null) || (Number.isFinite(envPort) && envPort > 0 ? envPort : 3000);
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

startServer();
