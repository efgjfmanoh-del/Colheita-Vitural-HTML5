---
name: efg-lote-integrado
description: Commits encadeados, um candidato QA e gates integrais.
---
# EFG Lote Integrado
Consultar HEAD, contexto e EFG CI Recovery. Preparar commits funcionais em cadeia, mover a branch uma única vez, executar testes, build, regressão, assinatura e integridade. Publicar somente o SHA final autorizado. Falha transitória reconhecida permite uma tentativa no mesmo SHA; determinística exige logs, correção real, novo commit e revalidação. O workflow bloqueia falhas, mas não corrige código por si só: executor ativo necessário. Uma única entrega QA, preservar versão anterior e indicar pendências físicas. Não confundir aprovação técnica com conclusão artística.
