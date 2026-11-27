# COLHEITA VITURAL — Roadmap Mestre aprovado
27/11/2026 · referência publicada QA 0.2.8 (d78ee8e, run 45987016528). Proprietário aprovou TODAS as propostas consolidadas no chat, incluindo complementos, e ativou EFG Lote Integrado. Este arquivo é a referência de requisitos, não evidência de conclusão. 9 fases, 49 subetapas, 14 lotes. Estados: [x] só após evidência; base parcial não é concluída. Aprovação física/artística e publicação oficial são gates distintos. Ordem pode ser ajustada por dependências, sem eliminar escopo.
## Fase 01 — Fundação e aprimoramento
- [ ] 01.01 Arquitetura: chunks 32m como base, coordenadas estáveis, prefetch direcional, descarga de geometria/objetos/vegetação/construções, LOD, simulação próxima/intermediária/distante/descarregada, independência de física e renderização, offline, transições sem telas de loading durante viagem. Base de terreno 0.2.8 validada em CI; não streaming completo.
- [ ] 01.02 Expansão: montanhas, colinas, vales, planícies, florestas, campos, rios, lagos, cachoeiras, mar, estradas, pontes, trilhas, terrenos compráveis, continuidade, recursos, preservar Terralta. Oeste é experimental, comparar norte/leste além do rio antes de decisão definitiva.
- [ ] 01.03 Zoneamento: residência, agricultura, pomar, bovinos, ovinos (campo distante amplo), suínos (lama), galinhas, patos (água), equinos, floresta, indústria rural, comércio. Estudar acesso, relevo, água e distância; espécies exclusivas, preservação dos animais legados.
- [ ] 01.04 Construção universal: planejamento transparente de vários projetos, posicionar/rotacionar, fundação/estrutura/cobertura/equipar, materiais, estilos/cores/acabamentos, ampliação modular, reparo/pintura, demolição e restituição parcial, colisão, desbloqueios. Catálogo: celeiro, galinheiro, estábulo, chiqueiro, aprisco, viveiro, armazém, oficina, estufa, cerca, portão, ponte, cisterna/reservatório, comedouro, bebedouro, ninho, poleiro, lanterna, banco, vaso, placa, pérgola, decorações. QA 208 só construções fixas em 3 estágios.
## Fase 02 — Residência e personagem
- [ ] 02.01 Casa completa: primeiro/segundo andar, escada real, cozinha/sala/quarto/banheiro, paredes/oclusão/telhado, portas/janelas/cortinas, colisões móveis, ampliação largura/comprimento/cômodos, iluminação por ambiente, pisos/paredes/telhados, móveis livres, decoração. Preservar arquitetura e referência aprovada.
- [ ] 02.02 Interações: cama 30min/1h/6h, sofá/banco, fogão (salada, omelete, peixe com cenoura), geladeira/despensa, pia/chuveiro/higiene, guarda-roupa, rádio, lareira, varanda, fotografias em quadros.
- [ ] 02.03 Aparência: altura/porte/proporções, pele, rosto, olhos/nariz/boca, cabelo/cores, barba/bigode, camisa/calça/bota/chapéu, luvas/óculos/acessórios, conjuntos trabalho/passeio/chuva/descanso, nome/aniversário/perfil, rotação/preview. Preservar paletas anteriores.
- [ ] 02.04 Animações: caminhada/corrida/transições, ferramenta específica, caixas/sacos/cestos, plantar/regar/colher, corte/mineração/pesca/cozinha/construir/reparar, sentar/dormir/banho, carinho/alimentar/escovar, montar/desmontar, contato físico.
## Fase 03 — Agricultura, pomar e natureza
- [ ] 03.01 Agricultura: solo/umidade/fertilidade/compactação, canteiros livres tamanho/direção, enxada inteligente arar/remover, ação contínua ao segurar, plantio individual/sequencial, regador/reabastecimento cisterna/mangueira/aspersor/gotejo, estágios e animações por espécie, 4 qualidades (comum/boa/excelente/premium), pragas visíveis/tratamentos, ervas/capina, compostagem/esterco, rotação, sementes próprias, estações/estufa.
- [ ] 03.02 Culturas: preservar 12 atuais (trigo, milho, arroz, morango, alface, cenoura, ervilha, manjericão, tomate, brócolis, girassol, nabo); expandir feijão, batata, mandioca, abóbora, cebola, pimentão, demais hortaliças, café/cacau/cana/uva, rosa e flores brasileiras. Não confundir setores desenhados com culturas implementadas.
- [ ] 03.03 Pomar: maçã/banana/laranja/manga/goiaba/coco/acerola, plantio livre, muda/crescimento/floração/frutificação/repouso, sazonalidade, poda, colheita individual, qualidade, propagação, receitas.
- [ ] 03.04 Silvicultura: verde/cerejeira/nativas, tipos de madeira, crescimento/envelhecimento, direção de queda/galhos/mudas, remover toco e colisão após queda, regeneração/reflorestamento/solo livre, superar limite 24 com testes.
- [ ] 03.05 Mineração: pedra/argila/carvão/ferro/cobre/areia/minerais especiais, picaretas, impacto/rachaduras/partículas, depósitos e renovação.
- [ ] 03.06 Pesca: pontos identificados, rios/lagos/mar, tilápia/traíra/lambari/pacu/pintado/dourado, varas/linhas/anzóis/iscas, resistência/tensão, horário/clima/estação, peso/tamanho, recordes/enciclopédia, comércio/cozinha/processamento, recuperação.
- [ ] 03.07 Coleta: cogumelos/plantas medicinais/frutos silvestres/flores/fibras/ervas/galhos.
## Fase 04 — Fabricação e administração
- [ ] 04.01 Fabricação universal: receitas/desbloqueios, bancadas, materiais reais, tempo/fila/lotes, qualidade/habilidade, ferramentas/móveis/equipamentos/decoração/subprodutos.
- [ ] 04.02 Cadeias: trigo>farinha (moinho), leite>queijo, frutas>geleias, lã>tecido, madeira>móveis, mel>mel envasado/cera, milho>ração, argila>tijolo, esterco>adubo, café>torra; oficina/marcenaria/serraria/forja/olaria/tear/composteira/cozinha.
- [ ] 04.03 Inventário: categorias recolhíveis, pesquisa/favoritos/ordenação, seleção múltipla/transferência em lote, atalhos, descrição/uso/qualidade, histórico, comparar ferramentas, organização automática.
- [ ] 04.04 Armazém central construído pelo jogador (não baús soltos), celeiro funcional para feno/ração, despensa/geladeira, oficina, silo/reservatório; capacidades, setores, transferência, ocupação.
- [ ] 04.05 Economia: oferta/demanda, sazonalidade, qualidade/quantidade, vendas/encomendas/contratos, compra/venda animal/terreno/equipamento, reputação/negociação, livro-caixa receitas/despesas/lucros diário/semanal/mensal/anual.
## Fase 05 — Animais e companheiros
- [ ] 05.01 Pecuária: capacidade por instalação, ID/nome/sexo/idade/raça/personalidade, fome/sede/saúde/higiene/descanso/afinidade, reservas independentes, produção por cuidado, crescimento visual, dia/clima, sombra/água/abrigo, navegação e portões, pastagem regenerável, limpeza/esterco; saída ao pasto e recolhimento físico ao anoitecer; ampliar limite global 10 após benchmark.
- [ ] 05.02 Genética: machos/fêmeas, maturidade, seleção, gestação/incubação/nascimento/crescimento, hereditariedade pelagem/porte/produção, genealogia/consanguinidade, cruzar em ranchos vizinhos, comércio de animais.
- [ ] 05.03 Habitats exclusivos: bovinos pasto/curral/ordenha/bezerro; ovinos campo amplo/aprisco/tosquia; porcos lama/área seca/drenagem; galinhas ninho/poleiro/pintinhos; patos lagoa/natação/mergulho/abrigo; equino estábulo pessoal. Migrar animais antigos sem perda.
- [ ] 05.04 Cachorro: nome, coleira/acessórios, alimentação/água/carinho, personalidade, afinidade com níveis/benefícios, bola/graveto, treinamento, acompanhar viagem, proteger, comandos seguir/ficar/buscar/reunir/conduzir/recolher/guardar; pastoreio físico sem teleport.
- [ ] 05.05 Gato: personalidade/afinidade/necessidades, brinquedos, coleira/acessórios, explorar casa/jardim, dormir móveis, roedores, interação com companheiros.
- [ ] 05.06 Cavalo companheiro: adotar/nome/raça/aparência, estábulo, feno/ração/água, cenoura na mão, carinho/escovar/higiene, afinidade/treino, sela/rédeas, montar/desmontar/chamar, passo/trote/galope, resistência/estabilidade/peso, pastoreio/transporte/viagens.
- [ ] 05.07 Apicultura: colmeias, manejo, mel/cera, polinização, flores, beneficiamento/comércio.
- [ ] 05.08 Piscicultura: tanques/viveiros/espécies, alimentação/crescimento/reprodução/qualidade água/colheita/comércio, integração.
## Fase 06 — Transporte e exploração
- [ ] 06.01 Logística: a pé/cavalo/carretas pequenas e grandes, atrelar fisicamente, rodas/colisões/carga/peso/velocidade, estradas/pontes/portões adequados.
- [ ] 06.02 Mecanização: ferramentas melhores, tração animal, arados/semeadores/irrigação/trituradores/processadores, máquinas pequenas/tratores/implementos, manutenção, manual continua válido.
- [ ] 06.03 Exploração/acampamento: trilhas/panoramas/segredos, barraca/fogueira/descanso em viagem, pesca/coleta distante/raridades, registro de descobertas.
- [ ] 06.04 Atlas: bússola correta, minimapa, zoom, descoberta, marcadores, distâncias/rotas/ETA, companheiros, instalações/status, pesca/recursos/terrenos/ranchos/cidades/comerciantes, filtros, clima regional, navegação.
## Fase 07 — Mundo social
- [ ] 07.01 Ranchos NPC offline: propriedades conectadas, donos/personas/especialização, visitas/comércio/compra-venda/cruzamento/contratos/cooperação/amizade/reputação, comprar propriedades.
- [ ] 07.02 Cidade: feira, loja agrícola, veterinário, marcenaria, ferraria, mercado animal, restaurante, administração, roupas, oficina; viagens reais a cavalo/carroça sem loading perceptível.
- [ ] 07.03 NPCs: nomes/histórias/profissões/personas, rotinas/horários/diálogos, amizade/presentes/visitas/pedidos/reputação/convites.
- [ ] 07.04 Cultura: festas juninas, feiras/exposições, concursos de colheita/pesca, festivais gastronômicos, celebrações sazonais, receitas/produtos/arquitetura/identidades brasileiras.
- [ ] 07.05 Multiplayer separado: visitar ranchos de amigos, comércio/cruzamentos/cooperação/projetos/decoração, permissões, proteção/sincronização; modo principal offline preservado.
## Fase 08 — Imersão e evolução
- [ ] 08.01 Ecossistema: pássaros/borboletas/abelhas/insetos/silvestres/roedores, vegetação sazonal, ciclos, relações, polinização, recursos, vento/copa/correnteza/horário/clima.
- [ ] 08.02 Calendário/clima: dia/mês/ano/estação/aniversário/evento, chuva/poças/lama/irrigação, tempestade/raios/trovões/abrigo, vento/vegetação/roupa, calor/evaporação/sombra, frio/neblina, previsão, sono, simulação longe da fazenda; evitar punição exagerada offline.
- [ ] 08.03 Profissões livres: agricultor/pecuarista/fruticultor/equino/apicultor/piscicultor/pescador/silvicultor/minerador/marceneiro/construtor/artesão/comerciante/cozinheiro/explorador/floricultor. Sem classes fixas.
- [ ] 08.04 Progressão: XP geral e por atividade, níveis/árvores/pontos/vantagens/receitas/ferramentas/técnicas/manejo/eficiência/reputação/títulos/conquistas/histórico.
- [ ] 08.05 Missões: diárias/semanais/mensais, NPC/contrato/entrega/recuperar terrenos/trabalho em ranchos/pedido/desafio/descoberta/objetivo longo, recompensas.
- [ ] 08.06 Som: espacial rio/cachoeira/vento/folha/pássaros/grilos/animais/chuva no telhado/passos por solo/cascos/rodas/ferramentas, músicas por região/horário, transição interior-exterior, volumes separados.
## Fase 09 — Qualidade transversal
- [ ] 09.01 UX: HUD reposicionável/recolhível, joystick posição/tamanho/sensibilidade/transparência, ação contextual inteligente, ícones, barra configurável, menus responsivos, câmera/zoom/perfis, gamepad mapeável, foto com filtros/horário/enquadramento/HUD oculto e quadros, notificações, tutoriais, manual/acessibilidade.
- [ ] 09.02 Arte: preservar referência, proporções/material/textura/luz/sombra/reflexo/água/animação/transições/clima/partículas; comparação de capturas reais e aprovação.
- [ ] 09.03 Performance: meta 60 FPS sustentados e 16,67ms no Poco X7 Pro; medir FPS/p95/RAM/CPU/GPU/bateria/temperatura/carregamento/APK/sessões/viagens; perfis econômico/equilibrado/alto, adaptação por desempenho/temperatura, streaming/LOD/IA/física. Sem garantia sem aparelho.
- [ ] 09.04 Saves: auto/manual/backup/exportar/importar/recuperar/arquivar/histórico/persistir região/migrar/validar integridade/recuperar transações/preservar patrimônio/assinatura/rollback.
- [ ] 09.05 Atualizador: verificar/notificar/baixar em segundo plano/jogar durante download/progresso/retomar/integridade/instalação Android autorizada/relatório pós-update/QA-RC-produção/Dev Center quando disponível.
- [ ] 09.06 QA: unitários/integração/regressão/colisão/economia/inventário/migração/viagem/rebanho/benchmark físico/arte/assinatura/RC/publicação oficial mediante autorização.
## Lotes (ordem aprovada, entregas incrementais quando necessário)
01 QA 208 publicada: base mundo/expansão/zoneamento/construção/pecuária, não final.
02 residência, personagem, pomar/cultivo livre, fabricação.
03 construção modular, agricultura inteligente, inventário/armazém.
04 pecuária individual, genética, reprodução, habitats.
05 cavalo, cão pastor, gato.
06 pesca, mineração, silvicultura, coleta.
07 abelhas/peixes/cadeias.
08 carroças/logística/mecanização/exploração.
09 economia/profissões/progressão.
10 expansão/ranchos/NPCs.
11 cidade/serviços/relacionamentos/eventos.
12 ecossistema/clima/som/imersão.
13 consolidação mapa/arte/UX/estabilidade/RC.
14 multiplayer independente.
## Gates e dependências
Base técnica 208 aprovada no CI; inspeção física/arte pendente. 02 exige save compatível e interações locais; 03 depende de motor de construção/cultivo e inventário; 04 exige zonas e construção; 05 depende de navegação e pecuária; 06 usa natureza e streaming; 07 depende de produção/água; 08 exige cavalo/estradas/carga; 09 usa produção e comércio; 10–11 exigem streaming/estradas/NPC/logística; 12 acompanha mundo; 13 exige todas as frentes verificadas; 14 infraestrutura online própria. Para cada entrega registrar requisitos afetados, testes, logs, SHA, artefatos, limites e validação física. Nenhum lote subsequente deve atropelar falhas críticas. 
## Princípios permanentes
Energia do jogador ilimitada; liberdade profissional; identidade rural brasileira; viagem contínua; realismo divertido sem burocracia; offline principal; objetos funcionais físicos; habitats exclusivos; saves/patrimônio/configurações/assinatura preservados; interface bonita intuitiva personalizável; performance permanente; sem release oficial com falhas; sem regressão; EFG Master Standard 2.2 e EFG Lote Integrado. Integração: milho > ração > animais > esterco/adubo ou leite > queijo > transporte/cidade > renda > expansão; nenhuma função isolada. 

