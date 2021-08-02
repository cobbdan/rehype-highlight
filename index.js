import {lowlight} from 'lowlight'
import {toText} from 'hast-util-to-text'
import {visit} from 'unist-util-visit'

export default function rehypeHighlight(options) {
  var settings = options || {}
  var name = 'hljs'
  var pos

  if (settings.aliases) {
    lowlight.registerAlias(settings.aliases)
  }

  if (settings.languages) {
    // eslint-disable-next-line guard-for-in
    for (const name in settings.languages) {
      lowlight.registerLanguage(name, settings.languages[name])
    }
  }

  if (settings.prefix) {
    pos = settings.prefix.indexOf('-')
    name = pos > -1 ? settings.prefix.slice(0, pos) : settings.prefix
  }

  return transformer

  function transformer(tree) {
    visit(tree, 'element', visitor)
  }

  function visitor(node, _, parent) {
    var props
    var result
    var lang

    if (!parent || parent.tagName !== 'pre' || node.tagName !== 'code') {
      return
    }

    lang = language(node)

    if (
      lang === false ||
      (!lang && settings.subset === false) ||
      (settings.plainText && settings.plainText.indexOf(lang) > -1)
    ) {
      return
    }

    props = node.properties

    if (!props.className) {
      props.className = []
    }

    if (props.className.indexOf(name) < 0) {
      props.className.unshift(name)
    }

    try {
      result = lang
        ? lowlight.highlight(lang, toText(parent), options)
        : lowlight.highlightAuto(toText(parent), options)
    } catch (error) {
      if (!settings.ignoreMissing || !/Unknown language/.test(error.message)) {
        throw error
      }

      result = {type: 'root', data: {}, children: []}
    }

    if (!lang && result.data.language) {
      props.className.push('language-' + result.data.language)
    }

    if (Array.isArray(result.children) && result.children.length > 0) {
      node.children = result.children
    }
  }
}

// Get the programming language of `node`.
function language(node) {
  var className = node.properties.className || []
  var index = -1
  var value

  while (++index < className.length) {
    value = className[index]

    if (value === 'no-highlight' || value === 'nohighlight') {
      return false
    }

    if (value.slice(0, 5) === 'lang-') {
      return value.slice(5)
    }

    if (value.slice(0, 9) === 'language-') {
      return value.slice(9)
    }
  }
}
