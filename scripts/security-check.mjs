import fs from 'fs';

const BASE = 'http://localhost:3000';
const env = fs.readFileSync('.env', 'utf8');
const masterPassword = (env.match(/^MASTER_PASSWORD="?([^"\r\n]+)/m) || [])[1] || '';

const results = [];
function record(label, ok, detail) {
  results.push({ label, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  -> ${detail}`);
}

// Espaça as requisições para não colidir com o rate limit/burst do próprio servidor
const pace = () => new Promise((r) => setTimeout(r, 150));

async function req(path, { method = 'GET', token, body, headers = {} } = {}, attempt = 0) {
  await pace();
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html */ }
  // 429 do próprio Anti-DDoS: aguarda a janela e tenta novamente (não é o alvo do teste)
  if (res.status === 429 && attempt < 2) {
    await new Promise((r) => setTimeout(r, 3000));
    return req(path, { method, token, body, headers }, attempt + 1);
  }
  return { status: res.status, json, text };
}

// 1. API anônima
{
  const r = await req('/api/users');
  record('GET /api/users sem token', r.status === 401, `HTTP ${r.status}`);
}
// 2. Spoofing por header
{
  const r = await req('/api/users', { headers: { 'x-user-id': 'usr-master-iluminatto', 'x-user-email': 'iluminatto@gmail.com' } });
  record('Spoof x-user-id sem token', r.status === 401, `HTTP ${r.status}`);
}
// 3. Senha antiga vazada
{
  const r = await req('/api/auth/login', { method: 'POST', body: { email: 'iluminatto@gmail.com', password: '@Vito4747' } });
  record('Login com senha vazada @Vito4747', r.status === 401, `HTTP ${r.status}`);
}
// 4. NoSQL injection no login
{
  const r = await req('/api/auth/login', { method: 'POST', body: { email: { $gt: '' }, password: { $gt: '' } } });
  record('Login com operador NoSQL', r.status === 400, `HTTP ${r.status}`);
}
// 5. Login master válido
let masterToken = '';
{
  const r = await req('/api/auth/login', { method: 'POST', body: { email: 'iluminatto@gmail.com', password: masterPassword } });
  masterToken = r.json?.token || '';
  record('Login master válido', r.status === 200 && !!masterToken && !r.json?.user?.password, `HTTP ${r.status}, token=${masterToken ? 'emitido' : 'ausente'}, senha na resposta=${r.json?.user?.password ? 'SIM' : 'não'}`);
}
// 6. Listagem autenticada sem senhas
{
  const r = await req('/api/users', { token: masterToken });
  const leaks = (r.json?.users || []).some((u) => 'password' in u);
  record('GET /api/users autenticado', r.status === 200 && !leaks, `HTTP ${r.status}, usuários=${r.json?.users?.length}, senha vazada=${leaks ? 'SIM' : 'não'}`);
}
// 7. Criação de segundo superadmin
{
  const r = await req('/api/users', {
    method: 'POST', token: masterToken,
    body: { name: 'Root Clone', email: `root.clone.${Date.now()}@teste.com`, password: 'senhaForte123', role: 'superadmin' },
  });
  record('Criar segundo superadmin (token superadmin)', r.status === 400, `HTTP ${r.status}`);
}
// 8. XSS armazenado
{
  const r = await req('/api/users', {
    method: 'POST', token: masterToken,
    body: { name: '<img src=x onerror=alert(document.cookie)>', email: `xss.${Date.now()}@teste.com`, password: 'senhaForte123', role: 'condomino' },
  });
  record('XSS <img onerror> no corpo', r.status === 400, `HTTP ${r.status}`);
}
// 9. Campo muito longo dentro do limite de corpo (1MB < limite global de 2MB)
{
  const r = await req('/api/users', {
    method: 'POST', token: masterToken,
    body: { name: 'A'.repeat(1024 * 1024), email: `huge.${Date.now()}@teste.com`, password: 'senhaForte123', role: 'condomino' },
  });
  record('Nome de 1MB (validação de campo)', r.status === 400, `HTTP ${r.status}`);
}
// 10. Admin comum criando admin
let adminToken = '';
{
  const r = await req('/api/auth/login', { method: 'POST', body: { email: 'adm.condominio@exemplo.com.br', password: '123' } });
  adminToken = r.json?.token || '';
  record('Login admin comum (senha semente migrada p/ hash)', r.status === 200 && !!adminToken, `HTTP ${r.status}`);
}
{
  const r = await req('/api/users', {
    method: 'POST', token: adminToken,
    body: { name: 'Admin Indevido', email: `adm.indevido.${Date.now()}@teste.com`, password: 'senhaForte123', role: 'admin' },
  });
  record('Admin comum criando Administrador', r.status === 403, `HTTP ${r.status}`);
}
// 11. Token forjado / adulterado
{
  const r = await req('/api/users', { token: masterToken.slice(0, -4) + 'AAAA' });
  record('Token com assinatura adulterada', r.status === 401, `HTTP ${r.status}`);
}
// 12. Dados sensíveis sem token
{
  const contracts = await req('/api/contracts');
  const condominos = await req('/api/condominos');
  const audit = await req('/api/security/audit-status');
  record('Contratos/condôminos/auditoria sem token', contracts.status === 401 && condominos.status === 401 && audit.status === 401,
    `HTTP ${contracts.status}/${condominos.status}/${audit.status}`);
}

// 13. Headers de segurança e ausência de vazamento de stack/tecnologia
{
  const res = await fetch(BASE + '/api/health');
  const h = res.headers;
  const ok =
    !!h.get('content-security-policy') &&
    h.get('x-content-type-options') === 'nosniff' &&
    !!h.get('permissions-policy') &&
    !!h.get('referrer-policy') &&
    !h.get('x-powered-by');
  record('Headers de segurança (CSP, nosniff, Permissions-Policy, sem x-powered-by)', ok,
    `CSP=${!!h.get('content-security-policy')}, nosniff=${h.get('x-content-type-options')}, PP=${!!h.get('permissions-policy')}, ref=${!!h.get('referrer-policy')}, x-powered-by=${h.get('x-powered-by')}`);
}
// 14. Escrita a partir de origem externa
{
  const r = await req('/api/users', {
    method: 'POST', token: masterToken, headers: { Origin: 'https://evil.example' },
    body: { name: 'Cross Origin', email: `cross.${Date.now()}@teste.com`, password: 'senhaForte123', role: 'condomino' },
  });
  record('POST com Origin externo', r.status === 403, `HTTP ${r.status}`);
}
// 15. Payload grande em rota comum (limite global de 2MB)
{
  const r = await req('/api/users', {
    method: 'POST', token: masterToken,
    body: { name: 'A'.repeat(3 * 1024 * 1024), email: `big.${Date.now()}@teste.com`, password: 'senhaForte123', role: 'condomino' },
  });
  record('Payload de 3MB em /api/users', r.status === 413, `HTTP ${r.status}`);
}
// 16. Rotas administrativas e isolamento do condômino
let condoToken = '';
{
  const r = await req('/api/auth/login', { method: 'POST', body: { email: 'mariana.costa@exemplo.com.br', password: '123' } });
  condoToken = r.json?.token || '';
  record('Login condômino', r.status === 200 && !!condoToken, `HTTP ${r.status}`);
}
{
  const llm = await req('/api/llm/config', { token: condoToken });
  const audit = await req('/api/security/audit-status', { token: condoToken });
  const users = await req('/api/users', { token: condoToken });
  const own = users.json?.users || [];
  record('Condômino bloqueado em rotas administrativas', llm.status === 403 && audit.status === 403, `llm=${llm.status}, auditoria=${audit.status}`);
  record('Condômino vê apenas o próprio perfil', users.status === 200 && own.length === 1 && own[0].email === 'mariana.costa@exemplo.com.br', `HTTP ${users.status}, registros=${own.length}`);
}
// 17. Troca de senha revoga as sessões antigas
{
  const email = `revoke.${Date.now()}@teste.com`;
  const created = await req('/api/users', {
    method: 'POST', token: masterToken,
    body: { name: 'Teste Revogação', email, password: 'senhaInicial123', role: 'condomino' },
  });
  const id = created.json?.user?.id;
  const session1 = await req('/api/auth/login', { method: 'POST', body: { email, password: 'senhaInicial123' } });
  const token1 = session1.json?.token || '';
  const before = await req('/api/users', { token: token1 });
  const changed = await req(`/api/users/${id}`, { method: 'PUT', token: masterToken, body: { password: 'senhaNova456' } });
  const after = await req('/api/users', { token: token1 });
  await req(`/api/users/${id}`, { method: 'DELETE', token: masterToken });
  record('Troca de senha revoga sessões antigas', before.status === 200 && changed.status === 200 && after.status === 401,
    `antes=${before.status}, troca=${changed.status}, depois=${after.status}`);
}

// 18. Endpoint de sessão e logout (revogação do token)
{
  const anon = await req('/api/auth/session');
  const withToken = await req('/api/auth/session', { token: masterToken });
  record('GET /api/auth/session', anon.status === 401 && withToken.status === 200 && withToken.json?.user?.email === 'iluminatto@gmail.com',
    `anônimo=${anon.status}, autenticado=${withToken.status}`);
}
{
  const email = `logout.${Date.now()}@teste.com`;
  const created = await req('/api/users', {
    method: 'POST', token: masterToken,
    body: { name: 'Teste Logout', email, password: 'senhaForte123', role: 'condomino' },
  });
  const id = created.json?.user?.id;
  const login = await req('/api/auth/login', { method: 'POST', body: { email, password: 'senhaForte123' } });
  const token = login.json?.token || '';
  const before = await req('/api/users', { token });
  await req('/api/auth/logout', { method: 'POST', token });
  const after = await req('/api/users', { token });
  await req(`/api/users/${id}`, { method: 'DELETE', token: masterToken });
  record('Logout revoga o token no servidor', before.status === 200 && after.status === 401, `antes=${before.status}, depois=${after.status}`);
}

// 19. CRUD completo de Administradores pelo Super Administrador
{
  const admEmail = `adm.crud.${Date.now()}@teste.com`;
  const created = await req('/api/users', {
    method: 'POST', token: masterToken,
    body: { name: 'ADM CRUD', email: admEmail, password: 'admSenha123', role: 'admin', creci: 'CRECI 99999-J' },
  });
  const admId = created.json?.user?.id;
  const loginAdm = await req('/api/auth/login', { method: 'POST', body: { email: admEmail, password: 'admSenha123' } });
  const admToken = loginAdm.json?.token || '';
  const updated = await req(`/api/users/${admId}`, {
    method: 'PUT', token: masterToken,
    body: { name: 'ADM CRUD Editado', password: 'admSenhaNova456', creci: 'CRECI 11111-J' },
  });
  const reloginOld = await req('/api/auth/login', { method: 'POST', body: { email: admEmail, password: 'admSenha123' } });
  const reloginNew = await req('/api/auth/login', { method: 'POST', body: { email: admEmail, password: 'admSenhaNova456' } });
  const status = await req(`/api/users/${admId}/status`, { method: 'PUT', token: masterToken, body: { status: 'bloqueado' } });
  const blockedAccess = await req('/api/users', { token: admToken });
  const list = await req('/api/users', { token: masterToken });
  const inList = (list.json?.users || []).some((u) => u.email === admEmail && u.role === 'admin' && u.name === 'ADM CRUD Editado');
  const del = await req(`/api/users/${admId}`, { method: 'DELETE', token: masterToken });
  const afterDelete = await req('/api/users', { token: masterToken });
  const gone = !(afterDelete.json?.users || []).some((u) => u.email === admEmail);
  record('CRUD completo de ADM pelo Super Admin',
    created.status === 201 && !!admToken && updated.status === 200 && reloginOld.status === 401 && reloginNew.status === 200 && status.status === 200 && blockedAccess.status === 401 && inList && del.status === 200 && gone,
    `criar=${created.status}, login=${loginAdm.status}, editar=${updated.status}, senhaAntiga=${reloginOld.status}, senhaNova=${reloginNew.status}, bloquear=${status.status}, tokenBloqueado=${blockedAccess.status}, listado=${inList}, excluir=${del.status}, removido=${gone}`);
}
// 20. O Super Administrador é único e a conta master permanece superadmin
{
  const list = await req('/api/users', { token: masterToken });
  const supers = (list.json?.users || []).filter((u) => u.role === 'superadmin');
  const master = (list.json?.users || []).find((u) => u.email === 'iluminatto@gmail.com');
  record('Super Admin único e master preservado', supers.length === 1 && master?.role === 'superadmin' && master?.status === 'aprovado',
    `superadmins=${supers.length}, master=${master?.role}/${master?.status}`);
}

// 21. Login com Google (verificação do ID token do Firebase no servidor)
{
  const semToken = await req('/api/auth/google', { method: 'POST', body: {} });
  const lixo = await req('/api/auth/google', { method: 'POST', body: { idToken: 'nao.e.um.jwt' } });

  // Assinatura falsa porém com kid real do Google: deve falhar na verificação criptográfica
  let assinaturaFalsa = 0;
  try {
    const certs = await (await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com')).json();
    const kid = Object.keys(certs)[0];
    const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const claims = {
      aud: 'gen-lang-client-0839703506',
      iss: 'https://securetoken.google.com/gen-lang-client-0839703506',
      email: 'iluminatto@gmail.com',
      email_verified: true,
      sub: 'fake-uid',
      iat: Math.floor(Date.now() / 1000) - 10,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    const forjado = `${b64({ alg: 'RS256', kid, typ: 'JWT' })}.${b64(claims)}.${Buffer.from('assinatura-falsa').toString('base64url')}`;
    const r = await req('/api/auth/google', { method: 'POST', body: { idToken: forjado } });
    assinaturaFalsa = r.status;
  } catch (e) {
    assinaturaFalsa = -1; // sem rede para buscar os certificados
  }

  record('Login Google rejeita token ausente/inválido/forjado',
    semToken.status === 400 && lixo.status === 401 && (assinaturaFalsa === 401 || assinaturaFalsa === -1),
    `ausente=${semToken.status}, malformado=${lixo.status}, assinaturaFalsa=${assinaturaFalsa}`);
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\nRESULTADO: ${results.length - failed}/${results.length} verificações passaram`);
process.exit(failed === 0 ? 0 : 1);
