import { defaultSettings } from './settings';
import { Database } from './database';
import { ADMIN_EMAIL } from './auth.constants';
async function seed() {
  const db = new Database();
  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(732019)`;
      await tx.user.upsert({
        where: { email: ADMIN_EMAIL },
        update: {},
        create: {
          email: ADMIN_EMAIL,
          passwordHash: null,
          displayName: 'Administrator',
        },
      });
      await tx.siteSetting.upsert({
        where: { key: 'site' },
        update: {},
        create: {
          key: 'site',
          value: {
            ...defaultSettings.site,
            authorName: 'Administrator',
          },
        },
      });
    });
    console.log(
      'Single author and site initialized. Set the first password at first login; existing credentials are unchanged.',
    );
  } finally {
    await db.$disconnect();
  }
}
void seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
