import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const adminEmail = process.env.ADMIN_EMAIL || process.env.BOOTSTRAP_ADMIN_EMAIL || 'admin@example.test';
const adminPassword = process.env.ADMIN_PASSWORD || process.env.BOOTSTRAP_ADMIN_PASSWORD;

if (!adminPassword) {
  console.error('Error: ADMIN_PASSWORD or BOOTSTRAP_ADMIN_PASSWORD is required in environment or .env');
  process.exit(1);
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
      throw new Error(`POST ${urlPath} failed (${res.status}): ${err}`);
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

async function main() {
  console.log(`\n--- Seeding Demo Data on ${baseUrl} ---`);
  const adminClient = new ApiClient(baseUrl);

  console.log(`Signing in as admin (${adminEmail})...`);
  await adminClient.login(adminEmail, adminPassword);
  const adminMe = await adminClient.getMe();
  console.log(`Authenticated as: ${adminMe.displayName} (${adminMe.role})`);

  // 1. SKILLS
  console.log('\n[1/5] Ensuring skills...');
  const existingSkills = await adminClient.get('/api/v1/admin/skills');
  const skillMap = new Map();
  for (const s of existingSkills) {
    skillMap.set(s.name, s.id);
  }

  const targetSkills = ['Application support', 'Network', 'Database'];
  for (const name of targetSkills) {
    if (!skillMap.has(name)) {
      console.log(`Creating skill: "${name}"`);
      const created = await adminClient.post('/api/v1/admin/skills', { name, active: true });
      skillMap.set(name, created.id);
    } else {
      console.log(`Skill exists: "${name}" (${skillMap.get(name)})`);
    }
  }

  const appSkillId = skillMap.get('Application support');
  const netSkillId = skillMap.get('Network');
  const dbSkillId = skillMap.get('Database');

  // 2. CATEGORIES
  console.log('\n[2/5] Ensuring categories...');
  const existingCats = await adminClient.get('/api/v1/admin/categories');
  const catMap = new Map();
  for (const c of existingCats) {
    catMap.set(c.name, c.id);
  }

  const targetCats = [
    { name: 'Application', requirements: { [appSkillId]: 3 } },
    { name: 'Network', requirements: { [netSkillId]: 3 } },
    { name: 'Database', requirements: { [dbSkillId]: 3 } }
  ];

  for (const c of targetCats) {
    if (!catMap.has(c.name)) {
      console.log(`Creating category: "${c.name}"`);
      const created = await adminClient.post('/api/v1/admin/categories', {
        name: c.name,
        active: true,
        requirements: c.requirements
      });
      catMap.set(c.name, created.id);
    } else {
      console.log(`Category exists: "${c.name}" (${catMap.get(c.name)})`);
    }
  }

  // 3. SERVICES & SLA POLICIES
  console.log('\n[3/5] Ensuring services...');
  const existingServices = await adminClient.get('/api/v1/admin/services');
  const svcMap = new Map();
  for (const s of existingServices) {
    svcMap.set(s.name, s.id);
  }

  const targetServices = [
    { name: 'Identity and Access', description: 'SSO, credentials, and directory services', criticality: 2 },
    { name: 'Payment Gateway', description: 'Payment processing and checkout systems', criticality: 3 },
    { name: 'Demo service', description: 'Demo service with short SLA for live breach verification', criticality: 3 }
  ];

  for (const svc of targetServices) {
    if (!svcMap.has(svc.name)) {
      console.log(`Creating service: "${svc.name}"`);
      const created = await adminClient.post('/api/v1/admin/services', {
        name: svc.name,
        description: svc.description,
        criticality: svc.criticality,
        active: true
      });
      svcMap.set(svc.name, created.id);
    } else {
      console.log(`Service exists: "${svc.name}" (${svcMap.get(svc.name)})`);
    }
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

  // Ensure standard policy for Payment Gateway and Identity if needed
  const paymentSvcId = svcMap.get('Payment Gateway');
  const payPolicies = await adminClient.get(`/api/v1/admin/services/${paymentSvcId}/sla-policies`);
  if (payPolicies.length === 0) {
    await adminClient.post(`/api/v1/admin/services/${paymentSvcId}/sla-policies`, {
      targets: {
        P1: { responseSeconds: 300, resolutionSeconds: 1800 },
        P2: { responseSeconds: 900, resolutionSeconds: 7200 },
        P3: { responseSeconds: 3600, resolutionSeconds: 28800 },
        P4: { responseSeconds: 14400, resolutionSeconds: 86400 }
      }
    });
    console.log('Published default SLA policy for Payment Gateway.');
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
      displayName: 'Administrator',
      email: adminEmail,
      password: adminPassword,
      details: 'System administrator'
    },
    {
      role: 'TECHNICIAN',
      displayName: 'Priya Nair',
      email: 'priya@example.test',
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
      displayName: 'Marcus Vance',
      email: 'marcus@example.test',
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
      displayName: 'Elena Rostova',
      email: 'elena@example.test',
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
      displayName: 'Sarah Chen',
      email: 'sarah@example.test',
      password: defaultPassword,
      details: 'Standard employee / incident reporter'
    },
    {
      role: 'EMPLOYEE',
      displayName: 'David Kim',
      email: 'david@example.test',
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
      'Password': a.password,
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
  await testTech.login('priya@example.test', defaultPassword);
  const meTech = await testTech.getMe();
  if (meTech.role !== 'TECHNICIAN') throw new Error(`Expected TECHNICIAN role, got ${meTech.role}`);
  console.log(`✓ Technician sign-in verified: ${meTech.displayName} (${meTech.email})`);

  // Test Employee
  const testEmp = new ApiClient(baseUrl);
  await testEmp.login('sarah@example.test', defaultPassword);
  const meEmp = await testEmp.getMe();
  if (meEmp.role !== 'EMPLOYEE') throw new Error(`Expected EMPLOYEE role, got ${meEmp.role}`);
  console.log(`✓ Employee sign-in verified: ${meEmp.displayName} (${meEmp.email})`);

  console.log('\n✓ Demo data seeding and role login checks completed successfully!\n');
}

main().catch(err => {
  console.error('\nSeed failed:', err);
  process.exit(1);
});

