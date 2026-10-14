using System.IO;
using UnityEditor;
using UnityEditor.Callbacks;
public static class ToTopExport {
    [PostProcessBuild(100)] public static void CopySDK(BuildTarget target, string path) {
        if (target != BuildTarget.WebGL) return;
        foreach (var name in new [] { "totop-game.global.js", "engine-bridge.js" }) File.Copy(Path.Combine("Assets/ToTop/Web", name), Path.Combine(path, name), true);
        if (File.Exists("totop.game.json")) File.Copy("totop.game.json", Path.Combine(path, "totop.game.json"), true);
    }
}
