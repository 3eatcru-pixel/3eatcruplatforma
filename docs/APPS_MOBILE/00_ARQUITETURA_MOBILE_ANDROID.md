# Apps Mobile — Arquitetura e fontes consolidadas

Esta página substitui a antiga descrição de sensores, PWA e integração Android. Para evitar divergências entre documentos, a implementação atual e seus limites estão nas fontes abaixo:

- [Aplicações Auxiliares](../04_APLICACOES_AUXILIARES.md): apps `/waiter` e `/driver`, comportamento real/simulado e limites operacionais.
- [Aplicativos e módulos do Store OS](../OS/03_APLICATIVOS_E_MODULOS.md): estado de cada módulo e janela eApp no desktop.

As rotas `/waiter` e `/driver` são interfaces web separadas do desktop `/os`. Não declare integração nativa Android, câmera, GPS em segundo plano, pareamento de terminal ou KDS sem evidência no código atual.
