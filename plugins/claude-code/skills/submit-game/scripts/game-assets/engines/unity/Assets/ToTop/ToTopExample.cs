using System;
using UnityEngine;
using ToTop.SDK;
public sealed class ToTopExample : MonoBehaviour {
    [Serializable] private class Payload { public int score; }
    [Serializable] private class Save { public Payload payload; public int revision; }
    [Serializable] private class Context { public bool paused; public bool audioEnabled; }
    [Serializable] private class Event { public string name; public bool data; }
    [Serializable] private class EventHeader { public string name; }
    private int score, revision;
    private bool ready, busy, platformPaused;
    private string status = "Connecting to ToTop…";
    private async void Start() {
        try {
            if (ToTopGame.Instance == null) new GameObject("ToTopGameBridge").AddComponent<ToTopGame>();
            ToTopGame.Instance.PlatformEvent += OnPlatformEvent;
            var context = JsonUtility.FromJson<Context>(await ToTopGame.Instance.Initialize());
            platformPaused = context.paused; AudioListener.pause = !context.audioEnabled;
            var raw = await ToTopGame.Instance.Load();
            if (raw != "null") { var save = JsonUtility.FromJson<Save>(raw); score = save.payload.score; revision = save.revision; }
            await ToTopGame.Instance.Ready(); ready = true; status = "Ready. Catch a light.";
        } catch (Exception error) { status = error.Message; }
    }
    private async void OnPlatformEvent(string raw) {
        var name = JsonUtility.FromJson<EventHeader>(raw).name;
        if (name == "pauseChanged") platformPaused = JsonUtility.FromJson<Event>(raw).data;
        if (name == "audioChanged") AudioListener.pause = !JsonUtility.FromJson<Event>(raw).data;
        if (name == "playerChanged") {
            ready = false; score = 0; revision = 0;
            try {
                await ToTopGame.Instance.GameplayStop();
                var saved = await ToTopGame.Instance.Load();
                if (saved != "null") { var value = JsonUtility.FromJson<Save>(saved); score = value.payload.score; revision = value.revision; }
                ready = true; status = "Account changed · progress restored";
                Debug.Log("ToTop example: account progress restored");
            } catch (Exception error) { status = error.Message; }
        }
    }
    private async void Catch() {
        if (!ready || busy || platformPaused) return;
        busy = true;
        try {
            await ToTopGame.Instance.GameplayStart(); score++;
            var raw = await ToTopGame.Instance.Save(0, JsonUtility.ToJson(new Payload { score = score }), 1, revision);
            revision = JsonUtility.FromJson<Save>(raw).revision; status = "Saved · " + score;
            await ToTopGame.Instance.GameplayStop();
        } catch (Exception error) { status = error.Message; }
        finally { busy = false; }
    }
    private void OnGUI() {
        GUI.Label(new Rect(24, 24, 550, 40), "ToTop Unity SDK · Score " + score);
        GUI.enabled = ready && !busy && !platformPaused;
        if (GUI.Button(new Rect(24, 90, 220, 70), "Catch light")) Catch();
        GUI.enabled = true; GUI.Label(new Rect(24, 180, 650, 50), status);
    }
    private void OnDestroy() { if (ToTopGame.Instance != null) ToTopGame.Instance.PlatformEvent -= OnPlatformEvent; }
}
