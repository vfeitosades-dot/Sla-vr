# Horizon Pocket VR 2.0

[Baixar o novo APK](./HorizonPocketVR_2.apk)

Interface independente inspirada no Navigator do Meta Quest, adaptada a celulares Android. Não é Horizon OS, não executa jogos Quest e não possui afiliação com a Meta.

## O que mudou

- Biblioteca com filtros, ícones próprios e painel flutuante.
- Três ambientes desenhados localmente: terraço, observatório lunar e pôr do sol.
- Modo de duas lentes para VR Box, ajuste de separação e tamanho do painel.
- Seleção por olhar com espera de 1,2 segundo, controles por toque e recentralização.
- Orientação pelo sensor do aparelho, quando disponível; fallback por toque.
- Galeria e cinema com seletor nativo do Android, sem permissão ampla de armazenamento.
- Câmera traseira como fundo ao vivo, ativada somente por ação do usuário e permissão. A câmera é desligada ao sair do aplicativo.
- Minijogo Orbit, exercício de respiração e abertura de links no navegador externo.
- Preferências locais e ícone próprio do app.

## Instalação e uso

Android 8 ou posterior; WebView atualizado. Baixe o APK, autorize a instalação pelo navegador e abra. A versão 2 usa o mesmo certificado do `HorizonPocketVR_Android_Atual.apk` deste repositório, permitindo atualização sobre aquela versão. A versão original enviada pelo usuário possui outra assinatura.

Começa em tela única. Toque em **Entrar em VR** para usar duas lentes. Em Ajustes, ative **Seleção por olhar** e, se disponível, **Movimento da cabeça**. Recentrar reposiciona o painel. Fotos e vídeos são escolhidos pelo seletor do Android; os arquivos ficam no aparelho.

A visualização usa Canvas 2D com perspectiva e duas imagens, sem reconstrução 3D da sala, SLAM, 6DoF ou correção de lentes específica por headset. A câmera é monocular; não é passthrough estereoscópico. Não inclui rastreamento de mãos. O sensor depende do hardware. A reprodução e a busca em vídeos dependem do formato e do WebView.

## Validação

- Código Java compilado contra API 34 e convertido para DEX com D8.
- Manifesto: minSdk 26, targetSdk 34, versionCode 2.
- Assinaturas APK v2 e v3 verificadas com o `apksigner` oficial do Android.
- Testes Chromium/Playwright: navegação dos oito apps, Guia, mudança de ambiente, pontuação do jogo, alvos em ambos os olhos e layout de celular; sem erros JavaScript.
- Ainda não testado em celular ou emulador Android. Permissão de câmera, seletor de mídia e sensores precisam de validação em aparelho.

## Código

`src/index.html` contém a interface offline. `android/MainActivity.java`, `android/AndroidManifest.xml` e `android/res/drawable/icon.xml` contêm a camada nativa. `tests/check_ui.py` registra as verificações de interface e pode ser adaptado ao caminho local do checkout. Chaves de assinatura não são publicadas.

## Referências pesquisadas

As imagens foram usadas como referências visuais; a interface, os ícones e os ambientes incluídos foram desenhados para este projeto.

- [Meta — Panels](https://developers.meta.com/vr/design/panels/): organização dos painéis espaciais e barra de controle.
- [Meta — UISet sample](https://developers.meta.com/vr/documentation/spatial-sdk/spatial-sdk-sample-uiset/): navegação persistente e grades de conteúdo.
- [Meta — Spatial UI](https://developers.meta.com/vr/documentation/iwsdk/concepts/spatial-ui/): interação e disposição de interfaces espaciais.
- [Referências visuais do Navigator](https://www.uploadvr.com/meta-horizon-os-navigator-ui-finally-rolled-out-to-all-quest-headsets/).
