export interface ProductManifest {
  readonly key: string;
  readonly name: string;
  readonly categoryKey: string;
  readonly taglineKey: string;
  readonly promiseKey: string;
  readonly apiNamespace: string;
}
export const PRODUCT: ProductManifest = {
  key: 'fire-safe',
  name: 'OdivonFireSafe',
  categoryKey: 'product.category',
  taglineKey: 'product.tagline',
  promiseKey: 'product.promise',
  apiNamespace: '/api/v1/fire-safe',
};