## Checkpoint QA 209 (candidato)
Primeiro recorte do lote 02: 02.02 cozinha/pia, 02.03 detalhes opcionais de aparência, 03.03 três frutíferas e 04.01/04.02 receitas e venda. Todos ainda parciais, pendentes de gates CI e físicos. Continuar 02.01 segundo andar/escadas, demais interações, aparência completa, 03.01 canteiros livres e demais 03.03/04.01. Lotes 03–14 mantidos. Nenhuma caixa de conclusão marcada sem evidência.

- Recuperação 209: run 45991095712 falhou no gate de boot; build/unitários verdes, publicação bloqueada. Instrumentação de diagnóstico adicionada para identificar causa raiz em nova execução; nenhuma subetapa marcada como concluída.

- Recuperação 209 (run 46030343965): material procedural do avatar corrigido sem alterar o escopo. Regressão integral pendente; nenhuma subetapa concluída por inferência.

- QA 209 publicada (run 46038078246, 4/4 jobs); aprovação física/arte pendente. QA 210: complemento transversal 09.05 solicitado, acesso à central pelo quarto botão do menu inicial, status de versão e disponibilidade, sem Sair; implementado, regressão e teste físico pendentes. Continuidade do lote 02 preservada.

- QA 210: 03.03 expandida para sete espécies físicas e 04.02 quatro produtos de fruta (oficina), preservando os três estoques antigos. Testes e inspeção física pendentes; não conclui as subetapas. 09.03: captura física pontual de 119,2 FPS na 0.2.9 em alta definição; revisão estética geral solicitada após implementação, sem dispensar regressões críticas.

