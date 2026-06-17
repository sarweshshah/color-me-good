type PaintBindingField = 'fills' | 'strokes';

export class StyleResolverCache {
  private styleCache = new Map<string, PaintStyle | null>();

  async getPaintStyle(styleId: string): Promise<PaintStyle | null> {
    const cached = this.styleCache.get(styleId);
    if (cached !== undefined) return cached;

    try {
      const style = await figma.getStyleByIdAsync(styleId);
      const paintStyle = style?.type === 'PAINT' ? style : null;
      this.styleCache.set(styleId, paintStyle);
      return paintStyle;
    } catch (error) {
      console.warn('Failed to resolve paint style:', error);
      this.styleCache.set(styleId, null);
      return null;
    }
  }
}

function firstAlias(
  alias: VariableAlias | VariableAlias[] | undefined
): VariableAlias | undefined {
  if (!alias) return undefined;
  return Array.isArray(alias) ? alias[0] : alias;
}

function getFillStyleId(node: SceneNode): string | null {
  if (!('fillStyleId' in node)) return null;
  const id = node.fillStyleId;
  if (id === figma.mixed) return null;
  return id || null;
}

function getStrokeStyleId(node: SceneNode): string | null {
  if (!('strokeStyleId' in node)) return null;
  const id = node.strokeStyleId;
  return id || null;
}

function getStyleId(node: SceneNode, field: PaintBindingField): string | null {
  return field === 'fills' ? getFillStyleId(node) : getStrokeStyleId(node);
}

export async function resolveSolidPaintBinding(
  node: SceneNode,
  field: PaintBindingField,
  paintIndex: number,
  paint: SolidPaint,
  styleCache: StyleResolverCache
): Promise<VariableAlias | undefined> {
  const fromNode = firstAlias(node.boundVariables?.[field]?.[paintIndex]);
  if (fromNode) return fromNode;

  const fromPaint = paint.boundVariables?.color;
  if (fromPaint) return fromPaint;

  const styleId = getStyleId(node, field);
  if (!styleId) return undefined;

  const style = await styleCache.getPaintStyle(styleId);
  if (!style) return undefined;

  const stylePaint = style.paints[paintIndex];
  if (stylePaint?.type === 'SOLID') {
    const fromStylePaint = stylePaint.boundVariables?.color;
    if (fromStylePaint) return fromStylePaint;
  }

  return firstAlias(style.boundVariables?.paints?.[paintIndex]);
}

export async function resolveGradientStopBinding(
  node: SceneNode,
  field: PaintBindingField,
  paintIndex: number,
  stopIndex: number,
  paint: GradientPaint,
  styleCache: StyleResolverCache
): Promise<VariableAlias | undefined> {
  const fromStop = paint.gradientStops[stopIndex]?.boundVariables?.color;
  if (fromStop) return fromStop;

  const styleId = getStyleId(node, field);
  if (!styleId) return undefined;

  const style = await styleCache.getPaintStyle(styleId);
  if (!style) return undefined;

  const stylePaint = style.paints[paintIndex];
  if (
    stylePaint &&
    (stylePaint.type === 'GRADIENT_LINEAR' ||
      stylePaint.type === 'GRADIENT_RADIAL' ||
      stylePaint.type === 'GRADIENT_ANGULAR' ||
      stylePaint.type === 'GRADIENT_DIAMOND')
  ) {
    return stylePaint.gradientStops[stopIndex]?.boundVariables?.color;
  }

  return undefined;
}
