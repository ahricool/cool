import { randomInt } from 'node:crypto';
const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
export function randomResourcePath() {
  let value: string;
  do {
    value = Array.from(
      { length: 8 },
      () => alphabet[randomInt(alphabet.length)],
    ).join('');
  } while (
    !/[A-Z]/.test(value) ||
    !/[a-z]/.test(value) ||
    !/[0-9]/.test(value)
  );
  return value;
}
/** Retry only the resource's unique slug collision, never unrelated validation failures. */
export async function createWithResourcePath<T>(
  create: (slug: string) => Promise<T>,
) {
  for (let attempt = 0; attempt < 16; attempt++) {
    try {
      return await create(randomResourcePath());
    } catch (error) {
      const failure = error as {
        code?: string;
        meta?: {
          target?: unknown;
          driverAdapterError?: { cause?: { constraint?: { index?: string } } };
        };
      };
      const target = failure.meta?.target;
      const index = failure.meta?.driverAdapterError?.cause?.constraint?.index;
      const slugCollision =
        (Array.isArray(target) && target.includes('slug')) ||
        target === 'slug' ||
        (typeof index === 'string' &&
          /^(posts|pages|tags|categories)_slug_key$/.test(index));
      if (failure.code !== 'P2002' || !slugCollision) throw error;
    }
  }
  throw new Error('Could not allocate a unique resource path');
}
