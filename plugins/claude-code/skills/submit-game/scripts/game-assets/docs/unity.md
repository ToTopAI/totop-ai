# Unity WebGL SDK

Copy the Unity Assets from the fixed SDK engine package into your project. Select the ToTop WebGL template, add a ToTop.SDK.ToTopGame component to a persistent object, and await Initialize before feature calls. The export hook copies the exact browser SDK, engine bridge and manifest into the build root.

Use Publishing Settings → Compression Format → Disabled for the platform's static runtime. The SDK example builder sets this explicitly. The local preview additionally supports correctly encoded gzip/Brotli exports, but that local success does not establish that a production host supplies the same Content-Encoding headers. Preserve custom compression only after verifying the actual release host.

Initialize, Ready, GameplayStart, GameplayStop, Load and Save have C# methods. Other capabilities call the shared wire method via `Call(method,argsJson)` and return a JSON result string. PlatformEvent contains `{name,data}`. Pause local gameplay on pauseChanged and apply audioChanged as a platform constraint while retaining the game's mute preference. Callback messages queue until the Unity instance exists.

The editor reports WEB_EXPORT_REQUIRED rather than pretending a browser integration passed. Export and test on the actual target browser. Unity editor/licensing and an actual exported sample are required for engine acceptance; wrapper source/building JavaScript alone is not Unity acceptance.

The bundled SDK example was exported with Unity 6.3 LTS 6000.3.26f1 (Apple Silicon) and its Web Build Support module. Browser verification covers C# lifecycle, pointer input, local save/reload and host pause. The simulator serves compressed Unity assets with their correct Content-Encoding and MIME type. This is integration acceptance using software WebGL, not a device performance claim. Use ToTop → Create SDK example scene, then export WebGL with the ToTop template; automated builds can invoke ToTopExampleBuilder.Build with -totopBuildPath.
