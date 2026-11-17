import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

export const referencePath = fileURLToPath(new URL('../demo-data.local.json', import.meta.url));

export function readReference() {
  return fs.existsSync(referencePath)
    ? JSON.parse(fs.readFileSync(referencePath, 'utf8'))
    : { accounts: [] };
}

export async function refreshReference(client, Client, baseUrl, credentials) {
  const previous = readReference();
  const candidates = new Map((previous.accounts ?? []).map(account => [account.email.toLowerCase(), account]));
  for (const account of credentials) candidates.set(account.email.toLowerCase(), account);

  const users = await client.get('/api/v1/admin/users');
  const skills = await client.get('/api/v1/admin/skills');
  const categories = await client.get('/api/v1/admin/categories');
  const services = await client.get('/api/v1/admin/services');
  const technicians = await client.get('/api/v1/admin/technicians');
  const incidents = [];
  let page = 0;
  let result;
  do {
    result = await client.get(`/api/v1/incidents?includeClosed=true&size=100&page=${page++}`);
    incidents.push(...result.items);
  } while (page < result.totalPages);

  const accounts = [];
  for (const user of users) {
    const password = candidates.get(user.email.toLowerCase())?.password;
    const entry = { ...user, password: password ?? null, passwordStatus: 'unknown — password hashes cannot be reversed' };
    if (password) {
      try {
        const session = new Client(baseUrl);
        await session.login(user.email, password);
        const me = await session.getMe();
        if (me.id !== user.id || me.role !== user.role) throw new Error('Account identity mismatch');
        entry.passwordStatus = 'sign-in verified';
      } catch {
        entry.passwordStatus = 'sign-in not verified — candidate password may be outdated or account inactive';
      }
    }
    accounts.push(entry);
  }

  const snapshot = {
    updatedAt: new Date().toISOString(),
    baseUrl,
    status: 'Live API snapshot; rerun npm run demo:refresh to update',
    accounts, skills, categories, services, technicians, incidents,
    demonstration: [
      'Admin: create a skill and category; configure a service with SLA targets; configure technician skills and capacity.',
      'Employee: report an incident and add a public comment.',
      'Admin: review recommendations and confirm a technician assignment with a reason.',
      'Assigned technician: acknowledge, start investigation, add public/internal notes, record a resolution.',
      'Admin: verify or reject the resolution, then close the verified incident.',
      'Reporter: reopen a closed incident within seven days with a reason.',
    ],
  };
  fs.writeFileSync(referencePath, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(referencePath, 0o600);
  console.log(`Demo reference updated: ${referencePath}`);
}
