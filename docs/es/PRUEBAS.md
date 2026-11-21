# Pruebas

🌐 [English](../en/TESTING.md) · [Português](../pt-BR/TESTES.md) · **Español** · [← README](../../README.es.md)

Estrategia por capas. Cada capa detecta un tipo distinto de error.

| Capa | Dónde | Qué cubre | Cantidad |
|---|---|---|---|
| Unitarias e integración (Python) | `tests/test_app.py` | Base de datos, validación, migraciones, restauración, API local, token, ciclo de vida de la ventana, puente con la IA | 26 pruebas |
| Lógica financiera (Node + Chromium) | `tests/logic.test.js` | El motor de cálculo ejecutado en un navegador real, con estados construidos | 32 comprobaciones |
| Extremo a extremo (navegador) | `tests/e2e/` | Flujos completos contra el servidor real y un servidor falso de la API de Claude | 2 guiones |

## Cómo ejecutarlas

```bash
python -m unittest discover -s tests
npm install --no-save playwright && npx playwright install chromium
node tests/logic.test.js
python tests/e2e/rodar_llm.py                        # conversación con el coach
python tests/e2e/rodar_llm.py tests/e2e/fluxos.js    # extracto, canal, monedas, copia de seguridad
```

## Qué demuestran las pruebas (ejemplos)

- **Corrección del motor:** el objetivo del fondo de emergencia no cambia según el mes mostrado; pausar una suscripción
  no altera el pasado; cambiar el tipo de cambio no reescribe ingresos ya registrados; 14 pagas duplican junio y
  diciembre; la avalancha salda en N meses; el impuesto del ahorro sobre una ganancia de 10.000 € = 1.980 €; previsión de
  fecha del canal (50 suscriptores/semana → 105 días).
- **Base de datos:** dinero en céntimos sin error de redondeo; escritura de todo o nada; migración de bases antiguas
  (incluida la reconstrucción de `projetos`); restauración con copia de seguridad previa y nombres inválidos rechazados.
- **Seguridad:** token obligatorio, `Host` ajeno bloqueado, *path traversal* bloqueado, clave de la API nunca devuelta.
- **Puente con la IA (servidor falso):** el SDK envía `fallbacks="default"`, la cabecera beta, `effort`, las herramientas y
  el prompt de sistema; **no** envía `temperature` ni `thinking`; el bloque de razonamiento vuelve intacto en la vuelta
  siguiente; Haiku no recibe `fallbacks`; un 401 se convierte en un mensaje claro.
- **Privacidad:** los textos «secretos» introducidos nunca aparecen en las peticiones a la API.
- **Interfaz:** extracto con columnas de cargo/abono y saldo, importación en R$, previsión de fecha del canal, ingresos en
  US$ convertidos, restauración de copias, sin desplazamiento horizontal en el móvil en todas las pestañas.

## Fallos reales que encontraron las pruebas y la auditoría

Estos fallos existieron y se corrigieron, cada uno con su prueba de regresión:

1. El objetivo del fondo de emergencia cambiaba con el mes que mostraba la pantalla.
2. Pausar una suscripción hoy alteraba el coste de meses pasados.
3. Pagar deuda de más **aumentaba** el coste esencial y el objetivo del fondo de emergencia (pagar deuda «castigaba» al usuario).
4. Todos los importes en reales usaban el tipo de cambio actual, incluso los de meses antiguos.
5. Los extractos con columnas de cargo/abono leían cero filas y la importación no permitía elegir la moneda.
6. La pestaña del canal se desplazaba hacia los lados en el móvil (un contenedor flexible con margen automático que se encogía al contenido).

## Qué no está cubierto

- La ejecución del paquete en un **Windows real** y la ventana de Edge/Chrome.
- Una llamada real a la API de Claude (el formato se prueba contra un servidor falso).
- Pruebas automáticas de accesibilidad y de carga a gran escala.
