import test from 'tape'

import { SameProducts } from '../src/SameProducts'

test('getFilterCount', async t => {
  const sp = new SameProducts(
    [
      'Пол',
      'Вид товара',
      'Форма',
      'Форма (псевдоним)',
      'Размер',
      'Цвет основной',
      'Материал основной',
      'Отделения'
    ],
    18
  )

  const count = await sp.getFilterCount([
    'Женский',
    'Сумка',
    'Квадратная / прямоугольная',
    'Планшет',
    'S (small)',
    'Черный',
    'Натуральная замша',
    '3 отдела'
  ])

  t.ok(count)
})

test('getFilterAttributes', async t => {
  const sp = new SameProducts(
    [
      'Пол',
      'Вид товара',
      'Форма',
      'Форма (псевдоним)',
      'Размер',
      'Цвет основной',
      'Материал основной',
      'Отделения'
    ],
    18
  )

  const result = await sp.getFilterAttributes(
    [
      'Женский',
      'Сумка',
      'Квадратная / прямоугольная',
      'Планшет',
      'S (small)',
      'Черный',
      'Натуральная замша',
      '3 отдела'
    ],
    15
  )

  t.ok(result.filter)
})

test.only('getProductCodes', async t => {
  const sp = new SameProducts(
    [
      'Пол',
      'Вид товара',
      'Форма',
      'Форма (псевдоним)',
      'Размер',
      'Цвет основной',
      'Материал основной',
      'Отделения'
    ],
    18
  )

  const result = await sp.getFilterAttributes(
    [
      'Женский',
      'Сумка',
      'Квадратная / прямоугольная',
      'Планшет',
      'S (small)',
      'Черный',
      'Натуральная замша',
      '3 отдела'
    ],
    15
  )

  const codes = await sp.getProductCodes(result.filter)

  t.ok(codes)
})
