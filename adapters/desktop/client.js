import logo from './assets/totop-icon.png'

window.__ModuleLoader__.load({ id: 'totop-ai-desktop', factory: require => {
  const React = require('react')
  const exports = { inject: ['slots'] }
  exports.apply = ctx => {
    // Harness supplies the container; the plugin owns all ToTop presentation.
    ctx.effect(() => {
      const style = document.createElement('style')
      const artwork = ':is([data-plugin-item="totop-ai"], [data-plugin-item-detail="totop-ai"]) [class$="_cardIcon"]'
      style.textContent = `${artwork} { background: url("${logo}") center / 32px 32px no-repeat; } ${artwork} > svg { display: none; }`
      document.head.append(style)
      const names = { 'include:totop-ai': 'ToTop', 'include:totop-platform-llm': 'ToTop AI 连接' }
      function update() {
        for (const [id, name] of Object.entries(names)) {
          for (const card of document.querySelectorAll(`[data-plugin-entry="${id}"]`)) {
            const module = card.getAttribute('data-plugin-module')
            const title = card.querySelector('strong')
            if (title && title.textContent !== name) title.textContent = name
            const button = card.querySelector('button')
            const label = button?.getAttribute('aria-label')
            if (label && module && label.startsWith(module)) button.setAttribute('aria-label', name + label.slice(module.length))
            const fact = card.querySelector('dl > div:first-child')
            if (fact) {
              const label = fact.querySelector('dt'), value = fact.querySelector('dd')
              if (label && label.textContent !== '插件名称') label.textContent = '插件名称'
              if (value) {
                value.title = module || ''
                if (value.textContent !== name) value.textContent = name
              }
            }
          }
        }
      }
      update()
      const observer = new MutationObserver(update)
      observer.observe(document.body, { childList: true, subtree: true, characterData: true })
      return () => { observer.disconnect(); style.remove() }
    })
    function Card({ view }) {
      const [state, setState] = React.useState(null)
      React.useEffect(() => {
        let active = true
        window.totopCreatorPlugin?.status().then(value => { if (active) setState(value) }).catch(() => {})
        return () => { active = false }
      }, [])
      if (view === 'summary') return React.createElement('span', null, 'ToTop 游戏创作、试玩、投稿与发布 · 内置插件 · 自动更新')
      return React.createElement('div', { style: { display:'grid', gap:12 } },
        React.createElement('p', null, '当前版本：' + (state?.version || '正在读取')),
        React.createElement('p', null, state?.source === 'official-release' ? '来源：ToTop 官方 GitHub Release' : '来源：客户端内置的已验证启动版本'),
        React.createElement('p', null, state?.updateStatus === 'staged' ? '新版已下载，下次启动自动启用。' : state?.updateStatus === 'failed' ? '暂时无法检查更新，继续使用当前版本。' : '自动检查官方版本，校验后在下次启动启用。'),
        React.createElement('button', { onClick: async () => { const value = await window.totopCreatorPlugin?.check(); setState(value) } }, '检查更新'),
        React.createElement('p', null, '仅使用客户端授权的项目目录。准备或上传材料不代表投稿授权。'))
    }
    ctx.effect(() => ctx.slots.inject('plugins.item', () => ctx.slots.register({ name:'plugins.item', id:'totop-ai', order:5, label:()=>'ToTop' }, Card)))
  }
  return exports
} })
