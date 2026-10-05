export interface MediaGroupAsset {
  id: string;
  url: string;
  name: string;
  mimeType: string;
}
export interface MediaGroup {
  layout: 'vertical' | 'grid';
  assets: MediaGroupAsset[];
}
const urlPattern =
  /^\/(?:api\/v1\/media\/[a-f0-9-]{36}\.(webp|mp4|m4a|webm|mp3|wav|ogg)|sakura\/images\/[a-zA-Z0-9_./@-]+)$/;
export function parseMediaGroup(source: string): MediaGroup | null {
  try {
    const data = JSON.parse(source) as MediaGroup;
    if (
      !['vertical', 'grid'].includes(data.layout) ||
      !Array.isArray(data.assets) ||
      !data.assets.length ||
      data.assets.length > 100
    )
      return null;
    if (
      data.assets.some(
        (a) =>
          !a ||
          typeof a.url !== 'string' ||
          !urlPattern.test(a.url) ||
          a.url.includes('..') ||
          typeof a.name !== 'string' ||
          a.name.length > 255 ||
          typeof a.id !== 'string' ||
          ![
            'image/webp',
            'video/mp4',
            'video/webm',
            'audio/mpeg',
            'audio/wav',
            'audio/ogg',
            'audio/mp4',
            'audio/webm',
          ].includes(a.mimeType),
      )
    )
      return null;
    return data;
  } catch {
    return null;
  }
}
export function serializeMediaGroup(group: MediaGroup) {
  return '```cool-media\n' + JSON.stringify(group, null, 2) + '\n```';
}
export function mediaGroups(source: string) {
  return [
    ...source.matchAll(/^```cool-media\n([\s\S]*?)\n```[ \t]*$/gm),
  ].flatMap((m) => {
    const group = parseMediaGroup(m[1]!);
    return group ? [{ start: m.index, end: m.index + m[0].length, group }] : [];
  });
}
