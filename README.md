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
