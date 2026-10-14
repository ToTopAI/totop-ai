# Agent SDK integration workflow

Use this workflow when Codex, DeepSeek Harness or another coding Agent develops a new game or integrates an existing game. Local tools do not require ToTop login. Installation alone is not integration acceptance.

## Local tools

1. `inspect_game_project({path})` identifies HTML5, Unity or Godot.
2. `get_local_game_sdk_docs({page:"overview"})` and pages `integration`, `capabilities`, `checklist`, `unity`, `godot` read the bundled fixed-version docs offline.
3. `plan_game_sdk_integration({path,capabilities:["cloudSave","config","analytics"]})` returns entry/hook candidates and ordered steps. Candidates are hints, not proof; inspect actual code.
4. `install_game_sdk({path,sdkDirectory})` installs a NEW SDK directory and creates a manifest only if absent. It never rewrites game logic, scenes, existing SDK directories or manifests.
5. The Agent connects the installed SDK to the game's real loading, play, pause, game-over, save and audio functions. Build using the project's existing toolchain; do not replace it with the starter build tool.
6. `start_game_preview({path:EXPORTED_DIRECTORY})` serves an SDK host and simulator. `check_game_build` validates structure; use browser input to prove actual integration.
7. For platform binding and configuration, use the existing authenticated MCP connection. `get_account`, `get_game`, `get_submission_requirements`, `get_game_sdk_config`, `update_game_sdk_config`, `get_game_sdk_metrics` remain cloud tools. A local UUID binding does not register a game or prove ownership.

CLI equivalents: `sdk-docs PAGE`, `plan PROJECT`, `integrate PROJECT [--sdk-directory RELATIVE_DIRECTORY]`, `init NEW_DIRECTORY --engine html5|unity|godot`, `inspect`, `bind`, `build`, `dev`, `check`. Filesystem operations require `--allow-root ABSOLUTE_AUTHORIZED_ROOT`. `build` only exports ToTop's HTML5 starter; other projects retain their own build commands. `serve-local --allow-root ROOT` exposes development MCP tools without OAuth. Authenticated `serve` adds platform tools. Stop previews when finished.

## HTML5 and TypeScript

For script-based games load `totop-sdk/totop-game.global.js` before game code and use `window.ToTopGame`. For modules import `{ToTopGame}` from `./totop-sdk/totop-game.esm.js`. The folder includes declaration files; after creating a local wrapper or bundler alias, point its types at `totop-sdk/index.d.ts`. Pin SDK 1.0.0 and copy `totop.game.json` next to the exported `index.html`.

Use an adapter that receives the real game functions. This is an example, not code to paste with undefined hooks:

```js
const sdk = window.ToTopGame;
let revision = 0, identityEpoch = 0;
const writable = name => ['available', 'mock'].includes(sdk.getCapabilities()[name].state);
await sdk.init(); // Uses trusted production hosts or the supplied loopback host.
sdk.on('pauseChanged', value => game.setHostPaused(value));
sdk.on('audioChanged', value => game.setPlatformAudioEnabled(value));
async function restoreProgress() {
  const epoch = ++identityEpoch;
  const saved = await sdk.storage.load(0);
  if (epoch !== identityEpoch) return;
  revision = saved?.revision ?? 0;
  game.restore(migrate(saved?.payload, saved?.schemaVersion));
}
sdk.on('playerChanged', async () => {
  game.stop();
  await sdk.lifecycle.gameplayStop();
  await restoreProgress();
  game.showMenu();
});
await restoreProgress();
if (writable('config')) game.configure(await sdk.config.get());
await game.loadFirstPlayableScene();
await sdk.lifecycle.ready();
// Wire these at real state transitions, including restart and in-game resume:
game.onPlay(async () => { await sdk.lifecycle.gameplayStart(); game.start(); });
game.onStop(async () => {
  await sdk.lifecycle.gameplayStop();
  const epoch = identityEpoch;
  try {
    const saved = await sdk.storage.save(0, game.snapshot(), {schemaVersion:1, baseRevision:revision});
    if (epoch === identityEpoch) revision = saved.revision;
  } catch (error) {
    if (error.code === 'SAVE_CONFLICT') game.offerReload();
    else game.showSaveError(error.code);
  }
});
```

Define `migrate` for the game's real old schema. If importing legacy localStorage, import only once when the SDK slot is empty, keep the old key until successful acceptance, and do not copy another account's data. Check `sync` before reporting cloud success. Preserve user pause and mute independently from host pause/audio. Dispose listeners when destroying the game.

The storage API is always available after initialization for local guest progress. `cloudSave.state === 'disabled'` describes absent cloud synchronization; it does not disable `storage.load/save`. Never skip SDK guest storage based on the cloudSave capability.

## Unity WebGL

`install_game_sdk` defaults to `Assets/ToTop`. Inspect `ToTopGame.cs`, the WebGL plugin, export hook and bundled assets. Copy the supplied fixed `Assets/WebGLTemplates/ToTop/index.html` from the SDK template assets into a NEW project template directory when necessary, select the ToTop WebGL template and use uncompressed export assets. The existing game's scenes and build settings remain under the Agent's control. Use Initialize/Ready/Start/Stop/Load/Save and event callbacks at actual game states; `ToTopExampleBuilder` is for the supplied sample, not an existing game's export pipeline. See `unity` for editor and bridge details.

## Godot 4 Web

`install_game_sdk` defaults to `addons/totop`. Register `addons/totop/totop.gd` as the ToTop autoload, configure the existing Web export preset with `addons/totop/shell.html`, and copy the installed `totop-game.global.js`, `engine-bridge.js` and manifest into the Web export root. Use single-thread Compatibility exports unless the real host's isolation headers are confirmed. Wire ToTop signals/calls to real scenes. Preserve existing autoloads, scenes and export settings; see `godot`.

## Acceptance

For each Agent client, test both new and existing games. Record actual tool discovery and invocation, fixed SDK version, code changes, preservation of gameplay/save data, real input, lifecycle, guest save reload, account switch, overlapping pause/mute, config/custom events and capability fallbacks. Rewarded cancellation/unfilled never grants rewards. Disabled leaderboard or production payment services must be reported as disabled. Local mock account/cloud results are separate from real platform OAuth/cloud evidence.

An absent editor, browser, account or device produces `not_run`/`blocked`, not `pass`. Deployment requires the backend and game host; direct game HTML has no platform host. Submission uses the existing account/version-bound authorization workflow.

## HTML5 运行资产导出

已有项目的 SDK 安装结果包含 runtimeFiles 与 developmentFiles。类型声明（*.d.ts）和 INTEGRATION.md 保留在源项目，运行导出只复制 SDK 的 JavaScript，以及游戏实际使用的静态资源和根清单。继续使用项目原有工具链，并调整 SDK 子目录的复制规则；不要把接入文档或源码当作运行资产。已有署名、授权说明等运行材料继续保留为平台支持的文本资产。

build_html_game 会识别当前固定版本 SDK，排除其声明和接入文档，并返回 excludedDevelopmentFiles；它不会静默删除其他开发文件。check_game_build 的 runtime_files 检查应通过，再执行 prepare_local_artifact 的冻结打包检查。静态导出和打包均不能替代浏览器试玩。
