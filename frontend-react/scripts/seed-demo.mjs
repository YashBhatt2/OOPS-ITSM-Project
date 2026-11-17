import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readReference, refreshReference } from './demo-reference.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Helper to load .env if variables are missing
function loadEnv() {
  const envPath = path.join(projectRoot, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const baseUrl = process.env.BASE_URL || 'http://localhost:8080';
const savedAdmin = readReference().accounts?.find(account => account.role === 'ADMIN' && account.password);
const adminEmail = process.env.ADMIN_EMAIL || savedAdmin?.email || process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@example.test';
const adminPassword = process.env.ADMIN_PASSWORD || (adminEmail === savedAdmin?.email ? savedAdmin.password : undefined) || process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!adminPassword) {
  console.error('Error: ADMIN_PASSWORD or BOOTSTRAP_ADMIN_PASSWORD is required in environment or .env');
  process.exit(1);
}

class ApiResponseError extends Error {
  constructor(method, path, status, body) {
    super(`${method} ${path} failed (${status}): ${body}`);
    this.name = 'ApiResponseError';
    this.status = status;
  }
}

class ApiClient {
  constructor(base) {
    this.base = base;
    this.cookies = new Map();
    this.csrf = null;
  }

  getCookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  updateCookies(res) {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    const setCookies = raw.length > 0 ? raw : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : []);
    for (const sc of setCookies) {
      const parts = sc.split(';')[0].split('=');
      if (parts.length >= 2) {
        this.cookies.set(parts[0].trim(), parts.slice(1).join('=').trim());
      }
    }
  }

  async fetch(urlPath, options = {}) {
    const headers = new Headers(options.headers || {});
    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) headers.set('Cookie', cookieHeader);

    if (this.csrf && (options.method === 'POST' || options.method === 'PATCH' || options.method === 'DELETE')) {
      headers.set(this.csrf.headerName, this.csrf.token);
    }

    const res = await fetch(`${this.base}${urlPath}`, {
      ...options,
      headers
    });
    this.updateCookies(res);
    return res;
  }

  async getCsrf() {
    const res = await this.fetch('/api/v1/auth/csrf');
    if (!res.ok) throw new Error(`Failed to fetch CSRF token: ${res.status}`);
    this.csrf = await res.json();
    return this.csrf;
  }

  async login(email, password) {
    await this.getCsrf();
    const params = new URLSearchParams();
    params.set('email', email);
    params.set('password', password);

    const res = await this.fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Login failed for ${email}: ${res.status} - ${text}`);
    }

    // Refresh CSRF after login
    await this.getCsrf();
    return res;
  }

  async getMe() {
    const res = await this.fetch('/api/v1/auth/me');
    if (!res.ok) throw new Error(`GET /auth/me failed: ${res.status}`);
    return res.json();
  }

  async get(urlPath) {
    const res = await this.fetch(urlPath);
    if (!res.ok) throw new Error(`GET ${urlPath} failed: ${res.status}`);
    return res.json();
  }

  async post(urlPath, data) {
    const res = await this.fetch(urlPath, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new ApiResponseError('POST', urlPath, res.status, err);
    }
    return res.json();
  }

  async patch(urlPath, data) {
    const res = await this.fetch(urlPath, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`PATCH ${urlPath} failed (${res.status}): ${err}`);
    }
    return res.json();
  }
}

function nameKey(name) {
  return name.trim().toLocaleLowerCase();
}

async function ensureNamedResource(client, endpoint, records, name, payload) {
  const key = nameKey(name);
  const existing = records.find(record => nameKey(record.name) === key);
  if (existing) return existing;

  try {
    const created = await client.post(endpoint, payload);
    const record = { ...payload, ...created, name: payload.name };
    records.push(record);
    return record;
  } catch (error) {
    if (!(error instanceof ApiResponseError) || error.status !== 409) throw error;

    const refreshed = await client.get(endpoint);
    const concurrentRecord = refreshed.find(record => nameKey(record.name) === key);
    if (!concurrentRecord) {
      const visibleNames = refreshed.map(record => record.name).join(', ') || '(none)';
      throw new Error(`${error.message}\nThe catalog still does not show "${name}" after refreshing. Visible names: ${visibleNames}`);
    }

    records.push(concurrentRecord);
    console.log(`Found existing record after conflict: "${concurrentRecord.name}" (${concurrentRecord.id})`);
    return concurrentRecord;
  }
}

async function main() {
  console.log(`\n--- Seeding Demo Data on ${baseUrl} ---`);
  const adminClient = new ApiClient(baseUrl);

  console.log(`Signing in as admin (${adminEmail})...`);
  await adminClient.login(adminEmail, adminPassword);
  const adminMe = await adminClient.getMe();
  console.log(`Authenticated as: ${adminMe.displayName} (${adminMe.role})`);
  if (process.argv.includes('--snapshot')) {
    await refreshReference(adminClient, ApiClient, baseUrl, [
      { ...adminMe, password: adminPassword },
    ]);
    return;
  }

  // 1. SKILLS
  console.log('\n[1/5] Ensuring skills...');
  const existingSkills = await adminClient.get('/api/v1/admin/skills');
  const skillMap = new Map();
  const targetSkills = ['Application support', 'Network', 'Database'];
  for (const name of targetSkills) {
    const existedBefore = existingSkills.some(skill => nameKey(skill.name) === nameKey(name));
    if (!existedBefore) console.log(`Ensuring skill: "${name}"`);
    const skill = await ensureNamedResource(
      adminClient,
      '/api/v1/admin/skills',
      existingSkills,
      name,
      { name, active: true }
    );
    skillMap.set(name, skill.id);
    if (existedBefore) console.log(`Skill exists: "${name}" (${skill.id})`);
  }

  const appSkillId = skillMap.get('Application support');
  const netSkillId = skillMap.get('Network');
  const dbSkillId = skillMap.get('Database');

  // 2. CATEGORIES
  console.log('\n[2/5] Ensuring categories...');
  const existingCats = await adminClient.get('/api/v1/admin/categories');
  const catMap = new Map();

  const targetCats = [
    { name: 'Application', requirements: { [appSkillId]: 3 } },
    { name: 'Network', requirements: { [netSkillId]: 3 } },
    { name: 'Database', requirements: { [dbSkillId]: 3 } }
  ];

  for (const c of targetCats) {
    const existedBefore = existingCats.some(category => nameKey(category.name) === nameKey(c.name));
    if (!existedBefore) console.log(`Ensuring category: "${c.name}"`);
    const category = await ensureNamedResource(
      adminClient,
      '/api/v1/admin/categories',
      existingCats,
      c.name,
      { name: c.name, active: true, requirements: c.requirements }
    );
    catMap.set(c.name, category.id);
    if (existedBefore) console.log(`Category exists: "${c.name}" (${category.id})`);
  }

  // 3. SERVICES & SLA POLICIES
  console.log('\n[3/5] Ensuring services...');
  const existingServices = await adminClient.get('/api/v1/admin/services');
  const svcMap = new Map();

  const targetServices = [
    { name: 'Identity and Access', description: 'SSO, credentials, and directory services', criticality: 2 },
    { name: 'Payment Gateway', description: 'Payment processing and checkout systems', criticality: 3 },
    { name: 'Demo service', description: 'Demo service with short SLA for live breach verification', criticality: 3 }
  ];

  for (const svc of targetServices) {
    const existedBefore = existingServices.some(service => nameKey(service.name) === nameKey(svc.name));
    if (!existedBefore) console.log(`Ensuring service: "${svc.name}"`);
    const service = await ensureNamedResource(
      adminClient,
      '/api/v1/admin/services',
      existingServices,
      svc.name,
      { ...svc, active: true }
    );
    svcMap.set(svc.name, service.id);
    if (existedBefore) console.log(`Service exists: "${svc.name}" (${service.id})`);
  }

  // Publish short SLA policy for "Demo service"
  const demoSvcId = svcMap.get('Demo service');
  console.log(`Configuring short SLA targets for "Demo service"...`);
  const demoPolicies = await adminClient.get(`/api/v1/admin/services/${demoSvcId}/sla-policies`);
  if (demoPolicies.length === 0) {
    await adminClient.post(`/api/v1/admin/services/${demoSvcId}/sla-policies`, {
      targets: {
        P1: { responseSeconds: 120, resolutionSeconds: 600 },
        P2: { responseSeconds: 300, resolutionSeconds: 1800 },
        P3: { responseSeconds: 600, resolutionSeconds: 3600 },
        P4: { responseSeconds: 1800, resolutionSeconds: 7200 }
      }
    });
    console.log('Published P1 120s/600s SLA policy for Demo service.');
  } else {
    console.log(`SLA policy already exists for Demo service (rev ${demoPolicies[0].revision}).`);
  }

  // Ensure standard policies for the remaining demo services.
  for (const serviceName of ['Payment Gateway', 'Identity and Access']) {
    const serviceId = svcMap.get(serviceName);
    const policies = await adminClient.get(`/api/v1/admin/services/${serviceId}/sla-policies`);
    if (policies.length !== 0) continue;
    await adminClient.post(`/api/v1/admin/services/${serviceId}/sla-policies`, {
      targets: {
        P1: { responseSeconds: 300, resolutionSeconds: 1800 },
        P2: { responseSeconds: 900, resolutionSeconds: 7200 },
        P3: { responseSeconds: 3600, resolutionSeconds: 28800 },
        P4: { responseSeconds: 14400, resolutionSeconds: 86400 }
      }
    });
    console.log(`Published default SLA policy for ${serviceName}.`);
  }

  // 4. USERS (3 Technicians + 2 Employees)
  console.log('\n[4/5] Ensuring users and technicians...');
  const existingUsers = await adminClient.get('/api/v1/admin/users');
  const userMap = new Map();
  for (const u of existingUsers) {
    userMap.set(u.email.toLowerCase(), u);
  }

  const defaultPassword = 'Password12345!';

  const demoAccounts = [
    {
      role: 'ADMIN',
      displayName: 'Admin',
      email: adminEmail,
      password: adminPassword,
      details: 'System administrator'
    },
    {
      role: 'TECHNICIAN',
      displayName: 'Yash',
      email: 'yash@example.test',
      password: defaultPassword,
      techProfile: {
        available: true,
        capacity: 5,
        experienceMonths: 36,
        skills: { [appSkillId]: 4, [dbSkillId]: 3 }
      },
      details: 'App support (4), Database (3), cap: 5, exp: 36m'
    },
    {
      role: 'TECHNICIAN',
      displayName: 'Gnana',
      email: 'gnana@example.test',
      password: defaultPassword,
      techProfile: {
        available: true,
        capacity: 3,
        experienceMonths: 48,
        skills: { [netSkillId]: 5, [appSkillId]: 2 }
      },
      details: 'Network (5), App support (2), cap: 3, exp: 48m'
    },
    {
      role: 'TECHNICIAN',
      displayName: 'Harshith',
      email: 'harshith@example.test',
      password: defaultPassword,
      techProfile: {
        available: true,
        capacity: 4,
        experienceMonths: 24,
        skills: { [dbSkillId]: 5, [netSkillId]: 3 }
      },
      details: 'Database (5), Network (3), cap: 4, exp: 24m'
    },
    {
      role: 'EMPLOYEE',
      displayName: 'Shreyas',
      email: 'shreyas@example.test',
      password: defaultPassword,
      details: 'Standard employee / incident reporter'
    },
    {
      role: 'EMPLOYEE',
      displayName: 'Vatsal',
      email: 'vatsal@example.test',
      password: defaultPassword,
      details: 'Standard employee / incident reporter'
    }
  ];

  for (const acc of demoAccounts) {
    if (acc.role === 'ADMIN') continue; // Already exists
    const emailKey = acc.email.toLowerCase();
    let userRecord = userMap.get(emailKey);
    if (!userRecord) {
      console.log(`Provisioning user: ${acc.displayName} (${acc.email}) as ${acc.role}`);
      userRecord = await adminClient.post('/api/v1/admin/users', {
        displayName: acc.displayName,
        email: acc.email,
        password: acc.password,
        role: acc.role
      });
      userMap.set(emailKey, userRecord);
    } else {
      console.log(`User exists: ${acc.displayName} (${acc.email})`);
    }

    if (acc.role === 'TECHNICIAN' && acc.techProfile) {
      console.log(`Configuring technician profile for ${acc.displayName}...`);
      await adminClient.patch(`/api/v1/admin/technicians/${userRecord.id}`, acc.techProfile);
    }
  }

  // 5. PRINT DEMO ACCOUNTS TABLE
  console.log('\n========================================================================================');
  console.log('DEMO ACCOUNTS');
  console.log('========================================================================================');
  console.table(
    demoAccounts.map(a => ({
      'Role': a.role,
      'Display Name': a.displayName,
      'Email': a.email,
      'Password': a.role === 'ADMIN' ? '(provided through environment)' : a.password,
      'Details': a.details
    }))
  );

  // 6. VERIFY ALL THREE ROLES CAN SIGN IN
  console.log('\n[5/5] Testing sign-in for all three roles...');

  // Test Admin
  const testAdmin = new ApiClient(baseUrl);
  await testAdmin.login(adminEmail, adminPassword);
  const meAdmin = await testAdmin.getMe();
  if (meAdmin.role !== 'ADMIN') throw new Error(`Expected ADMIN role, got ${meAdmin.role}`);
  console.log(`✓ Admin sign-in verified: ${meAdmin.displayName} (${meAdmin.email})`);

  // Test Technician
  const testTech = new ApiClient(baseUrl);
  await testTech.login('yash@example.test', defaultPassword);
  const meTech = await testTech.getMe();
  if (meTech.role !== 'TECHNICIAN') throw new Error(`Expected TECHNICIAN role, got ${meTech.role}`);
  console.log(`✓ Technician sign-in verified: ${meTech.displayName} (${meTech.email})`);

  // Test Employee
  const testEmp = new ApiClient(baseUrl);
  await testEmp.login('shreyas@example.test', defaultPassword);
  const meEmp = await testEmp.getMe();
  if (meEmp.role !== 'EMPLOYEE') throw new Error(`Expected EMPLOYEE role, got ${meEmp.role}`);
  console.log(`✓ Employee sign-in verified: ${meEmp.displayName} (${meEmp.email})`);

  console.log('\nEnsuring example incidents...');
  const networkTech = new ApiClient(baseUrl);
  await networkTech.login('gnana@example.test', defaultPassword);
  const networkTechAccount = await networkTech.getMe();
  const examples = [
    { title: '[Demo] VPN certificate expired', description: 'VPN connection fails because the client certificate has expired.', close: true },
    { title: '[Demo] VPN certificate connection error', description: 'The VPN client cannot connect and reports an expired certificate.', assign: true },
    { title: '[Demo] VPN login fails after certificate expiration', description: 'VPN login fails with a certificate expired error.', assign: false },
  ];
  const allIncidents = [];
  let page = 0;
  let totalPages;
  do {
    const result = await adminClient.get(`/api/v1/incidents?includeClosed=true&size=100&page=${page}`);
    allIncidents.push(...result.items);
    totalPages = result.totalPages;
    page++;
  } while (page < totalPages);

  const action = async (client, incident, route, fields = {}) => {
    const current = await adminClient.get(`/api/v1/incidents/${incident.id}`);
    return client.post(`/api/v1/incidents/${incident.id}/${route}`, { version: current.version, ...fields });
  };
  for (const example of examples) {
    let incident = allIncidents.find(item => item.title === example.title && item.reporterId === meEmp.id);
    if (!incident) {
      incident = await testEmp.post('/api/v1/incidents', {
        title: example.title, description: example.description,
        serviceId: demoSvcId, categoryId: catMap.get('Network'), impact: 2, urgency: 2,
      });
      console.log(`Created ${incident.reference}: ${example.title}`);
    } else {
      console.log(`Reusing ${incident.reference}: ${example.title}`);
    }
    if (incident.status === 'NEW' && (example.close || example.assign)) {
      incident = await action(adminClient, incident, 'assignments', {
        technicianId: networkTechAccount.id, strategy: 'SKILL_FIRST', reason: 'Demo network support assignment',
      });
    }
    if (example.close && incident.status === 'ASSIGNED') incident = await action(networkTech, incident, 'acknowledge');
    if (example.close && incident.status === 'ACKNOWLEDGED') incident = await action(networkTech, incident, 'start-investigation');
    if (example.close && incident.status === 'IN_PROGRESS') {
      incident = await action(networkTech, incident, 'resolutions', {
        details: 'Renewed the expired VPN client certificate and restarted the VPN client.',
      });
    }
    if (example.close && incident.status === 'RESOLVED') incident = await action(adminClient, incident, 'verify', { note: 'Confirmed the VPN connection works.' });
    if (example.close && incident.status === 'VERIFIED') incident = await action(adminClient, incident, 'close', { note: 'Demo issue resolved and verified.' });
    console.log(`  Status: ${incident.status}`);
  }

  await refreshReference(adminClient, ApiClient, baseUrl, demoAccounts);
  console.log('\n✓ Demo data seeding and role login checks completed successfully!\n');
}

main().catch(err => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});

