import { closePool } from '../client';
import { seed } from '../seed';

const result = await seed();
console.log('Seeded demo tenants (fictional data only):');
for (const org of result.organizations) console.log(`  ${org.name}  ${org.id}`);
console.log('\nDemo accounts — no passwords: identity arrives in CC-03.');
for (const user of result.users) console.log(`  ${user.role.padEnd(20)} ${user.email}`);
await closePool();
