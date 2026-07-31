export interface TokenInfo {
  tokenName: string;
  tokenCollection: string;
  libraryName: string | null;
  isLibraryVariable: boolean;
}

export class VariableResolverCache {
  private variableCache = new Map<string, Variable | null>();
  private collectionCache = new Map<string, VariableCollection | null>();
  private libCollections: LibraryVariableCollection[] | null = null;
  private tokenInfoCache = new Map<string, TokenInfo | null>();

  async resolve(
    boundVariable: VariableAlias | VariableAlias[] | undefined
  ): Promise<TokenInfo | null> {
    if (!boundVariable) return null;

    const alias = Array.isArray(boundVariable) ? boundVariable[0] : boundVariable;
    if (!alias || alias.type !== 'VARIABLE_ALIAS') return null;

    const cached = this.tokenInfoCache.get(alias.id);
    if (cached !== undefined) return cached;

    try {
      let variable = this.variableCache.get(alias.id);
      if (variable === undefined) {
        variable = await figma.variables.getVariableByIdAsync(alias.id);
        this.variableCache.set(alias.id, variable);
      }
      if (!variable) {
        this.tokenInfoCache.set(alias.id, null);
        return null;
      }

      let collection = this.collectionCache.get(variable.variableCollectionId);
      if (collection === undefined) {
        collection = await figma.variables.getVariableCollectionByIdAsync(
          variable.variableCollectionId
        );
        this.collectionCache.set(variable.variableCollectionId, collection);
      }

      let libraryName: string | null = null;
      if (variable.remote && collection) {
        try {
          if (!this.libCollections) {
            this.libCollections =
              await figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync();
          }
          const matchByKey = this.libCollections.find((lc) => lc.key === collection!.key);
          const match = matchByKey ?? this.libCollections.find((lc) => lc.name === collection!.name);
          if (match) libraryName = match.libraryName;
        } catch (_e) {
          // Library name only available when library is published and enabled in file
        }
      }

      const result: TokenInfo = {
        tokenName: variable.name,
        tokenCollection: collection?.name ?? 'Unknown Collection',
        libraryName,
        isLibraryVariable: variable.remote,
      };
      this.tokenInfoCache.set(alias.id, result);
      return result;
    } catch (error) {
      console.warn('Failed to resolve variable:', error);
      this.tokenInfoCache.set(alias.id, null);
      return null;
    }
  }

  resolveCached(
    boundVariable: VariableAlias | VariableAlias[] | undefined
  ): TokenInfo | null | undefined {
    if (!boundVariable) return null;

    const alias = Array.isArray(boundVariable) ? boundVariable[0] : boundVariable;
    if (!alias || alias.type !== 'VARIABLE_ALIAS') return null;

    if (!this.tokenInfoCache.has(alias.id)) return undefined;
    return this.tokenInfoCache.get(alias.id) ?? null;
  }

  async prefetchVariables(variableIds: Iterable<string>): Promise<void> {
    const pending = Array.from(variableIds).filter((id) => !this.tokenInfoCache.has(id));
    if (pending.length === 0) return;
    await Promise.all(
      pending.map((id) => this.resolve({ type: 'VARIABLE_ALIAS', id }))
    );
  }
}

export async function resolveVariableBinding(
  boundVariable: VariableAlias | VariableAlias[] | undefined,
  cache?: VariableResolverCache
): Promise<TokenInfo | null> {
  if (cache) return cache.resolve(boundVariable);

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
