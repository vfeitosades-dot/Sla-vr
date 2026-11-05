# Hand Tracking VR 14 (Android)

Aplicativo Android que abre localmente `app/src/main/assets/index.html` em um WebView com origem HTTPS interna, permitindo `getUserMedia` para câmera e o detector de mãos MediaPipe carregado por CDN.

**Requisitos:** Android 8.0+ (API 26+); WebView atualizado; internet para carregar modelo MediaPipe, scripts e recursos de páginas web; câmera. Sensor de direção por análise da câmera + acelerômetro opcional; não substitui giroscópio físico nem garante 60 FPS.

**Compilar:** Android Studio (Gradle 8.9, JDK 17, SDK 35), ou `gradle assembleDebug` na raiz deste projeto. APK em `app/build/outputs/apk/debug/app-debug.apk`.

**Configuração nativa:** permissão Android CAMERA concedida somente para a origem interna do app; seletor de arquivos Android para fotos/vídeos; orientação landscape ativada no modo VR Box e restaurada ao sair.

**Atenção:** builds debug são assinados com a chave de depuração do ambiente de compilação. Para publicação em lojas, configure uma chave de assinatura própria.
