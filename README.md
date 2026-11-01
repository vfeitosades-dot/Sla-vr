# Horizon Pocket VR 9.0 — Direção rápida + nitidez dinâmica

**[Baixar APK automático mais recente](https://github.com/vfeitosades-dot/Sla-vr/releases/download/horizon-auto/HorizonPocketVR-Automatico.apk)**

## Melhorias

- **Rastreamento horizontal mais responsivo:** busca piramidal em meia resolução e refinamento em resolução integral para acompanhar deslocamentos de imagem maiores (em vez de limitar a detecção a 5 pixels por atualização). Ajuste moderado da resposta horizontal, sem substituir um giroscópio real.
- **Cadência alvo do rastreador óptico de 65 ms**, mas sujeita ao tempo de processamento do celular e aos quadros efetivos da câmera. A IA de mãos e o rastreador disputam recursos do aparelho.
- **Maior resolução do cenário 3D:** escala inicial de renderização aumentada para 1,22; limite conforme densidade do dispositivo e opção selecionada. O app reduz resolução gradualmente quando o FPS está baixo e recupera-a quando há margem de desempenho.
- **Nitidez configurável:** em **Ajustes → Nitidez**, alterne entre **Economia**, **Equilibrada HD** e **Alta HD**. Use Economia caso o VR engasgue ou aqueça muito; use Alta HD se houver folga de desempenho.
- **Câmera:** pedido de captura até 1280 × 720, ideal 960 × 720, até 30 quadros/s (a resolução final depende do aparelho). O rastreador continua processando quadros reduzidos para diminuir uso de CPU e manter a interface fluida.
- **Textos do painel:** anisotropia de textura aumentada de 2× para 4×, respeitando o máximo suportado.

## Testes e limitações

A pipeline GitHub Actions executa verificações de sintaxe, cenário/captura e orientação da câmera, incluindo giros horizontais de até 16 pixels entre imagens sintéticas. Isso **não comprova** funcionamento na velocidade desejada no aparelho: pouca luz, desfoque, objetos móveis ou falta de textura podem causar perda temporária da direção. O rastreamento é **relativo à imagem**; não é SLAM nem rastreamento Quest 6DoF.

**Instalação:** o pacote automático Android é assinado para testes pelo GitHub Actions; se o Android mostrar conflito de assinatura com um APK automático anterior, pode ser necessário desinstalar a versão anterior para instalar esta. Isso pode apagar configurações e dados locais. APK gerado no GitHub, mas ainda sem teste em telefone físico.

[Histórico da compilação automática](https://github.com/vfeitosades-dot/Sla-vr/actions/workflows/horizon-apk-auto.yml)

---

# Horizon Pocket VR 8.0 — Mãos sem vídeo, orientação e navegador interno

**[Baixar APK 8.0 automático](https://github.com/vfeitosades-dot/Sla-vr/releases/download/horizon-auto/HorizonPocketVR-Automatico.apk)**

## Novidades da versão 8

- **Direção horizontal**: no modo VR, se não há orientação nativa confiável, o app pode solicitar a câmera e ativar rastreamento óptico para esquerda/direita e cima/baixo. O sensor visual exige boa luz e textura no ambiente, e é uma estimativa relativa, não SLAM/6DoF.
- **Mãos no mundo 3D**: botão **✋ Mãos IA** na barra principal. O app pede autorização da câmera se necessário, captura em segundo plano sem mostrar o vídeo e desenha pontos e conexões estimados no cenário 3D (até duas mãos). O desenho não é uma malha realista nem reproduz profundidade métrica. Para enxergar as mãos, elas precisam estar dentro do campo da câmera traseira.
- **Inferência mais frequente**: remove a antiga pausa de 180–300 ms, agora usa um intervalo-alvo de ~30 análises/s quando a CPU/GPU permitir. Na prática pode ser bem menor, inclusive em celulares de entrada; não há promessa de 30/60 FPS de IA.
- **Botão ↔ Direção**: inicia/desliga rastreamento visual sem precisar ativar a visualização da câmera. O botão **Mostrar câmera** revela a imagem somente quando solicitado.
- **Navegador dentro do aplicativo**: a aba Navegador abre URLs HTTPS numa segunda WebView com barra de endereço, recarregar, voltar e fechar. Sites não recebem a interface JavaScript com permissões do app. Algumas páginas ou vídeos podem limitar WebViews. O navegador é uma tela plana, não uma janela 3D estereoscópica.

### Permissões e segurança

A câmera **continua sendo necessária** para rastrear mãos ou direção visual; a opção de ocultá-la só esconde a imagem do visor, não desliga a captura. O app interrompe a captura ao ir para segundo plano e usa HTTPS para as páginas internas. A primeira ativação do modelo MediaPipe pode precisar de Internet; inferência e imagens da câmera são processadas no dispositivo.

### Instalação e validação

APK de teste gerado com GitHub Actions, compilado com Android SDK 35 e assinatura de debug verificada. Os testes sintéticos de movimento horizontal/vertical, preview e captura oculta passaram; **não foi testado em um telefone físico** e ainda precisa de validação de latência/qualidade e de navegação no seu aparelho. O APK automático usa um identificador `.ci` e pode ser instalado junto de versões antigas.

[Histórico de compilação](https://github.com/vfeitosades-dot/Sla-vr/actions/workflows/horizon-apk-auto.yml)

---

## Histórico anterior da versão 7
# Horizon Pocket VR 7.0 — Spatial

[Baixar o APK 7.0](./HorizonPocketVR_7.apk)

Um terraço 3D para explorar no celular ou VR Box: água animada, ilhas, plantas, espreguiçadeiras, luz e sombras, uma escultura cinética e painel flutuante com espessura, perspectiva e visão estereoscópica. Interface independente inspirada em interfaces espaciais; não afiliada à Meta e não executa jogos Quest.

## Versão 7: perfil leve

- Removido o segundo contexto WebGL. O cenário usa um único contexto, sem antialiasing de múltiplas amostras, sem sombras dinâmicas e com escala inicial de 0,85 (ajuste automático entre 0,6 e 1,2).
- Durante a câmera, nenhuma cena WebGL é desenhada. O vídeo é composto pelo navegador. Cópias leves do painel mantêm a projeção em perspectiva usando a mesma geometria e os mesmos alvos de toque. Espessura física e iluminação do painel não são renderizadas nesse modo.
- Captura limitada a 480×360 e 24 FPS. O segundo vídeo só fica ativo em VR e compartilha a mesma captura.
- Painel com textura 1160×1060. Conteúdo estático só é copiado quando muda; o relógio da biblioteca atualiza por minuto. O painel não é redesenhado a cada quadro de câmera.
- Mãos: modelo Lite, entrada de 256 pixels de largura, até duas mãos. Alvo de até aproximadamente 3,3 análises/s, com pausa mínima de 180 ms depois de cada análise. O esqueleto continua com 21 pontos, mas pode atualizar menos suavemente e detectar pior mãos pequenas/distantes.
- Orientação visual reduzida para até 10 análises/s, com pausa adaptada ao custo. Quando há sensor completo e recente, deixa de analisar imagens redundantes. Mantida a direção lateral corrigida.
- Removidos trechos de renderização antiga sem uso.

Validação: testes de direção, rastreamento e ciclo de câmera passaram. Teste com DOM/renderizador simulados confirmou um contexto WebGL, nenhuma chamada de desenho 3D no modo câmera, painel em perspectiva, transformação geométrica dos quatro cantos, encerramento da captura e retorno do cenário. Assinatura APK verificada. Esses testes não medem fluidez em celular; não foi possível testar o Redmi 10C ou repetir a inspeção visual no navegador nesta versão. A aparência geral permanece, com concessões de nitidez, sombras e cadência da IA para reduzir a carga.

## Usar

- Toque nos ícones. Arraste o cenário para olhar; arraste o topo do painel para reposicioná-lo no espaço.
- **Entrar em VR** ativa duas câmeras com separação entre os olhos. **Recentrar** traz o painel de volta à sua frente.
- **Ativar câmera** solicita a permissão nativa do Android. Depois de autorizar, o cenário dá lugar à câmera traseira. Se a permissão já foi concedida, Android não repete o diálogo; se bloqueada, use **Permissão no Android** na aba Câmera.
- Na aba **Câmera**, ative **Esqueleto das mãos**. Mostre a mão inteira à câmera traseira: a IA desenha 21 pontos e as conexões por mão, até duas mãos. O primeiro uso baixa o modelo pela internet; a inferência e as imagens permanecem no aparelho.
- Em **Ajustes**, ative o sensor de orientação. Se não houver sensor adequado, use **Orientação visual** na aba Câmera. Aponte para um ambiente iluminado com detalhes.
- Galeria e Cinema usam o seletor de arquivos do Android. O navegador abre links externamente. Orbit é um minijogo, e Respirar oferece uma animação guiada.

## Orientação e IA: o que é real

O esqueleto usa **MediaPipe Hands**, modelo treinado com `modelComplexity: 0`, até duas mãos, limiares de detecção e rastreamento de 0,65 e cadência de até aproximadamente 3,3 inferências por segundo. O desenho representa pontos estimados da mão, não ossos medidos. Pouca luz, oclusão e mãos fora do enquadramento prejudicam a detecção.

A orientação usa sensores nativos quando disponíveis, com ajuste aos eixos da tela, tratamento da passagem de 359° para 0° e suavização adaptativa. Há fallback para acelerômetro e magnetômetro, ou somente inclinação por acelerômetro. Um aparelho sem hardware de direção não ganha um giroscópio físico por software.

A alternativa pela câmera é **visão computacional clássica, experimental**, não uma rede neural: detecta cantos, compara regiões, verifica correspondências nos dois sentidos e rejeita movimento inconsistente. Só aplica deslocamentos com confiança suficiente. Em câmera em movimento, objetos móveis, pouca textura ou iluminação insuficiente podem gerar erro e deriva. Não faz SLAM, rastreamento absoluto, mapeamento 6DoF ou passthrough estereoscópico. Câmera monocular e pontos da mão são duplicados no modo VR.

## Privacidade e compatibilidade

O app pede apenas Internet e Câmera. Sem permissão de microfone ou acesso amplo ao armazenamento. A câmera é ativada por ação do usuário e desligada quando o aplicativo vai para segundo plano; o pedido de permissão pendente é preservado ao pausar pelo próprio diálogo do Android. Não envia quadros da câmera a um servidor. O modelo e seu runtime são baixados de jsDelivr, e podem exigir internet novamente se não estiverem em cache.

Android 8+ e Android System WebView atualizado, com WebGL. `minSdk 26`, `targetSdk 34`, `versionCode 7`. Mesmo certificado dos APKs 1 atualizado e 2 deste repositório; permite atualização sobre eles. Não usa a assinatura do APK original enviado pelo usuário.

## Validação

- Java compilado contra API 34, DEX gerado por D8 e assinatura conferida com apksigner.
- Testes de rastreamento visual: translação, exposição, objetos em primeiro plano, quadros sem textura, imagens desconexas e movimento excessivo.
- Interface testada em Chromium por raycasting real no painel: oito apps, ambientes, pontuação, ambos os olhos em VR e layout de celular.
- Fluxo de câmera testado no navegador com bridge e stream simulados: permissão recusada, pausa durante o diálogo e encerramento das faixas ao sair.
- Nenhum celular ou emulador Android estava disponível. Permissão real, sensores físicos, qualidade da IA de mãos e desempenho no Redmi 10C ainda precisam de teste em aparelho. Testes com mocks não equivalem à validação física.

## Código e dependências

`src/` contém a interface e dependências JavaScript locais; `android/` contém a Activity, manifesto e ícone. `tests/` contém verificações. O build utiliza Android Build Tools 35, compilador ECJ Java 8 e API 34. Chaves privadas não são publicadas.

- Three.js 0.160.1 (MIT), incluído localmente para cenário offline.
- MediaPipe Hands 0.4.1675469240 (Apache-2.0), bootstrap local e runtime/modelo sob demanda.
- Referências de design: [Meta Panels](https://developers.meta.com/vr/design/panels/) e [UISet](https://developers.meta.com/vr/documentation/spatial-sdk/spatial-sdk-sample-uiset/).
