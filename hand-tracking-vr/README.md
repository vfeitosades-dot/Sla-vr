# Hand Tracking VR — Android / VR Box
Aplicativo Android baseado no HTML original enviado pelo usuário, sem alterar suas ferramentas.

- Modo VR estereoscópico com correção de lente e orientação horizontal nativa.
- Resolução adaptativa no VR e limite de atualização visual a ~30 fps.
- Textura WebGL atualizada com texSubImage2D para evitar realocação repetida.
- Rastreio de mãos e direção com cadência adaptativa.
- Captura monocular: mesmo vídeo em ambos os olhos, não é visão binocular real nem 6DoF.
- Internet necessária para bibliotecas/modelo MediaPipe na primeira execução.
- Android 8+; câmera traseira; permissão solicitada na primeira utilização.
- APK de teste em Releases, depois que o GitHub Actions confirmar a compilação.
