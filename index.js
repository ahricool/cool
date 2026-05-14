const fastify = require('fastify')({ logger: true });

fastify.get('/', async () => {
  return { message: 'Hello, World!' };
});

const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
