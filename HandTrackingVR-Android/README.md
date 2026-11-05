# Hand Tracking VR — Android APK

Aplicativo Android que abre a versão 14 do Hand Tracking VR em um WebView com contexto HTTPS local (WebViewAssetLoader), permissão de câmera, seletor de arquivos e orientação paisagem.

## Compilar
Em um ambiente com Android SDK 35, JDK 17 e Gradle 8.9:
```sh
gradle -p HandTrackingVR-Android assembleDebug
```
APK gerado: `HandTrackingVR-Android/app/build/outputs/apk/debug/app-debug.apk`

## GitHub Actions
Acesse Actions > Build Hand Tracking VR APK > Run workflow e escolha a branch `handtracking-vr-android`, ou use o build de push automático. Baixe o artifact HandTrackingVR-APK.

Requisitos do app: Android 8+, WebView atualizado, câmera e internet para o MediaPipe. Compatibilidade com VR Box e precisão do sensor de orientação sem giroscópio precisam ser verificadas no aparelho real.
