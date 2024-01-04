const esbuild = require('esbuild')

const transformer = {
  process(_content, filename, { transformerConfig }) {
    const { outputFiles } = esbuild.buildSync({
      outdir: "./dist",
      minify: false,
      bundle: false,
      write: false,
      format: /\.m[tj]s$/.test(filename) ? 'esm' : 'cjs',
      sourcemap: 'inline',
      platform: 'node',
      target: 'node20',
      ...transformerConfig,
      entryPoints: [filename],
    })

    const files = outputFiles.reduce((cur, item) => {
      const key = item.path.includes(".map") ? "map" : "code"
      cur[key] = Buffer.from(item.contents).toString()
      return cur
    }, {})

    return files
  },
}

module.exports = transformer
