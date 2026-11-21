# Decisiones de diseño

🌐 [English](../en/DESIGN-DECISIONS.md) · [Português](../pt-BR/DECISOES.md) · **Español** · [← README](../../README.es.md)

Cada decisión recoge el contexto, la elección y el precio que se paga por ella.

## 1. Local-first con SQLite
**Contexto:** los datos financieros son sensibles y la app la usa una sola persona.
**Elección:** todo en un SQLite local, sin cuentas ni servidor remoto.
**Precio:** no hay sincronización entre dispositivos. Mitigación: copia diaria, carpeta extra de copias y exportación en texto.

## 2. Escribir el estado completo en una transacción
**Elección:** `PUT /api/state` valida todo y sustituye las tablas dentro de un `BEGIN IMMEDIATE`; cualquier error lo deshace.
**Por qué:** es sencillo de razonar y no puede dejar la base de datos a medias.
**Precio:** coste proporcional al tamaño del estado. Medido: con 20.000 movimientos la pantalla se renderiza en unos 50 ms.

## 3. Dinero en céntimos y cambio por transacción
**Elección:** `INTEGER` en céntimos en la base de datos; cada elemento en moneda extranjera guarda el tipo de cambio de ese día.
**Por qué:** evita errores de redondeo e impide que cambiar el tipo hoy reescriba los ingresos de meses antiguos (un fallo
real que encontró la auditoría).

## 4. JavaScript sencillo, sin framework y sin compilación
**Elección:** módulos clásicos cargados en orden, estado global y renderizado con plantillas de cadena.
**Por qué:** cero cadena de herramientas, fácil de leer y de empaquetar.
**Precio:** no hay tipos ni componentes. El archivo único para publicar lo genera `tools/bundle.py`.
**Si crece:** pasar a módulos ES y TypeScript, manteniendo el motor financiero como funciones puras.

## 5. Motor financiero en el navegador; el servidor solo persiste
**Por qué:** la pantalla recalcula en cada clic y las herramientas de la IA se ejecutan junto a los datos. El servidor valida y guarda.

## 6. La clave de la API solo está en el servidor local
**Elección:** el navegador llama a `/api/llm`; el servidor monta la petición con el SDK oficial.
**Por qué:** la clave no aparece nunca en el JavaScript, el estado, la copia de seguridad ni la pantalla
(`/api/settings` solo dice si existe).

## 7. IA con herramientas (tool use), no con los datos en el prompt
**Elección:** la IA pide a la app cálculos (`visao_geral`, `simular_dividas`, `previsao_caixa`…) y recibe solo agregados.
**Por qué:** (a) no inventa cifras, (b) la privacidad la decide qué herramientas existen, (c) el motor local sigue siendo
la fuente de verdad, con pruebas.

## 8. No entrenar un modelo propio
Entrenar un LLM no tendría sentido para este problema. La ganancia viene de **datos correctos, reglas probadas y un buen
modelo que usa herramientas**. El coach funciona con reglas locales incluso sin la IA.

## 9. Modelo por defecto y mecanismo de respaldo
Por defecto `claude-opus-5-5`, configurable en ajustes. La app activa el mecanismo de respaldo (*fallback*) de la API por
si una respuesta se rechaza por motivos de seguridad. La petición no envía parámetros de muestreo ni desactiva el
razonamiento, y los bloques de razonamiento vuelven intactos en cada vuelta del bucle de herramientas (cubierto por una prueba).

## 10. Ventana mediante Edge/Chrome en el paquete portátil
**Contexto:** `pywebview` en Windows depende de `pythonnet`, .NET y WebView2.
**Elección:** el paquete portátil abre la dirección local en Edge/Chrome en modo aplicación (`--app=`), que Windows 10/11 ya
incluye. `pywebview` se sigue usando si está instalado (compilación con PyInstaller).
**Precio:** el ciclo de vida de la ventana hay que inferirlo; de ahí la señal de vida (`ping`/`bye`).

## 11. Paquete de Windows montado desde Linux
**Elección:** lanzador en Go (compilación cruzada trivial) + el Python oficial de NuGet + bibliotecas nativas descargadas con
`pip download --platform win_amd64`. No se instala nada en Windows y el resultado es una carpeta que se borra.
**Precio:** sin firma digital de pago, SmartScreen avisa; y el paquete no pudo ejecutarse en un Windows real aquí.

## 12. Heurísticas transparentes
Los umbrales de las reglas (60/40, 1,5× la media, etc.) son fijos y visibles. Cada acción del coach incluye una tabla
«cómo llegó la app a esto» para poder discrepar con argumentos.

## 13. Servidor falso de la API en las pruebas
Un servidor HTTP falso (`tests/fake_anthropic.py`) imita la API y registra lo que recibe. Así, las pruebas comprueban
cabeceras, cuerpo, `fallbacks`, la ausencia de parámetros prohibidos y la devolución intacta de los bloques de
razonamiento, sin clave y sin coste.
