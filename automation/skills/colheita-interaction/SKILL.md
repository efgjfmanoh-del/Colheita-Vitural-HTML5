---
name: colheita-interaction
description: Padrão obrigatório de interação, HUD e painéis rurais do Colheita Vitural.
---
# Padrão oficial de interação
Aprovado em 27/11/2026. Complementa EFG MASTER STANDARD 2.2.
- Todo sistema de interação física deve usar a proximidade real do jogador, inclusive nível/altura e obstáculos quando aplicável. Exibir ícone contextual do HUD existente, com rótulo acessível e significado correto. Ocultar ao afastar-se ou abrir outro modo incompatível; negar ações remotas também na lógica.
- Reutilizar os painéis, componentes, paleta rural verde/dourada, cabeçalho e distribuição já aprovados. Não introduzir estilos desconexos ou uma tela cheia para cada ação simples.
- Separar estado, estoque, ações e resultados. Ícones legíveis, texto em português, indicadores reais, alvos de toque adequados, feedback de erro e acessibilidade. Nada de controles decorativos ou dados fictícios.
- Usar seções recolhíveis para grupos extensos; preservar escolha ao atualizar o painel. Ações urgentes (ex. fisgada) não podem ficar ocultas em um grupo recolhido. HUD não deve sobrepor joystick, mapa ou controles.
- Preservar saves, progresso, assinatura e desempenho. Não alterar arte aprovada sem consentimento.
- Testar proximidade e afastamento, ação remota negada, estado e persistência, expansão/recolhimento, toque mobile, geometria, captura visual real e regressão final. Separar emulação de aprovação no hardware. Falha bloqueia publicação e exige correção.
- Aplicar a pesca, criação, floresta, mineração, armazém, oficina, residência e sistemas futuros. Usar componentes rurais compartilhados no código.

## Exceção aprovada em 27/11 — ações de coleta imediata
Árvore e pedra: proximidade substitui o botão de correr pelo machado/picareta; cada toque executa um golpe animado, sem abrir painel ou mochila. Afastar restaura corrida. Recompensa apenas no último golpe, queda/fragmentação antes de desaparecer, remoção da colisão e renovação natural persistente. Pesca: pontos específicos identificados no atlas/minimapa; painel contextual permitido. Atlas deve permitir seleção/centralização e filtros recolhíveis.
