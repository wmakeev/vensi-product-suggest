import { getInstance } from 'moysklad-instance'
import { SameProducts } from './SameProducts'
import {
  Collection,
  Attribute,
  AttributeType,
  Product
} from 'moysklad-api-model'
import { getTimeString, QueryFilter, QueryObject } from 'moysklad'
import { getHelpers } from 'moysklad-helpers'

const MAX_SAME_PRODUCTS = 18

const PRODUCT_ATTRIBUTES_BY_FILTER_HEAD: Record<string, string[]> = {
  'Женский,Сумка': [
    'Пол',
    'Вид товара',
    'Способ ношения',
    'Форма (псевдоним)',
    'Размер',
    'Цвет основной',
    'Материал основной',
    'Каркас',
    'Отделения',
    'Принт',
    'Декор'
  ]
}

const CUSTOM_VALUES: Record<string, Record<string, string>> = {
  'Вид товара': {
    Сумка:
      'entity/customentity/61ca8448-03ed-4821-b163-6825f266c3e0/29ada2a5-eb39-11e9-0a80-03b7001c7e4e'
  },
  'Пол': {
    Женский:
      'entity/customentity/935ce68c-ea5a-11e9-0a80-0428000d32de/d932c964-ea5a-11e9-0a80-069d000d489f'
  }
}

const КОД_ECWID_ID = '42b8ba18-c2f4-11eb-0a80-093a0012db0c'

const ПОХОЖИЕ_ТОВАРЫ_ECWID =
  'entity/product/metadata/attributes/3c989d0b-7c4e-11ec-0a80-044a00223152'

const ПОХОЖИЕ_ТОВАРЫ_ECWID_ОБНОВЛЕНО =
  'entity/product/metadata/attributes/f94034e3-7c56-11ec-0a80-0992002268cf'

const НАЛИЧИЕ_У_ПОСТАВЩИКА =
  'entity/product/metadata/attributes/d5db916f-464d-11e5-7a40-e8970004aecf'

const В_НАЛИЧИИ =
  'entity/customentity/711ec6d1-464c-11e5-7a40-e89700047c68/8fad0627-464c-11e5-90a2-8ecb000419d6'

export function shuffle<T>(arr: T[]): T[] {
  let currentIndex = arr.length
  let randomIndex

  // While there remain elements to shuffle...
  while (currentIndex !== 0) {
    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex)
    currentIndex--

    // And swap it with the current element.
    ;[arr[currentIndex], arr[randomIndex]] = [
      arr[randomIndex]!,
      arr[currentIndex]!
    ]
  }

  return arr
}

export async function fillSameProducts(filterHead: string[]) {
  const headKey = filterHead.join()

  const attributes = PRODUCT_ATTRIBUTES_BY_FILTER_HEAD[headKey]

  if (!attributes) {
    throw new Error(`Не найдены атрибуты для "${headKey}"`)
  }

  const ms = await getInstance()

  const { href, attr } = getHelpers(ms)

  // FIXME Typings
  const metadata = (await ms.GET(
    'entity/product/metadata/attributes'
  )) as any as Collection<Attribute>

  const msAttributes = attributes.map(
    a => metadata.rows.find(r => r.name === a)!
  )

  const productFilter: QueryFilter = {
    archived: false,

    [href(НАЛИЧИЕ_У_ПОСТАВЩИКА)]: href(В_НАЛИЧИИ),

    [href(ПОХОЖИЕ_ТОВАРЫ_ECWID_ОБНОВЛЕНО)]: { $exists: false },

    ...msAttributes.reduce((res, attr, index) => {
      res[attr.meta.href] =
        filterHead[index] != null
          ? {
              // FIXME Заглушка. Сделать по человечески.
              $eq: href(CUSTOM_VALUES[attributes[index]!]![filterHead[index]!])
            }
          : { $exists: true }

      return res
    }, {} as Record<string, QueryObject>)
  }

  const sameProducts = new SameProducts(attributes, MAX_SAME_PRODUCTS)

  let totalUpdated = 0

  while (true) {
    const sampleProducts = await ms.GET('entity/product', {
      filter: productFilter,
      limit: 1
    })

    if (sampleProducts.rows.length === 0) {
      console.log('Нет товаров для обновления')
      break
    }

    const sampleProduct = sampleProducts.rows[0]!

    const filterValues = attributes.map(a => {
      const msAttr = sampleProduct.attributes.find(attr => attr.name === a)

      if (!msAttr) return null

      if (msAttr.type === AttributeType.CustomEntity) {
        return msAttr.value.name
      } else {
        return null
      }
    })

    const filterAttr = await sameProducts.getFilterAttributes(filterValues)

    const products: Product[] = []

    const ecwidProductsIds: number[] = []

    if (filterAttr.count > 0) {
      const { ids, codes } = await sameProducts.getProductCodes(
        filterAttr.filter
      )

      if (codes.length > 0) {
        const productsColl = await ms.GET('entity/product', {
          filter: {
            code: codes
          },
          limit: codes.length
        })

        products.push(...productsColl.rows)

        ecwidProductsIds.push(...ids)
      }
    }

    if (!products.some(p => p.id === sampleProduct.id)) {
      products.push(sampleProduct)
    }

    const additionEcwidProductsIds: number[] = []

    if (ecwidProductsIds.length < MAX_SAME_PRODUCTS) {
      const { ids } = await sameProducts.getProductCodes(
        filterAttr.filter.slice(0, -1),
        100
      )

      additionEcwidProductsIds.push(...ids)
    }

    const patches = products.map(p => {
      const ecwidIdStr = p.attributes.find(a => a.id === КОД_ECWID_ID)
        ?.value as string | undefined

      const ecwidId = ecwidIdStr ? Number.parseInt(ecwidIdStr) : null

      const sameProductsIds = [
        ...new Set([...ecwidProductsIds, ...shuffle(additionEcwidProductsIds)])
      ]
        .filter(id => id !== ecwidId)
        .slice(0, MAX_SAME_PRODUCTS)

      return {
        meta: p.meta,
        attributes: [
          attr(ПОХОЖИЕ_ТОВАРЫ_ECWID, sameProductsIds.join()),
          attr(ПОХОЖИЕ_ТОВАРЫ_ECWID_ОБНОВЛЕНО, getTimeString(new Date()))
        ]
      }
    })

    if (patches.length > 0) {
      const result = await ms.POST('entity/product', patches)

      totalUpdated += result.length
    } else {
      console.log('Нет товаров для обновления')
    }

    console.log(
      `${totalUpdated} products updated (${sampleProducts.meta.size} elapsed)`
    )
  }
}
