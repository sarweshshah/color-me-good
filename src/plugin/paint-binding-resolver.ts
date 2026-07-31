type PaintBindingField = 'fills' | 'strokes';

export interface NodePaintStyles {
  fills: PaintStyle | null;
  strokes: PaintStyle | null;
}

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

  async prefetchStyles(styleIds: Iterable<string>): Promise<void> {
    const pending = Array.from(styleIds).filter((id) => !this.styleCache.has(id));
    if (pending.length === 0) return;
    await Promise.all(pending.map((id) => this.getPaintStyle(id)));
  }

  getCachedStyle(styleId: string): PaintStyle | null | undefined {
    return this.styleCache.get(styleId);
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

export async function resolveSolidPaintBinding(
  node: SceneNode,
  field: PaintBindingField,
  paintIndex: number,
  paint: SolidPaint,
  styleCache: StyleResolverCache
): Promise<VariableAlias | undefined> {
  const styles = await loadNodePaintStyles(node, styleCache);
  return resolveSolidPaintBindingFromStyles(node, field, paintIndex, paint, styles);
}

export function resolveSolidPaintBindingFromStyles(
  node: SceneNode,
  field: PaintBindingField,
  paintIndex: number,
  paint: SolidPaint,
  styles: NodePaintStyles
): VariableAlias | undefined {
  const fromNode = firstAlias(node.boundVariables?.[field]?.[paintIndex]);
  if (fromNode) return fromNode;

  const fromPaint = paint.boundVariables?.color;
  if (fromPaint) return fromPaint;

  const style = field === 'fills' ? styles.fills : styles.strokes;
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
  const styles = await loadNodePaintStyles(node, styleCache);
  return resolveGradientStopBindingFromStyles(
    node,
    field,
    paintIndex,
    stopIndex,
    paint,
    styles
  );
}

export function resolveGradientStopBindingFromStyles(
  _node: SceneNode,
  field: PaintBindingField,
  paintIndex: number,
  stopIndex: number,
  paint: GradientPaint,
  styles: NodePaintStyles
): VariableAlias | undefined {
  const fromStop = paint.gradientStops[stopIndex]?.boundVariables?.color;
  if (fromStop) return fromStop;

  const style = field === 'fills' ? styles.fills : styles.strokes;
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

export async function loadNodePaintStyles(
  node: SceneNode,
  styleCache: StyleResolverCache
): Promise<NodePaintStyles> {
  const fillStyleId = getFillStyleId(node);
  const strokeStyleId = getStrokeStyleId(node);

  const [fills, strokes] = await Promise.all([
    fillStyleId ? styleCache.getPaintStyle(fillStyleId) : Promise.resolve(null),
    strokeStyleId ? styleCache.getPaintStyle(strokeStyleId) : Promise.resolve(null),
  ]);

  return { fills, strokes };
}
