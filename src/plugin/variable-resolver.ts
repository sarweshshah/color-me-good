export interface TokenInfo {
  tokenName: string;
  tokenCollection: string;
  libraryName: string | null;
  isLibraryVariable: boolean;
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
        const matchByKey = libCollections.find((lc) => lc.key === collection.key);
        const match = matchByKey ?? libCollections.find((lc) => lc.name === collection.name);
        if (match) libraryName = match.libraryName;
      } catch (_e) {
        // Library name only available when library is published and enabled in file
      }
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
