# Unificação do Colheita Vitural

## Base e proteção
- HTML5 + Babylon.js é a base de desenvolvimento; checkpoint qa-v149, f2132609ac69501cf9c60c5533aed9f94e33f03b.
- Godot original privado preservado como legado funcional (625dbcfd1af91ddc9b0d8fd48167bd978fbe853e). Nenhuma alteração nele.
- Mesmo pacote e assinatura QA, versões incrementais, atualização interna pelo canal atual. Não trocar engine, pacote, chave, arquivos de save, nome do rancho nem configurações sem migração validada. Distribuição QA não equivale a lançamento oficial. Migração opcional do save Godot requer importador separado com backup e teste.

## Ordem de recuperação (cada item exige implementação, regressão e validação visual/física)
1. Inventário universal: visão dos estoques existentes (0.1.50 candidata), seleção de sementes; depois transações, ferramentas, equipamento, materiais, baús e transferências.
2. Economia: moeda, preço, compra/venda, feira, armazém, transações atômicas sem duplicação.
3. Construção: catálogo de cercas/portões/abrigos/celeiro/galinheiro/comedouros/bebedouros/bancos/baús/bancadas/vasos/lanternas, encaixe e colisão, remoção/reparo e custos.
4. Residência: dois andares e escada giratória real, colisão por piso, quartos, sala, cozinha, banheiro, luzes, dormir, móveis, decoração e ações.
5. Agricultura: recuperar alface, cenoura, ervilha, manjericão, tomate, brócolis, girassol, nabo; rosa ornamental já existe, avaliar cultivo agrícola; conservar trigo/milho/arroz/morango e simulação atual. Ervas daninhas, novos canteiros, placas específicas.
6. Natureza: árvores cortáveis, mudas, reflorestamento, pomar de maçã/banana/laranja, pesca, recursos e inventário.
7. Animais: galinha, vaca, ovelha, porco, pato; abrigos, pasto, alimento, água, ciclo de vida, produção e navegação/Utility AI com orçamento de CPU. Preservar pets.
8. Personagem: personalização de pele/rosto/cabelo/roupa/corpo, equipamento, guarda-roupa e saves.
9. Progressão: XP, habilidades, compra de terrenos, expansão, mapa com marcadores; não inventar missões como legado.
10. Áudio e menu: música, ambiente, ferramentas, animais, ajustes de volume, menu inicial, novo jogo seguro e modo fotografia.
11. Integridade: backup/rollback, integração EFG Dev Center quando acessível, teste de atualização interrompida, recuperação de save, compatibilidade e importador legado opcional.
12. Validação: comparar APKs na mesma resolução/cenário/Poco X7 Pro, FPS, P95/P99, RAM, carregamento, bateria, estabilidade. Não tratar FPS de SwiftShader como desempenho físico. Somente publicar oficialmente após requisitos aprovados.

## Critério de equivalência
Cada função legada deve ser rastreável ao código original e ao teste na nova implementação. Ausências, parciais e diferenças são registradas; nunca declarar paridade só porque a build compilou. Preservar direção visual, câmera e UI contextual aprovadas. Não criar repositório público com conteúdo privado sem verificar direitos e segredos.


## Rodada consolidada 0.2.0 RC
Base qa-v150 aprovada. Desenvolvimento interno em main, pacote e certificado permanentes preservados; distribuição bloqueada por android-test/rc-release-gate.json, incluindo todas as onze frentes e teste físico. Artefatos de CI não são releases OTA. Inventário e economia parcial: comércio agrícola transacional com preços originais compartilhados e arroz provisório. Feira espacial e demais sistemas pendentes.

- Conciliação: branch experimental rc/0.2.0 não será mesclada integralmente. main mantém economia transacional coins/commitTrade e gate; expansão agrícola incorporada isoladamente, sem duplicar saldos. Não instalar artefatos experimentais.

- Áudio retomado: legado scripts/main.gd (opções e ambiente) e scripts/menu.gd (efeitos e música) comparados. Implementação parcial original Web Audio: clique, vento, chuva e sinais sonoros diurnos/noturnos, volume e opções persistentes, desbloqueio por gesto e suspensão quando oculto. Música, sons de ferramentas/animais, espacialização, menu inicial e audição física pendentes. Sem copiar assets privados. Gate continua fechado.

## Entregas em lotes autorizadas
Após QA 0.1.52, consolidar e entregar 4 frentes iniciais; depois 3+3+1. Manter gate final e não declarar paridade sem teste. Versões intermediárias QA exigirão autorização de lote específica, não habilitar publicação RC parcial automaticamente.


