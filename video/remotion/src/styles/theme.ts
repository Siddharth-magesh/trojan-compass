// Visual tokens for the demo video: dark surfaces, USC cardinal and gold accents, readable 1080p type scale.
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadNewsreader } from '@remotion/google-fonts/Newsreader';

const inter = loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] });
const newsreader = loadNewsreader('normal', { weights: ['400', '500'], subsets: ['latin'] });

export const fonts = { sans: inter.fontFamily, serif: newsreader.fontFamily, mono: 'Menlo, ui-monospace, monospace' };

export const colors = {
  background: '#0f0d0c',
  surface: '#1a1715',
  surface_raised: '#24201d',
  border: '#3a3430',
  text: '#f5efe6',
  muted: '#b9aea3',
  faint: '#8a8078',
  cardinal: '#990000',
  cardinal_soft: '#3a1414',
  gold: '#ffcc00',
  gold_soft: '#3a3214',
  sage: '#7fb38f',
  warning: '#e9a23b',
};

// Minimums from the video layout rules: headline 84 px, supporting text 44 px, body at least 36 px.
export const type = { display: 104, headline: 84, title: 60, supporting: 44, body: 36, label: 28 };

export const layout = { width: 1920, height: 1080, safe_x: 96, safe_y: 96 };
