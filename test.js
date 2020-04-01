const Denque = require('denque')

async function *getAllProducts(limit = 250, filterIds = [], fields = 'id,variants,images,options') {
  let cursor = null
  let hasNextPage = true
  const buffer = new Denque()

  while (hasNextPage || buffer.length > 0) {
    if (hasNextPage) {
      const isFirstPage = cursor !== null
      const result = isFirstPage ? {
        pageMeta: {},
        products: []
      } : {
        pageMeta: { next: '' },
        products: [10, 20]
      }

      const {
        pageMeta: { next },
        products
      } = result

      if (next === undefined) {
        hasNextPage = false
      } else {
        cursor = next
      }

      if (Array.isArray(products)) {
        buffer.splice(buffer.length, 0, ...products)
      }
    }

    if (buffer.length > 0) {
      yield buffer.remove(0, limit)
    }
  }
}

(async () => {
  for await (const product of getAllProducts()) {
    console.info(product)
  }
})()
