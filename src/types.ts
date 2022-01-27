export interface Product {
  code: string
}

export interface Attribute {
  title: string
}

export interface ProductAttribute extends Attribute {
  value: string
}

export interface FacetItem {
  title: string
  productCount: number
}

export interface Facet {
  getParent(): Facet
  getProducts(): Promise<Product[]>
}

export interface FacetStrore {
  getFacet(filter: ProductAttribute[]): Facet
}
