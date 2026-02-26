import { SerializedColorEntry } from '../../shared/types';
import type { ColorDisplayFormat } from '../../shared/messages';
import { formatResolvedColor, gradientToCSSString } from './format';

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

async function copyText(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below for environments where Clipboard API is blocked.
    }
  }

  return execCommandCopy(text);
}

export async function copyColorToClipboard(
  color: SerializedColorEntry,
  format: ColorDisplayFormat
): Promise<boolean> {
  try {
    let text = '';

    if (color.type === 'solid') {
      text = formatResolvedColor(color, format);
    } else if (color.type === 'gradient' && color.gradient) {
      text = gradientToCSSString(color.gradient);
    }

    if (!text) return false;

    return await copyText(text);
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
