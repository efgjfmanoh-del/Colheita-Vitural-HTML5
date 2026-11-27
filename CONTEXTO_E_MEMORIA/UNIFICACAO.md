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
