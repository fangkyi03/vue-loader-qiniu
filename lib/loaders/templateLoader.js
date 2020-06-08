const qs = require('querystring')
const loaderUtils = require('loader-utils')
const { compileTemplate } = require('@vue/component-compiler-utils')
const babylon = require('babylon')
const traverse = require('babel-traverse').default
const babelTypes = require('babel-types')
const babel = require('babel-core')
const p = require('path')
// Loader that compiles raw template into JavaScript functions.
// This is injected by the global pitcher (../pitch) for template
// selection requests initiated from vue files.
module.exports = function (source) {
  const loaderContext = this
  const query = qs.parse(this.resourceQuery.slice(1))

  // although this is not the main vue-loader, we can get access to the same
  // vue-loader options because we've set an ident in the plugin and used that
  // ident to create the request for this loader in the pitcher.
  const options = loaderUtils.getOptions(loaderContext) || {}
  const { id } = query
  const isServer = loaderContext.target === 'node'
  const isProduction = options.productionMode || loaderContext.minimize || process.env.NODE_ENV === 'production'
  const isFunctional = query.functional

  // allow using custom compiler via options
  const compiler = options.compiler || require('vue-template-compiler')

  const compilerOptions = Object.assign({
    outputSourceRange: true
  }, options.compilerOptions, {
    scopeId: query.scoped ? `data-v-${id}` : null,
    comments: query.comments
  })

  // for vue-component-compiler
  const finalOptions = {
    source,
    filename: this.resourcePath,
    compiler,
    compilerOptions,
    // allow customizing behavior of vue-template-es2015-compiler
    transpileOptions: options.transpileOptions,
    transformAssetUrls: options.transformAssetUrls || true,
    isProduction,
    isFunctional,
    optimizeSSR: isServer && options.optimizeSSR !== false,
    prettify: options.prettify
  }

  const compiled = compileTemplate(finalOptions)

  // tips
  if (compiled.tips && compiled.tips.length) {
    compiled.tips.forEach(tip => {
      loaderContext.emitWarning(typeof tip === 'object' ? tip.msg : tip)
    })
  }

  // errors
  if (compiled.errors && compiled.errors.length) {
    // 2.6 compiler outputs errors as objects with range
    if (compiler.generateCodeFrame && finalOptions.compilerOptions.outputSourceRange) {
      // TODO account for line offset in case template isn't placed at top
      // of the file
      loaderContext.emitError(
        `\n\n  Errors compiling template:\n\n` +
        compiled.errors.map(({ msg, start, end }) => {
          const frame = compiler.generateCodeFrame(source, start, end)
          return `  ${msg}\n\n${pad(frame)}`
        }).join(`\n\n`) +
        '\n'
      )
    } else {
      loaderContext.emitError(
        `\n  Error compiling template:\n${pad(compiled.source)}\n` +
          compiled.errors.map(e => `  - ${e}`).join('\n') +
          '\n'
      )
    }
  }

  const { code } = compiled
  const ast = babylon.parse(code);
  traverse(ast, {
    CallExpression(path) {
      const argumentsArr = path.node.arguments
      const currentCallee = path.node.callee
      if (currentCallee.type == 'Identifier' && currentCallee.name == 'require') {
        if (argumentsArr.some((e) => e.type == 'StringLiteral')) {
          const currentValue = argumentsArr[0].value
          const newFilePath = p.join(finalOptions.filename, '../' + currentValue)
          const fileName = newFilePath.split('/').slice(-2).join('/')
          const url = '七牛云路径/' + fileName
          global.imageArr.push({
            path: newFilePath,
            fileName
          })
          path.replaceWith(babelTypes.stringLiteral(url))
        }
      }
    }
  });
  const result = babel.transformFromAst(ast, code, {});
  // finish with ESM exports
  return result.code + `\nexport { render, staticRenderFns }`
}

function pad (source) {
  return source
    .split(/\r?\n/)
    .map(line => `  ${line}`)
    .join('\n')
}
