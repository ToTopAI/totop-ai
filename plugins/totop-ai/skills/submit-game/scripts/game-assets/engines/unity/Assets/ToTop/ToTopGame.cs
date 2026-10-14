using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using UnityEngine;

namespace ToTop.SDK {
    public sealed class ToTopGame : MonoBehaviour {
        public static ToTopGame Instance { get; private set; }
        public event Action<string> PlatformEvent;
        private readonly Dictionary<string, TaskCompletionSource<string>> pending = new Dictionary<string, TaskCompletionSource<string>>();
        [Serializable] private class Response { public string id; public bool ok; public string code; public string resultJson; }
#if UNITY_WEBGL && !UNITY_EDITOR
        [DllImport("__Internal")] private static extern void ToTop_Invoke(string request);
        [DllImport("__Internal")] private static extern void ToTop_Subscribe();
#endif
        private void Awake() {
            if (Instance != null && Instance != this) { Destroy(gameObject); return; }
            Instance = this; gameObject.name = "ToTopGameBridge"; DontDestroyOnLoad(gameObject);
#if UNITY_WEBGL && !UNITY_EDITOR
            ToTop_Subscribe();
#endif
        }
        public Task<string> Initialize(string gameId = null) { return Call("init", gameId == null ? "{}" : "{\"gameId\":\"" + gameId + "\"}"); }
        public Task<string> Ready() { return Call("lifecycle.event", "{\"name\":\"ready\"}"); }
        public Task<string> GameplayStart() { return Call("lifecycle.event", "{\"name\":\"start\"}"); }
        public Task<string> GameplayStop() { return Call("lifecycle.event", "{\"name\":\"stop\"}"); }
        public Task<string> Load(int slot = 0) { return Call("storage.load", "{\"slot\":" + slot + "}"); }
        public Task<string> Save(int slot, string payloadJson, int schemaVersion, int baseRevision) {
            return Call("storage.save", "{\"slot\":" + slot + ",\"payload\":" + payloadJson + ",\"schemaVersion\":" + schemaVersion + ",\"baseRevision\":" + baseRevision + "}");
        }
        public Task<string> Login() { return Call("player.login", "{}"); }
        // Other modules use the exact shared method names and JSON envelopes.
        public Task<string> Call(string method, string argumentsJson) {
#if UNITY_WEBGL && !UNITY_EDITOR
            var id = Guid.NewGuid().ToString(); var completion = new TaskCompletionSource<string>(); pending.Add(id, completion);
            ToTop_Invoke("{\"id\":\"" + id + "\",\"method\":\"" + method + "\",\"args\":" + argumentsJson + "}");
            return completion.Task;
#else
            return Task.FromException<string>(new InvalidOperationException("WEB_EXPORT_REQUIRED: test this game in the ToTop browser preview"));
#endif
        }
        public void OnResult(string raw) {
            var result = JsonUtility.FromJson<Response>(raw);
            if (result == null || String.IsNullOrEmpty(result.id) || !pending.TryGetValue(result.id, out var task)) return;
            pending.Remove(result.id);
            if (result.ok) task.TrySetResult(result.resultJson); else task.TrySetException(new InvalidOperationException(result.code));
        }
        public void OnPlatformEvent(string raw) { PlatformEvent?.Invoke(raw); }
        private void OnDestroy() {
            if (Instance != this) return;
            foreach (var task in pending.Values) task.TrySetException(new InvalidOperationException("SDK_DISPOSED"));
            pending.Clear(); Instance = null;
        }
    }
}
