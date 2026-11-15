export const SITE = {
  name: 'Vent Blog',
  url: 'https://vent.africa',
  description:
    'Stories, guides and news on using crypto across Africa — practical help for selling, saving and spending crypto in Nigeria and Ghana.',
  downloadUrl: 'https://vent.africa',
};

export const CAROUSEL_COUNT = 5;
export const PAGE_SIZE = 6;

export interface Category {
  slug: string;
  name: string;
  desc: string;
}

export const CATEGORIES: Category[] = [
  { slug: 'guides', name: 'Guides', desc: 'Step-by-step help for selling, sending and spending crypto with Vent.' },
  { slug: 'markets', name: 'Markets', desc: 'What price moves, policy changes and new tokens mean for people in Nigeria and Ghana.' },
  { slug: 'product', name: 'Product', desc: 'New features, launches and changes across the Vent app.' },
  { slug: 'security', name: 'Security', desc: 'Scams to watch for and habits that keep your money safe.' },
  { slug: 'lifestyle', name: 'Lifestyle', desc: 'How people across Africa are living, working and travelling with crypto.' },
];

export const AUTHORS: Record<string, string> = {
  ao: 'Adaeze Okafor',
  km: 'Kwame Mensah',
  ta: 'Tolu Adebayo',
  ea: 'Efua Asante',
};

export const getCategory = (slug: string) => CATEGORIES.find((c) => c.slug === slug);

export const SOCIALS = [
  { label: 'Facebook', glyph: 'f', href: '#' },
  { label: 'X', glyph: 'X', href: '#' },
  { label: 'Instagram', glyph: 'IG', href: '#' },
  { label: 'LinkedIn', glyph: 'in', href: '#' },
  { label: 'TikTok', glyph: 'TT', href: '#' },
  { label: 'WhatsApp', glyph: 'WA', href: '#' },
  { label: 'Telegram', glyph: 'TG', href: '#' },
];

export const FOOTER_LINKS = [
  { title: 'PRODUCTS', links: ['Vent For Business', 'Easy Pay', 'SafeWallet', 'eSIMs', 'vUSD', 'Airtime', 'Data'] },
  { title: 'USER GUIDES', links: ['Sell Bitcoin (BTC)', 'Sell USDT', 'Sell Solana (SOL)', 'Sell USDC', 'Get vUSD'] },
  { title: 'RESOURCES', links: ['Vent Support', 'Blog', 'vLearn'] },
  { title: 'COMPANY', links: ['About Us', 'Careers', 'Contact'] },
];

export const LEGAL_LINKS = ['AML/KYC & Compliance', 'Terms and Conditions', 'Privacy Policy'];