## RC lote 1 retomado após QA 0.1.53
Base visual/funcional qa-v153 (e3ee63d), conciliação seletiva do código RC anterior: 12 espécies, saldo e comércio agrícola atômico, preferências e ambiente de áudio, testes combinados. Novo armazém agrícola na mesma transação do save de cultivo: depósito/retirada de sementes e colheitas, testes de conservação e falha de gravação. Preservadas pintura, cercas encadeadas, minimapa superior, pets e painel compacto. Armazém é interface lógica, não edifício físico. Quatro frentes permanecem parciais: ferramentas/equipamento/baús físicos, feira espacial, novas áreas/ervas, música e sons específicos ainda pendentes. Gate fechado; nenhum APK OTA RC parcial publicado. CI e validação física pendentes.


## Decisão de escopo — armazém central
Usuário autorizou retirar o baú físico independente. Todas as transferências de sementes, colheitas e insumos usam o armazém único; o inventário permite consulta remota, não transferência remota. Substituído modelo de baú por pequeno galpão de madeira com placa e colisão, próximo à área agrícola em ponto livre; localização e dimensões provisórias sujeitas à validação visual. Mesma chave de save e mesmo ledger warehouse, sem migração destrutiva. Testes de bloqueio remoto, transferência local e ausência do baú; CI pendente. Baús decorativos futuros não devem duplicar armazenamento. Não alterar gate de publicação.


## Decisão atualizada — armazém construído pelo jogador
Não gerar armazém ou baú automaticamente. A feira permanece. Modelo do armazém mantido como função não invocada, ledger e operações atômicas preservados; nenhuma transferência no jogo antes de existir construção válida. Consulta remota da mochila explica o bloqueio. Na frente de construção (lote 2), integrar armazém ao catálogo do martelo com posicionamento livre, confirmação, colisão e persistência; só então ativar interação/transferências por proximidade. Não presumir que o catálogo já constrói o armazém. Testes de ausência de modelo/colisor, bloqueio da ação mesmo se chamado o handler, conservação e regressão de feira. Testes unitários de transferências permanecem. CI pendente. Gate RC inalterado.


## 27/11/2026 — estratégia de entrega revisada pelo proprietário
Concluir apenas o lote atual de quatro frentes (inventário, economia, agricultura e áudio/menu) como uma atualização QA consolidada, com os gates técnicos e teste físico identificados. Não antecipar novos lotes grandes. Depois desta entrega, cancelar o agrupamento 3+3+1 anteriormente planejado: executar uma frente/funcionalidade por rodada, testar e corrigir, gerar versão QA incremental pelo atualizador existente quando autorizada, preservar saves/pacote/assinatura, receber evidência física quando necessária e só então avançar. Armazém construível já validado isoladamente no commit 8e6c383, run 45937733207; permanece em branch separada e será priorizado como entrega individual de construção após o lote atual, sem incorporar por antecipação. Manter EFG CI Recovery, testes direcionados, checkpoints e regressão final; não confundir CI verde com atualização publicada ou conclusão funcional. Não liberar o gate final RC 0.2.0 antes dos requisitos obrigatórios. Dev Center pausado por solicitação do proprietário; manter contexto local atualizado. CI main 45938764924 em execução na consulta, build/checkpoint aprovado e regressão em andamento. Nenhuma alteração funcional ou de publicação neste checkpoint.


## Alteração de ordem aprovada — 27/11/2026
Progressão antecipada antes de construção. Proprietário aprovou nove funcionalidades e décima frente interna de missões básicas recorrentes, sem conteúdo indisponível, exclusivamente mural perto da casa, HUD translúcido e calendário real. QA 0.2.2, demais frentes inalteradas. Validar progressão antes de avançar.


## Refinamento estrutural aprovado
0.2.3 aprovada em teste físico pelo proprietário. Oito commits encadeados para QA 0.2.4; sem releases intermediárias. Território, hidrografia, topografia, circulação, ambientação, expansão, cartografia, validação. Natureza e pecuária permanecem fases próprias, sem simulação de funções ausentes.

## Revisão aprovada — EFG Lote Integrado
Lote atual: 1 arquitetura, 2 expansão, 3 zoneamento, 4 construção, 5 pecuária. Commits encadeados e um candidato QA, sem etapas intermediárias publicadas. Não declarar equivalência final; complementar construção avançada e pecuária após teste físico. Próximas frentes: residência, personagem, pomar/cultivo livre, fabricação, refinamento e validação; cavalo pessoal, pastoreio, transporte, ranchos NPC e cidade mantidos no roadmap. Multiplayer exige infraestrutura própria.
