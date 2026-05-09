/**
 * lib/pdf/register-fonts.ts
 *
 * Registers all font families with @react-pdf/renderer once.
 * Call this before any pdf rendering.
 */

import { Font } from '@react-pdf/renderer';
import { FONT_SOURCES, type FontKey } from './styles';

let registered = false;

export function registerFonts() {
  if (registered) return;
  registered = true;

  for (const [family, urls] of Object.entries(FONT_SOURCES) as [FontKey, (typeof FONT_SOURCES)[FontKey]][]) {
    Font.register({
      family,
      fonts: [
        { src: urls.normal, fontWeight: 'normal' },
        { src: urls.bold,   fontWeight: 'bold'   },
      ],
    });
  }

  // Prevent hyphenation — makes résumés look cleaner
  Font.registerHyphenationCallback(word => [word]);
}
