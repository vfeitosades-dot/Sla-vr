# Pocket Space 2.4 — Hand Tracking VR Box

Aplicativo Android experimental para VR Box com camera, janelas espaciais, biblioteca, galeria, navegador 2D e rastreamento optico de maos e direcao. Nao e o sistema Meta Quest e nao tem rastreamento 6DoF de hardware. O modo VR usa uma unica camera: as duas imagens de video nao possuem profundidade estereoscopica real.

## Correcao de imagem dupla (Pocket Space 2.4)

Segundo a [documentacao oficial do Google Cardboard](https://support.google.com/cardboard/manufacturers/answer/6324808?hl=en), imagens duplicadas podem ser sinal de distancia incorreta entre os centros das lentes e os centros das imagens. O alinhamento vertical e as distorcoes das lentes tambem afetam a imagem.

1. Abra o APK, toque **Iniciar** e permita o acesso a camera.
2. Antes de colocar o celular no VR Box, toque **Ajustar VR**.
3. A **distancia entre as lentes** inicia em 64 mm, proxima a de um Google Cardboard padrao. Este valor nao e uma medida de seu VR Box; ajuste conforme as lentes. Se o visor tem ajuste fisico de IPD, acerte tambem as lentes no proprio visor.
4. A **largura fisica da tela** e lida do Android, quando confiavel. O valor inicial de 156 mm e uma estimativa para o Redmi 10C. Corrija-o se seu aparelho for diferente ou o Android informar um valor impreciso.
5. Toque **Calibrar dentro do VR**, posicione o telefone CENTRALIZADO no compartimento e olhe para os marcadores, um por lente.
6. Com o telefone no visor, pressione **Volume +** para aumentar o afastamento entre os centros das imagens, ou **Volume -** para aproxima-los. Ajuste ate a imagem ficar unica e confortavel. **Nao force a vista.**
7. Toque duas vezes na tela para sair do VR. A distancia fica salva. Entre pelo botao **VR** para a exibicao normal, sem os marcadores.
8. Se a imagem continuar dupla, use **Diagnostico de cada olho** para mostrar somente o olho esquerdo ou direito em um teste curto. Se um mesmo olho ja enxergar dobrado, verifique limpeza, posicionamento, foco e condicoes das lentes. Este modo monocular e apenas para diagnostico.

A calibracao permite ajustar IPD de 54–76 mm, largura da tela, um ajuste horizontal fino, alinhamento vertical, ampliacao e teste isolado por olho. O renderizador acelerado anterior foi preservado, sem upload de camera para WebGL a cada quadro.

O visor especifico pode precisar de perfil de distorcao de lentes (k1/k2, distancia tela-lentes e FOV), como o Cardboard documenta. Esta versao NAO implementa nem a leitura do perfil QR do visor nem a correcao radial completa, portanto nao e possivel garantir conforto ou eliminar toda duplicacao apenas por software.

## Outros recursos

- Dock e janelas moveis com biblioteca, galeria e configuracoes, baseadas no HTML fornecido pelo usuario.
- Quatro fundos: camera real, Ilhas do ceu, Cidade neon e Base lunar. Cenários sinteticos de Canvas com baixo custo; nao sao mundos tridimensionais completos.
- Navegador HTML e navegador nativo Android. Alguns sites bloqueiam incorporacao em iframe; o navegador nativo e uma janela 2D.
- Maos reconhecidas por MediaPipe (modelo oficial) e gesto de pinca. A iluminacao interfere na deteccao.
- Sensor de direcao por movimento visual da camera (nao e giroscopio nem 6DoF).

## Desempenho e instalacao

- **60 FPS e um alvo de renderizacao, nao uma garantia.** A camera do aparelho pode operar ate 30 FPS; deteccao de maos e movimento tem outras taxas.
- A IA de maos baixa o modelo MediaPipe pela internet ao iniciar.
- APK de depuracao assinado automaticamente pelo GitHub Actions. Se ocorrer conflito de assinatura, pode ser necessario desinstalar o APK anterior, perdendo dados do app.
- Os testes de GitHub Actions validam codigo e compilacao, mas nao substituem testes com VR Box fisico.

APK: https://github.com/vfeitosades-dot/Sla-vr/releases/download/handtracking-vrbox-auto/HandTrackingVRBox.apk

Codigo principal: `app/src/main/assets/index.html`, `app/src/main/java/com/handtracking/vrbox/MainActivity.java`, `app/src/main/assets/worlds.js`.

Referencia: [parametros padrao do Cardboard](https://support.google.com/cardboard/manufacturers/answer/6321873?hl=en).
