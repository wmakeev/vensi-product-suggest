import { getInstance, SearchResult, Product } from './ecwid/instance'

const isNotNull = <T>(val: T): val is NonNullable<T> => {
  return val != null
}

export class SameProducts {
  public countCache = new Map<string, number>()
  public productCache = new Map<string, { ids: number[]; codes: string[] }>()

  constructor(public attributes: string[], public maxSameProducts: number) {}

  async getFilterCount(values: Array<string | null>) {
    const valuesKey = values.join()

    const cached = this.countCache.get(valuesKey)

    if (cached !== undefined) {
      return cached
    }

    const ecwid = await getInstance()

    const lastAttr = this.attributes[values.length - 1]

    const lastFilterField = `attribute_${lastAttr}`

    const options = {
      filterFacetLimit: 'all',
      filterParentCategoryId: 0,
      inventory: 'instock',
      filterFields: lastFilterField,
      ...values.filter(isNotNull).reduce((res, val, index) => {
        res[`attribute_${this.attributes[index]}`] = val
        return res
      }, {} as Record<string, string>)
    }

    const resp = (await ecwid.GET('products/filters', options)) as {
      productCount: number
      filters: Record<
        string,
        {
          values: {
            title: string
            productCount: number
          }[]
        }
      >
    }

    const headValues = values.slice(0, -1)

    resp.filters[lastFilterField]?.values.forEach(val => {
      const key = [...headValues, val.title].join()

      console.log(`Filter count "${key}" - ${val.productCount}`)

      this.countCache.set(key, val.productCount)
    })

    return this.countCache.get(valuesKey) ?? 0
  }

  async getFilterAttributes(
    filterValues: Array<string | null>,
    minCount?: number
  ) {
    let i = 1
    while (true) {
      const headValues = filterValues.slice(0, i)

      const count = await this.getFilterCount(headValues)

      if (
        count <= (minCount ?? this.maxSameProducts) ||
        i === filterValues.length
      ) {
        return {
          filter: headValues,
          count
        }
      } else {
        i++
      }
    }
  }

  async getProductCodes(filterValues: Array<string | null>, limit?: number) {
    const valuesKey = filterValues.join()

    const cached = this.productCache.get(valuesKey)

    if (cached !== undefined) {
      return cached
    }

    const ecwid = await getInstance()

    const options = {
      inStock: true,
      limit: limit ?? this.maxSameProducts,
      ...filterValues.filter(isNotNull).reduce((res, val, index) => {
        res[`attribute_${this.attributes[index]}`] = val
        return res
      }, {} as Record<string, string>)
    }

    const resp = await ecwid.GET<SearchResult<Product>>('products', options)

    const ids = resp.items
      .map(it => it.id)
      .filter((it: unknown): it is number => typeof it === 'number')

    const codes = resp.items.map(
      it => it.attributes?.find(a => a.type === 'UPC')?.value ?? null
    )

    const val = {
      ids: ids.filter((_, index) => codes[index] != null),
      codes: codes.filter(isNotNull)
    }

    this.productCache.set(valuesKey, val)

    return val
  }
}
