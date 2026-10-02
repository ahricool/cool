import { registerDecorator } from 'class-validator';
// Browser-facing media URLs must be same-origin. No CDN or executable URL schemes.
export function IsAssetPath() {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: 'isAssetPath',
      target: target.constructor,
      propertyName,
      validator: {
        validate: (v: unknown) =>
          typeof v === 'string' &&
          /^\/(?:api\/v1\/media\/[a-f0-9-]+\.webp|sakura\/images\/[a-zA-Z0-9_./@-]+)$/.test(
            v,
          ) &&
          !v.includes('..'),
        defaultMessage: () => `${propertyName} must be a local media URL`,
      },
    });
}
