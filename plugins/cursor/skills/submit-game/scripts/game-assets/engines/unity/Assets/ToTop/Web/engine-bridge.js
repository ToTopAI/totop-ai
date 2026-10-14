(function () {
  'use strict';
  const subscriptions = [], events = new Set();
  window.ToTopGameEngine = {
    async invoke(raw, callback) {
      let id = '';
      try {
        const input = JSON.parse(raw); id = input.id;
        if (typeof id !== 'string' || id.length > 100 || typeof input.method !== 'string') throw Error('INVALID_REQUEST');
        let result;
        if (input.method === 'init') {
          result = await window.ToTopGame.init(input.args || {});
          if (!subscriptions.length) for (const name of ['pauseChanged','audioChanged','playerChanged','capabilitiesChanged','viewportChanged','deviceChanged']) subscriptions.push(window.ToTopGame.on(name, data => { for (const listener of events) listener(JSON.stringify({ name, data })); }));
        } else if (input.method === 'context') result = window.ToTopGame.getContext();
        else result = await window.ToTopGame.invoke(input.method, input.args || {});
        callback(JSON.stringify({ id, ok: true, resultJson: JSON.stringify(result ?? null) }));
      } catch (error) { callback(JSON.stringify({ id, ok: false, code: /^[A-Z_]{1,80}$/.test(error.code || error.message) ? error.code || error.message : 'SDK_OPERATION_FAILED' })); }
    },
    onEvent(callback) { events.add(callback); },
    offEvent(callback) { events.delete(callback); },
  };
})();
