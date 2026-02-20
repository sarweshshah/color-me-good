export interface TokenInfo {
  tokenName: string;
  tokenCollection: string;
  libraryName: string | null;
  isLibraryVariable: boolean;
  styleName?: string;
  styleId?: string;
}

export async function resolveVariableBinding(
  boundVariable: VariableAlias | VariableAlias[] | undefined
): Promise<TokenInfo | null> {
  if (!boundVariable) return null;

  const alias = Array.isArray(boundVariable) ? boundVariable[0] : boundVariable;
  if (!alias || alias.type !== 'VARIABLE_ALIAS') return null;

  try {
    const variable = await figma.variables.getVariableByIdAsync(alias.id);
    if (!variable) return null;

    const collection = await figma.variables.getVariableCollectionByIdAsync(
      variable.variableCollectionId
    );

    let libraryName: string | null = null;
    if (variable.remote && collection) {
      try {
        const libCollections = await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
        const match = libCollections.find((lc) => lc.key === collection.key);
        if (match) libraryName = match.libraryName;
      } catch {}
    }

    return {
      tokenName: variable.name,
      tokenCollection: collection?.name ?? 'Unknown Collection',
      libraryName,
      isLibraryVariable: variable.remote,
    };
  } catch (error) {
    console.warn('Failed to resolve variable:', error);
    return null;
  }
}

export async function resolveStyleBinding(
  styleId: string | undefined
): Promise<TokenInfo | null> {
  if (!styleId || typeof styleId !== 'string') return null;

  try {
    const style = await figma.getStyleByIdAsync(styleId);
    if (!style) return null;

    return {
      tokenName: style.name,
      tokenCollection: 'Styles',
      libraryName: null,
      isLibraryVariable: style.remote,
      styleName: style.name,
      styleId: style.id,
    };
  } catch (error) {
    console.warn('Failed to resolve style:', error);
    return null;
  }
}
