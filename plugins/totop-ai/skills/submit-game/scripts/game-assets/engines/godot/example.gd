extends Control
var score := 0
var revision := 0
var label: Label
var playable := false
var busy := false
var account_epoch := 0
func _ready() -> void:
    label = Label.new(); label.text = "Connecting to ToTop…"; label.position = Vector2(30,30); add_child(label)
    var button = Button.new(); button.text = "Catch light"; button.position = Vector2(30,100); button.pressed.connect(_catch); add_child(button)
    ToTop.initialized.connect(_initialized)
    ToTop.platform_event.connect(_platform_event)
func _platform_event(name: String, data) -> void:
    if name == "pauseChanged": get_tree().paused = bool(data)
    if name == "audioChanged": AudioServer.set_bus_mute(0, not bool(data))
    if name == "playerChanged":
        playable = false
        await ToTop.gameplay_stop()
        await _restore()
func _restore() -> void:
    account_epoch += 1
    var epoch := account_epoch
    score = 0; revision = 0
    var save = await ToTop.load_save()
    if epoch != account_epoch: return
    if not save.get("ok", false):
        label.text = "Save unavailable: " + str(save.get("code", "unknown"))
        return
    var value = JSON.parse_string(save.resultJson)
    if value is Dictionary: score = int(value.payload.get("score",0)); revision = int(value.revision)
    label.text = "Ready · score " + str(score)
    playable = true
    _debug_state()
func _initialized(context: Dictionary) -> void:
    get_tree().paused = bool(context.paused)
    AudioServer.set_bus_mute(0, not bool(context.audioEnabled))
    await _restore()
    await ToTop.ready()
    _debug_state()
func _catch() -> void:
    if not playable or busy: return
    busy = true
    var epoch := account_epoch
    await ToTop.gameplay_start()
    score += 1; label.text = "Score " + str(score)
    var result = await ToTop.save(0, {"score":score}, 1, revision)
    if epoch != account_epoch: busy = false; return
    if result.get("ok", false): revision = int(JSON.parse_string(result.resultJson).revision)
    else: label.text = "Save unavailable: " + str(result.get("code", "unknown"))
    await ToTop.gameplay_stop()
    busy = false
    _debug_state()
func _debug_state() -> void:
    if OS.has_feature("web") and ToTop.context.get("environment", "production") != "production":
        var player = ToTop.context.get("player")
        var player_id := str(player.id) if player is Dictionary else ""
        JavaScriptBridge.eval("window.__totopGodotQA = " + JSON.stringify({"score":score,"revision":revision,"playerId":player_id}))
