# Hand Tracking VR Box — Pocket Space 2.0

Aplicativo Android original para VR Box (Cardboard) com camera, rastreamento de maos e um launcher flutuante inspirado em conceitos gerais de interfaces de realidade virtual. Nao reproduz o Meta Quest nem oferece rastreamento 6DoF de hardware.

## Apps que funcionam

- **Mundos:** camera real (passthrough), Ilhas do ceu, Cidade neon e Base lunar. Os mundos usam perspectiva projetada em Canvas 2D, sem modelos 3D pesados nem download de texturas, e atualizam a cerca de 11 FPS para economizar recursos; a interface pode continuar sendo desenhada na frequencia do monitor.
- **Navegador:** abre paginas HTTPS dentro do proprio APK num segundo WebView Android, com barra de endereco, voltar, atualizar e fechar. Essa visualizacao e 2D e nao estereoscopica. Alguns sites podem restringir recursos por DRM, login, cookies ou APIs do navegador.
- **YouTube e Pesquisar:** atalhos que abrem no navegador interno.
- **Relogio:** painel com hora e data.
- **Ajustes:** ligar/desligar rastreamento de maos, reconectar IA em segundo plano, acionar detector compativel, exibir ou ocultar FPS e recentralizar a janela.

## Controle

1. Toque em **Iniciar** e permita usar a camera.
2. Abra **Modo VR Box**, vire o celular na horizontal e coloque no visor.
3. **Pinca**: selecionar um icone do painel; pinca fora dos icones: arrastar/mover a janela. Toque na tela antes de colocar o celular no visor tambem funciona.
4. **Segurar o fundo**: recentralizar. Toque duplo fora dos icones: sair do VR.
5. Se suas maos nao aparecerem, verifique a iluminacao e se a camera traseira esta livre. Abra **Ajustes > IA compativel** ou **Reconectar IA**.

## Desempenho e limitacoes

- Tenta manter o VR fluido com video Android compositado diretamente, overlays em resolucao adaptativa e IA no Web Worker quando disponivel.
- A tela pode renderizar na taxa de atualizacao do dispositivo (por exemplo, 60 Hz), mas a camera solicitada trabalha em ate 30 quadros/s, e a deteccao das maos tem sua propria taxa. **Nao ha garantia de 60 FPS estaveis** no aparelho.
- Os cenarios virtuais sao ambientes sinteticos leves, com perspectiva visual; nao sao jogos 3D completos ou uma simulacao do sistema Meta Quest.
- A IA de maos depende de internet para baixar os arquivos do MediaPipe na primeira execucao e de boa luz.
- O APK e uma compilacao de teste (debug) gerada no GitHub Actions. A assinatura pode mudar entre compilacoes, exigindo desinstalar a versao anterior e perdendo dados locais.

APK mais recente: https://github.com/vfeitosades-dot/Sla-vr/releases/download/handtracking-vrbox-auto/HandTrackingVRBox.apk

Codigo: `app/src/main/assets/index.html` (UI/VR), `vr-ui.js` (launcher), `worlds.js` (ambientes), `hand-worker.js` (IA), `MainActivity.java` (navegador nativo).
