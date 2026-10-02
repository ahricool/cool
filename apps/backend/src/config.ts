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
  const trustProxyHops = process.env.TRUST_PROXY_HOPS ?? '0';
  if (trustProxyHops !== '0' && trustProxyHops !== '1')
    throw new Error('TRUST_PROXY_HOPS must be 0 (direct) or 1 (single proxy)');
  const origins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  for (const origin of origins)
    if (new URL(origin).origin !== origin)
      throw new Error('CORS_ORIGINS requires exact origins');
  return {
    databaseUrl,
    jwtSecret,
    port,
    origins,
    trustProxyHops: Number(trustProxyHops),
  };
}
