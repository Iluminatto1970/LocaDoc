/**
 * Função serverless da Vercel.
 *
 * A Vercel roteia /api/* para este arquivo; o app Express mantém os mesmos
 * caminhos (/api/...) definidos em src/server/app.ts. Nenhum código de Vite
 * entra aqui, então o bundle da função fica pequeno e compatível com o runtime
 * Node.js da plataforma.
 */
import app from '../src/server/app';

export default app;
