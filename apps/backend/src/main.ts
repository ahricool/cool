import 'reflect-metadata';
import { createApp } from './app';
import { readConfig } from './config';
async function bootstrap() {
  const app = await createApp();
  await app.listen(readConfig().port, '0.0.0.0');
}
void bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
