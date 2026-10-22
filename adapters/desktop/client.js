import logo from './assets/totop-icon.png'
import { createPluginCard, DETAIL_CSS } from './detail-view.js'
import { createGameView, GAME_CSS } from './game-view.js'
import { installPluginLabels } from './plugin-labels.js'

window.__ModuleLoader__.load({ id: 'totop-ai-desktop', factory: require => {
  const React = require('react')
  const Card = createPluginCard(React)
  const GameView = createGameView(React)
  const exports = { inject: ['slots'] }
  exports.apply = ctx => {
    // Harness supplies the container; the plugin owns all ToTop presentation.
    ctx.effect(() => {
      const style = document.createElement('style')
      const artwork = ':is([data-plugin-item="totop-ai"], [data-plugin-item-detail="totop-ai"]) [class$="_cardIcon"]'
      style.textContent = `${artwork} { background: url("${logo}") center / 32px 32px no-repeat; } ${artwork} > svg { display: none; }` + DETAIL_CSS + GAME_CSS
      document.head.append(style)
      const stopLabels = installPluginLabels(document)
      return () => { stopLabels(); style.remove() }
    })
    ctx.effect(() => ctx.slots.inject('plugins.item', () => ctx.slots.register({ name:'plugins.item', id:'totop-ai', order:5, label:()=>'ToTop' }, Card)))
    const readGame = async (sessionId, signal) => {
      const response = await fetch('/totop-plugin/current-game?sessionId=' + encodeURIComponent(sessionId), { signal, credentials: 'same-origin', cache: 'no-store' })
      if (!response.ok) throw Error('game_status_unavailable')
      return response.json()
    }
    ctx.inject(['locale'], owner => {
      owner.slots.inject('conversation.view', () => owner.slots.register({
        name: 'conversation.view', id: 'totop-current-game', order: 30,
        label: () => owner.locale.getSnapshot().active.startsWith('zh') ? '当前游戏' : 'Current game',
        inject: () => ({ readGame }),
      }, GameView))
    })
  }
  return exports
} })
