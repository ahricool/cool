import { Database } from './database';
import { hashPassword } from './password';
async function seed() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (
    !email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !password ||
    password.length < 16 ||
    password.length > 256 ||
    password.startsWith('replace-')
  )
    throw new Error(
      'Set ADMIN_EMAIL and a unique ADMIN_PASSWORD (16–256 characters)',
    );
  const db = new Database();
  try {
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(732019)`;
      const owner = await tx.user.findFirst();
      if (owner && owner.email !== email)
        throw new Error(
          'Owner already exists; refusing to create another account',
        );
      if (!owner)
        await tx.user.create({
          data: {
            email,
            passwordHash: await hashPassword(password),
            displayName: process.env.ADMIN_NAME ?? 'Administrator',
          },
        });
      await tx.siteSetting.upsert({
        where: { key: 'site' },
        update: {},
        create: {
          key: 'site',
          value: {
            title: 'Personal CMS',
            description: '',
            author: { name: process.env.ADMIN_NAME ?? 'Administrator' },
          },
        },
      });
    });
    console.log(
      'Owner and site initialized; existing credentials are unchanged.',
    );
  } finally {
    await db.$disconnect();
  }
}
void seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
