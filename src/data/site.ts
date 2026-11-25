export const SITE = {
  name: 'Vent Blog',
  url: 'https://vent.africa',
  description:
    'Stories, guides and news on using crypto across Africa — practical help for selling, saving and spending crypto in Nigeria and Ghana.',
  downloadUrl: 'https://vent.africa',
};

export const CAROUSEL_COUNT = 5;
export const PAGE_SIZE = 6;
/** Posts per blog API request. Home takes the carousel from the first page, so keep it above CAROUSEL_COUNT. */
export const FEED_PER_PAGE = 12;

/** Landing-site paths ("/about") resolve against vent.africa; absolute URLs and "#" pass through. */
const abs = (href: string) => (href.startsWith('/') ? `${SITE.url}${href}` : href);

export interface FooterLink {
  title: string;
  href: string;
}

export const SOCIALS = [
  { label: 'Facebook', icon: 'facebook', href: 'https://web.facebook.com/ventafricaapp' },
  { label: 'X', icon: 'x-twitter', href: 'https://x.com/ventafricaapp' },
  { label: 'Instagram', icon: 'instagram', href: 'https://www.instagram.com/use_ventapp/' },
  { label: 'LinkedIn', icon: 'linkedin', href: 'https://www.linkedin.com/company/vent-africa/' },
  { label: 'TikTok', icon: 'tiktok', href: 'https://www.tiktok.com/@ventafricaapp' },
  { label: 'WhatsApp', icon: 'whatsapp', href: 'https://whatsapp.com/channel/0029Vb69BWGBqbr6xXdu603a' },
  { label: 'Telegram', icon: 'telegram', href: 'https://t.me/VentAfricachannel' },
] as const;

const links = (items: [string, string][]): FooterLink[] => items.map(([title, href]) => ({ title, href: abs(href) }));

export const FOOTER_LINKS: { title: string; newTab: boolean; nowrap: boolean; links: FooterLink[] }[] = [
  {
    title: 'PRODUCTS',
    newTab: true,
    nowrap: true,
    links: links([
      ['Vent For Business', '#'],
      ['Easy Pay', '/easy-pay'],
      ['SafeWallet', '/safe-wallet'],
      ['eSIMs', '/esims'],
      ['vUSD', '/vusd'],
      ['Airtime', '#'],
      ['Data', '#'],
    ]),
  },
  {
    title: 'USER GUIDES',
    newTab: false,
    nowrap: true,
    links: links([
      ['Sell Bitcoin (BTC)', '/crypto/btc'],
      ['Sell USDT', '/crypto/usdt'],
      ['Sell Binance Coin (BNB)', '/crypto/bnb'],
      ['Sell Solana (SOL)', '/crypto/solana'],
      ['Sell USDC', '/crypto/usdc'],
      ['Get vUSD', '/vusd'],
      ['Buy Airtime/Data', '#'],
      ['Accept Crypto from customers', '#'],
    ]),
  },
  {
    title: 'RESOURCES',
    newTab: true,
    nowrap: false,
    links: links([
      ['Vent Support', '/support'],
      ['Blog', 'https://blog.vent.africa'],
      ['vLearn', 'https://www.youtube.com/@Ventafricaapp'],
    ]),
  },
  {
    title: 'COMPANY',
    newTab: true,
    nowrap: false,
    links: links([
      ['About Us', '/about'],
      ['Careers', '#'],
      ['Contact', '#'],
    ]),
  },
];

export const LEGAL_LINKS: FooterLink[] = [
  {
    title: 'AML/KYC & Compliance',
    href: 'https://ventassets.nyc3.cdn.digitaloceanspaces.com/vent/Vent-Africa-AML-Policy.pdf',
  },
  {
    title: 'Terms and Conditions',
    href: 'https://ventassets.nyc3.cdn.digitaloceanspaces.com/vent/Vent-Africa-Terms-of-Use.pdf',
  },
  {
    title: 'Privacy Policy',
    href: 'https://ventassets.nyc3.cdn.digitaloceanspaces.com/vent/Vent-Africa-Privacy-Policy.pdf',
  },
];
