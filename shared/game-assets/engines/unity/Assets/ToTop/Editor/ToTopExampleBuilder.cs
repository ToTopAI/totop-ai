using System;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEditor.Build.Reporting;
using UnityEngine;
public static class ToTopExampleBuilder {
    [MenuItem("ToTop/Create SDK example scene")]
    public static void CreateScene() {
        var scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene);
        new GameObject("ToTopGameBridge").AddComponent<ToTop.SDK.ToTopGame>();
        new GameObject("SDK Example").AddComponent<ToTopExample>();
        var camera = new GameObject("Camera").AddComponent<Camera>(); camera.backgroundColor = new Color(0.03f,0.08f,0.1f); camera.clearFlags = CameraClearFlags.SolidColor;
        const string scenePath = "Assets/ToTop/Example.unity"; EditorSceneManager.SaveScene(scene, scenePath);
        EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(scenePath,true) };
        PlayerSettings.WebGL.template = "PROJECT:ToTop";
        // The platform's static runtime serves exported files without rewriting
        // their encoding. Raw assets keep the example portable across hosts.
        PlayerSettings.WebGL.compressionFormat = WebGLCompressionFormat.Disabled;
    }
    // Explicit CI entry. Requires a licensed editor and WebGL build module.
    public static void Build() {
        CreateScene(); string output = null;
        var args = Environment.GetCommandLineArgs();
        for (int i=0;i<args.Length-1;i++) if (args[i]=="-totopBuildPath") output=args[i+1];
        if (String.IsNullOrEmpty(output)) throw new ArgumentException("-totopBuildPath required");
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions { scenes = new[] { "Assets/ToTop/Example.unity" }, locationPathName = output, target = BuildTarget.WebGL, options = BuildOptions.None });
        if (report.summary.result != BuildResult.Succeeded) throw new InvalidOperationException("Unity WebGL export failed");
    }
}