- QA 210: run 46041144746 aprovou 3 gates técnicos; publicação pulada. 04.01 avançou para fila FIFO temporizada persistente da oficina, reserva e recolhimento presencial, ainda não toda a fabricação universal. Novos testes pendentes de execução remota.

- QA 210: run 46042261467 aprovou fabricação temporizada; 02.01 avançou para escada de 12 degraus e piso superior com vão, limites e oclusão. Regressão remota e avaliação física/visual pendentes; residência completa continua aberta.

- QA 210: run 46043824105 aprovou base reta. Escada em L aprovada, substituída por dois lances, patamar e alvo de mão no corrimão. Planta: sala/cozinha separadas no térreo; quarto/banheiro e varanda de flores no superior. Animação dedicada, divisão e varanda permanecem abertas.

- 02.01: proprietário optou por circulação manual contínua sem animação guiada. Escada em L preservada; suporte suavizado entre degraus, limite local de velocidade, sem inércia na escada, abertura física e pórtico superior. Testes direcionados e nova regressão obrigatória. Porta e divisão dos cômodos, varanda cultivável e aprovação visual/física pendentes.

- QA 210: run 46049762646 aprovou escada manual e assinatura. 02.01: divisória física sala/cozinha, passagem aberta e corredor para escada implementados; testes integrados pendentes. Porta móvel, cômodos superiores e varanda/jardim permanecem abertos.

- QA 210: divisória térrea aprovada no build/regressão 46054934705, assinatura ainda em andamento na consulta. 02.01/02.02: quarto e banheiro com paredes no superior, cama, guarda-roupa e pia deslocados ao piso correto, três portas internas deslizantes funcionais em código. Nova regressão pendente; varanda/jardim, equipamentos de banheiro e acabamento continuam abertos.

- QA 210: run 46055514193 aprovou quartos/portas/assinatura. 02.01/02.02: varanda superior frontal recuada com abertura, guarda-corpo, vasos e rega inicial, mantendo cultivos inferiores. Nova CI e inspeção física/visual pendentes; não equivale a jardim avançado ou residência completa.

- QA 210: run 46057405633 aprovou varanda e rega. 02.01/02.02 avançam com seis móveis complementares, higiene persistente no chuveiro/vaso e geladeira como consulta do estoque real. Nova regressão pendente; armazenamento dedicado, demais interações, acabamento e aprovação física ainda abertos.
