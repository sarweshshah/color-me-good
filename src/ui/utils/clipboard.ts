import { SerializedColorEntry } from '../../shared/types';
import { formatHex, gradientToCSSString } from './format';

function execCommandCopy(text: string): boolean {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export async function copyColorToClipboard(
  color: SerializedColorEntry
): Promise<boolean> {
  try {
    let text = '';

    if (color.type === 'solid' && color.hex) {
      text = formatHex(color.hex);
    } else if (color.type === 'gradient' && color.gradient) {
      text = gradientToCSSString(color.gradient);
    }

    if (!text) return false;

    return execCommandCopy(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
