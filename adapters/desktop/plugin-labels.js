// Restrict compatibility labels to plugin cards. Chat streaming must not trigger
// full-document queries or character-data observers on every generated token.
const SELECTOR = '[data-plugin-entry="include:totop-ai"], [data-plugin-entry="include:totop-platform-llm"]'
export function installPluginLabels(document, Observer = MutationObserver) {
  function update(cards) {
    const zh = document.documentElement.lang.toLowerCase().startsWith('zh')
    for (const card of cards) {
      const name = card.getAttribute('data-plugin-entry') === 'include:totop-ai' ? 'ToTop' : zh ? 'ToTop AI 连接' : 'ToTop AI connection'
      const module = card.getAttribute('data-plugin-module'), title = card.querySelector('strong')
      if (title && title.textContent !== name) title.textContent = name
      const button = card.querySelector('button'), label = button?.getAttribute('aria-label')
      const prefix = label && [module, 'ToTop AI connection', 'ToTop AI 连接', 'ToTop'].find(value => value && label.startsWith(value))
      if (prefix && label !== name + label.slice(prefix.length)) button.setAttribute('aria-label', name + label.slice(prefix.length))
      const fact = card.querySelector('dl > div:first-child')
      if (fact) {
        const label = fact.querySelector('dt'), value = fact.querySelector('dd'), field = zh ? '插件名称' : 'Plugin'
        if (label && label.textContent !== field) label.textContent = field
        if (value) { value.title = module || ''; if (value.textContent !== name) value.textContent = name }
      }
    }
  }
  const all = () => update(document.querySelectorAll(SELECTOR))
  all()
  const observer = new Observer(records => {
    const cards = new Set()
    for (const record of records) {
      const target = record.target?.closest?.(SELECTOR)
      if (target) cards.add(target)
      for (const node of record.addedNodes || []) {
        if (node.nodeType !== 1) continue
        if (node.matches(SELECTOR)) cards.add(node)
        for (const card of node.querySelectorAll(SELECTOR)) cards.add(card)
      }
    }
    if (cards.size) update(cards)
  })
  observer.observe(document.body, { childList: true, subtree: true })
  const locale = new Observer(all)
  locale.observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] })
  return () => { observer.disconnect(); locale.disconnect() }
}
