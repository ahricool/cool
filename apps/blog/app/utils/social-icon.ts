/** Match trusted hosts to Sakura's bundled SNS artwork; never fetch remote icons. */
export function socialIcon(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return '/sakura/images/sns/heart.png';
  }
  const icons: [string, string][] = [
    ['github.com', 'github.png'],
    ['bilibili.com', 'bilibili.png'],
    ['music.163.com', 'wangyiyun.png'],
    ['zhihu.com', 'zhihu.png'],
    ['jianshu.com', 'jianshu.png'],
    ['csdn.net', 'csdn.png'],
    ['weibo.com', 'weibo.png'],
    ['weibo.cn', 'weibo.png'],
    ['qzone.qq.com', 'qzone.png'],
    ['qq.com', 'qq.png'],
    ['douban.com', 'douban.png'],
    ['lofter.com', 'lofter.png'],
    ['linkedin.com', 'linkedin.png'],
    ['stackoverflow.com', 'stackoverflow.svg'],
    ['twitter.com', 'twitter.png'],
    ['x.com', 'twitter.png'],
    ['facebook.com', 'facebook.png'],
    ['t.me', 'telegram.svg'],
    ['telegram.org', 'telegram.svg'],
    ['youku.com', 'youku.png'],
  ];
  const icon =
    icons.find(
      ([domain]) => host === domain || host.endsWith(`.${domain}`),
    )?.[1] ?? 'heart.png';
  return `/sakura/images/sns/${icon}`;
}
