export function readConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  const jwtSecret = process.env.JWT_SECRET;
  if (!databaseUrl || !/^postgres(ql)?:\/\//.test(databaseUrl))
    throw new Error('DATABASE_URL must be a PostgreSQL URL');
  if (!jwtSecret || jwtSecret.length < 32 || jwtSecret.startsWith('replace-'))
    throw new Error('JWT_SECRET must contain at least 32 random characters');
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid PORT');
  return {
    databaseUrl,
    jwtSecret,
    port,
  };
}
