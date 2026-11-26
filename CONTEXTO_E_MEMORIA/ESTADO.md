# Estado do projeto — 26/11/2026

- Motor: Babylon.js + HTML5, sem Godot. Android horizontal como destino.
- Checkpoint importado: Etapa 1H (código da reconstrução, sem histórico anterior). A última validação privada bem-sucedida foi a Etapa 1G.1: run 45781361018, 39/39 amostras do eixo da ponte livres, colisões de cisterna e casinha aprovadas, 137 junções do rio sem lacunas, 4,24 FPS em software. Não é medição física.
- 1H: copas de folhas e pétalas tridimensionais, geometria agrupada, câmera ortográfica ajustada e testes de contagem de folhas/pétalas/triângulos. A execução privada falhou antes de iniciar por franquia de processamento esgotada. Ainda não validada.
- Planta: 18 setores agrícolas, 22 eixos de estrada, 3 pontes, 4 cachoeiras; somente área residencial em implementação. A referência é conceitual, não textura do mundo.
- Meta: fidelidade ao mapa aprovado; corrigir residência, margens, cachoeiras, jardins, colisões e desempenho antes de expandir. Não publicar APK antes de validação técnica, visual e física.
- Saves antigos em Godot: migração dispensada pelo proprietário. Implementar novo sistema de saves e preservar esses dados em todas as futuras atualizações.
- Android: preservar pacote e assinatura do canal escolhido, atualizador interno e integridade. Chaves, credenciais, APKs anteriores e assets antigos não foram importados. Assinatura futura requer configuração segura de segredo e validação de certificado; nenhum canal oficial será alterado nesta rodada.
- Repositório público exclusivo para este jogo; outros projetos e repositório original permanecem privados conforme suas configurações. Não habilitar serviços pagos.
- CI consolidada: build inclui checagem de sintaxe e planta, teste de navegador e três capturas; artefatos com retenção curta. Não há agente de correção automática habilitado.
- EFG Master Standard 2.1: implementar, testar, avaliar, corrigir e revalidar, com evidências e proteção da versão estável.
