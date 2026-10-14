# ToTop game integration checklist

- SDK initialized before feature calls; ready after a playable scene, start/stop at true gameplay boundaries.
- Platform pause and audio signals applied, including overlapping reasons and gesture-required audio resume.
- Guest progress survives reload; cloud save tested for first login, existing cloud, conflicts, offline retry and account switching.
- Game remains playable on SDK/cloud/ad failure. Ads opt-in/natural breaks; rewards only on confirmed completion.
- Mobile and desktop controls match declared support; readable layouts, safe areas, rotation and high-refresh physics verified.
- No runtime errors or framework overlays; complete at least one real round and verify restart/progression.
- Report engine, SDK/config/build versions, actual viewports, runtime evidence and tests not run.
- Export root index.html, all assets and exact external-service declarations. Obtain current limits from get_submission_requirements.
- Retain original authors/licenses for remix; never package credentials or publish the source without rights and server capability.
- Review and deployment refer to the frozen hash; verify the resulting public entry independently.
