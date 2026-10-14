mergeInto(LibraryManager.library, {
  ToTop_Invoke: function (raw) {
    window.ToTopGameEngine.invoke(UTF8ToString(raw), function (result) {
      window.totopUnityQueue = window.totopUnityQueue || [];
      if (window.totopUnity) window.totopUnity.SendMessage('ToTopGameBridge', 'OnResult', result);
      else window.totopUnityQueue.push(['OnResult', result]);
    });
  },
  ToTop_Subscribe: function () {
    window.ToTopGameEngine.onEvent(function (result) {
      window.totopUnityQueue = window.totopUnityQueue || [];
      if (window.totopUnity) window.totopUnity.SendMessage('ToTopGameBridge', 'OnPlatformEvent', result);
      else window.totopUnityQueue.push(['OnPlatformEvent', result]);
    });
  }
});
