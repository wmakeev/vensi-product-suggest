import { Ecwid, EcwidOptions } from '@wmakeev/ecwid'
import memoize from 'lodash.memoize'
import fetch from 'node-fetch'

export * from '@wmakeev/ecwid'

export const getInstance = memoize(
  (_?: string, options: EcwidOptions = { fetch }) => {
    const { ECWID_STORE_ID, ECWID_TOKEN_SECRET } = process.env

    if (!ECWID_STORE_ID) {
      throw new Error('Переменная окружения ECWID_STORE_ID не определена')
    }

    if (!ECWID_TOKEN_SECRET) {
      throw new Error('Переменная окружения ECWID_TOKEN_SECRET не определена')
    }

    return new Ecwid(ECWID_STORE_ID, ECWID_TOKEN_SECRET, options)
  },
  instanceName => instanceName ?? 'default'
)
