import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Helmet from 'react-helmet'
import chunkSorter from 'html-webpack-plugin/lib/chunksorter.js'

class HelmetWebpackPlugin {
  options = {
    chunks: 'all',
    excludeChunks: [],
    chunksSortMode: 'auto',
    filename: 'index.html',
    props: {
      htmlAttributes: {},
      title: 'Title',
      defaultTitle: 'Default Title',
      titleTemplate: '%s - Webpack App',
      meta: [],
      link: [],
      script: [],
      style: []
    },
    root: <div id='root' />
  }

  /**
   * @param options
   */
  constructor (options) {
    this.options = {
      ...this.options,
      ...options
    }
  }

  /**
   * @param compiler
   */
  apply (compiler) {
    compiler.plugin('emit', (compilation, callback) => {
      let stats = compilation.getStats().toJson()
      let chunks = this.sortChunks(this.filterChunks(stats))
      let scripts = this.getScripts(chunks)
        .map((asset, i) => <script key={i} type='text/javascript' src={`/${asset}`} />)
      let styles = this.getStyles(chunks)
        .map(asset => ({
          rel: 'stylesheet',
          href: `${asset}`
        }))
      let props = {
        ...this.options.props,
        link: [
          ...this.options.props.link,
          ...styles
        ]
      }

      renderToStaticMarkup((<Helmet {...props} />))

      let head = Helmet.rewind()
      let root = typeof this.options.root === 'string'
        ? <div id={this.options.root} />
        : this.options.root
      let html = renderHtmlLayout(head, [root, scripts])

      this.addToAssets(html, compilation)

      callback()
    })
  }

  /**
   * Return an array of filenames matching the given extension
   *
   * @param ext
   * @param chunks
   */
  extractAssetsByExtension (extension, chunks) {
    let assets = []

    chunks.forEach(chunk => {
      let files = Array.isArray(chunk.files) ? chunk.files : [chunk.files]
      assets = Array.concat(assets, files.filter(file => new RegExp('.(' + extension + ')$').test(file)))
    })

    return assets
  }

  /**
   * Shortcut - get 'js' files from the given chunks
   *
   * @param chunks
   */
  getScripts (chunks) {
    return this.extractAssetsByExtension('js', chunks)
  }

  /**
   * Shortcut - get 'css' files from the given chunks
   *
   * @param chunks
   */
  getStyles (chunks) {
    return this.extractAssetsByExtension('css', chunks)
  }

  /**
   * Add output to compilation assets
   *
   * @param content
   * @param assets
   * @returns {*}
   */
  addToAssets (content, assets) {
    assets.assets[this.options.filename] = {
      size () {
        return content.length
      },
      source () {
        return content
      }
    }
  }

  /**
   * Helper to sort chunks
   * credits: https://github.com/ampedandwired/html-webpack-plugin/blob/master/index.js
   *
   * @param chunks
   * @returns {*}
   */
  sortChunks (chunks) {
    // Custom function
    if (typeof this.options.chunksSortMode === 'function') {
      return chunks.sort(this.options.chunksSortMode)
    }
    // Disabled sorting:
    if (this.options.chunksSortMode === 'none') {
      return chunkSorter.none(chunks)
    }
    // Check if the given sort mode is a valid chunkSorter sort mode
    if (typeof chunkSorter[this.options.chunksSortMode] !== 'undefined') {
      return chunkSorter[this.options.chunksSortMode](chunks)
    }
    throw new Error('"' + this.options.chunksSortMode + '" is not a valid chunk sort mode')
  }

  /**
   * Return all chunks from the compilation result which match the exclude and include filters
   * credits: https://github.com/ampedandwired/html-webpack-plugin/blob/master/index.js
   *
   * @param webpackStatsJson
   * @returns {*}
   */
  filterChunks (webpackStatsJson) {
    return webpackStatsJson.chunks.filter(chunk => {
      var chunkName = chunk.names[0]
      // This chunk doesn't have a name. This script can't handled it.
      if (chunkName === undefined) {
        return false
      }
      // Skip if the chunk should be lazy loaded
      if (!chunk.initial) {
        return false
      }
      // Skip if the chunks should be filtered and the given chunk was not added explicity
      if (Array.isArray(this.options.chunks) && this.options.chunks.indexOf(chunkName) === -1) {
        return false
      }
      // Skip if the chunks should be filtered and the given chunk was excluded explicity
      if (Array.isArray(this.options.excludeChunks) && this.options.excludeChunks.indexOf(chunkName) !== -1) {
        return false
      }
      // Add otherwise
      return true
    })
  }
}

export default HelmetWebpackPlugin

/**
 * Render the HTML layout
 *
 * @param head
 * @param body
 * @param scripts
 * @returns {string}
 */
export function renderHtmlLayout (head, body) {
  return '<!DOCTYPE html>' +
    renderToStaticMarkup(
      <html {...head.htmlAttributes.toComponent()}>
        <head>
          {head.title.toComponent()}
          {head.meta.toComponent()}
          {head.base.toComponent()}
          {head.link.toComponent()}
          {head.script.toComponent()}
          {head.style.toComponent()}
        </head>
        <body>
          {body}
        </body>
      </html>
    )
}
