# Godot 4 Web SDK

The fixed package contains a GDScript Autoload and a minimal example. Use Compatibility renderer and a Web export with an HTML shell that loads `totop-game.global.js` and `engine-bridge.js` before Godot starts. Keep the JavaScriptBridge callback references alive; the provided Autoload does this.

Wait for ToTop.initialized. Use ready(), gameplay_start(), gameplay_stop(), load_save(), save(), or call_sdk(sharedMethod,args). Results are `{ok,resultJson}` or `{ok:false,code}`. Handle platform_event(name,data) for pause/audio/identity/viewport. Do not label desktop editor simulation as browser acceptance.

Install matching Web export templates and run an actual export/preview before claiming support for a Godot version. C# Godot Web export is not part of this GDScript wrapper.
