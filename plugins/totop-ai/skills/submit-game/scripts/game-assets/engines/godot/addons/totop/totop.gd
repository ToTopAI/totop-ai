extends Node
signal initialized(context: Dictionary)
signal platform_event(name: String, data)
class Pending extends RefCounted:
    signal completed(result: Dictionary)
var bridge
var result_callback
var event_callback
var pending: Dictionary = {}
var sequence := 0
var context: Dictionary = {}

func _ready() -> void:
    process_mode = Node.PROCESS_MODE_ALWAYS
    if not OS.has_feature("web"):
        push_warning("WEB_EXPORT_REQUIRED: use the ToTop browser preview")
        return
    bridge = JavaScriptBridge.get_interface("ToTopGameEngine")
    result_callback = JavaScriptBridge.create_callback(_on_result)
    event_callback = JavaScriptBridge.create_callback(_on_event)
    bridge.onEvent(event_callback)
    var result = await call_sdk("init", {})
    if result.get("ok", false):
        context = JSON.parse_string(result.resultJson)
        initialized.emit(context)
    else: push_error(str(result.get("code", "SDK_INITIALIZATION_FAILED")))

func call_sdk(method: String, args: Dictionary = {}) -> Dictionary:
    if bridge == null: return {"ok": false, "code": "WEB_EXPORT_REQUIRED"}
    sequence += 1
    var id = str(sequence)
    var wait = Pending.new()
    pending[id] = wait
    bridge.invoke(JSON.stringify({"id": id, "method": method, "args": args}), result_callback)
    return await wait.completed

func ready() -> Dictionary: return await call_sdk("lifecycle.event", {"name": "ready"})
func gameplay_start() -> Dictionary: return await call_sdk("lifecycle.event", {"name": "start"})
func gameplay_stop() -> Dictionary: return await call_sdk("lifecycle.event", {"name": "stop"})
func load_save(slot: int = 0) -> Dictionary: return await call_sdk("storage.load", {"slot": slot})
func save(slot: int, payload: Dictionary, schema_version: int, base_revision: int) -> Dictionary:
    return await call_sdk("storage.save", {"slot": slot, "payload": payload, "schemaVersion": schema_version, "baseRevision": base_revision})

func _on_result(args: Array) -> void:
    var result = JSON.parse_string(str(args[0]))
    if result is not Dictionary: return
    var id = str(result.get("id", ""))
    if not pending.has(id): return
    var wait = pending[id]
    pending.erase(id)
    wait.completed.emit(result)

func _on_event(args: Array) -> void:
    var event = JSON.parse_string(str(args[0]))
    if event is Dictionary:
        var fields = {"playerChanged":"player", "capabilitiesChanged":"capabilities", "pauseChanged":"paused", "audioChanged":"audioEnabled", "viewportChanged":"viewport", "deviceChanged":"device"}
        if fields.has(event.name): context[fields[event.name]] = event.data
        platform_event.emit(str(event.name), event.data)
