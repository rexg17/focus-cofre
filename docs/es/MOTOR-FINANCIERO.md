# Motor financiero

🌐 [English](../en/FINANCIAL-ENGINE.md) · [Português](../pt-BR/MOTOR-FINANCEIRO.md) · **Español** · [← README](../../README.es.md)

Las reglas de negocio están en `web/js/02-calculos.js`, `08-coach.js`, `09b-canal.js` y `09c-cerebro.js`.
Todo se calcula en euros; los importes en otras monedas se convierten con el tipo de cambio de la transacción.

## Renta disponible y regla de reparto

```
ingresos     = ingresos personales + ingresos de trabajo (salario × pagas, extras, proyectos cobrados, canal)
disponible   = ingresos − coste de trabajo (IA y herramientas) − reserva fiscal
saldo libre  = disponible − necesidades − deseos − invertido
```
La regla 50/30/20 por defecto (necesidades/deseos/invertir) es configurable. **Pagas extra:** con 14 pagas, junio y
diciembre cuentan el doble.

## Coste esencial y objetivos

- **Coste esencial medio** = media de las necesidades de los últimos 3 meses (el actual y los dos anteriores) **sin** los
  pagos de deuda, **más** el pago mínimo de las deudas activas. No incluye costes de trabajo (desaparecen si el trabajo para).
- **Objetivo de caja** = meses de caja (por defecto 1) × esencial. **Objetivo del fondo de emergencia** = meses (por defecto 6) × esencial.
- El objetivo **no depende del mes que se muestra en pantalla** ni se infla con pagos extra de deuda (fallos reales que
  la auditoría encontró y que las pruebas ahora cubren).

## Capacidad mensual

Media, en los últimos 3 meses con ingresos, de `saldo libre + invertido + pagado en deuda`. Sumar de nuevo lo pagado en
deuda evita que saldar deuda «reduzca» la capacidad de ahorro.

## Pasos

1. Organizarse (ingresos, cuentas y ≥ 8 movimientos/suscripciones) → 2. Formar el colchón de caja → 3. Saldar deudas →
4. Fondo de emergencia → 5. Invertir cada mes (% objetivo de la renta disponible) → 6. Ingresos extra (objetivo definido por el usuario).

El paso actual es el primero sin completar. Cada paso tiene un progreso de 0 a 100 %.

## Próxima acción

Un conjunto de reglas produce candidatas con prioridad y detalles (`det`), por ejemplo: saldo negativo (98), cobros
atrasados (90), revisión pendiente (88), caja por debajo del objetivo (85), deuda (80), fondo de emergencia (60–75),
límites superados (65), reserva fiscal ausente (62). La de mayor prioridad se convierte en «tu próxima acción», con la
tabla de cifras que la justifica.

## Plan del mes («págate primero»)

Reparte la capacidad mensual: caja (hasta el 60 % si hay más metas) → deuda de mayor interés (hasta el 70 % del resto si
el fondo de emergencia está incompleto) → fondo de emergencia → invertir el excedente.

## Deudas (avalancha)

Cada mes: interés mensual (`tipo/12`), pago mínimo de todas las deudas y todo el presupuesto restante en la de
**mayor interés**. Devuelve los meses hasta saldar y los intereses totales estimados (límite de 600 meses).

## Nota de salud (0–100)

| Componente | Peso |
|---|---|
| Fondo de emergencia | 25 |
| Deudas | 20 |
| Ahorro del mes | 20 |
| Caja | 15 |
| Ingresos de trabajo (la concentración en un cliente los reduce) | 10 |
| Constancia (semanas seguidas de revisión, máx. 4) | 10 |

## Previsión de caja (6 meses)

Saldo inicial = cuentas de caja. Cada mes: entradas (salario × pagas, entradas recurrentes, proyectos previstos, media de
ingresos del canal) − salidas (fijos recurrentes, suscripciones, el **mayor** entre el gasto variable medio y los
movimientos explícitos, pago mínimo de las deudas). El saldo mostrado es antes de transferir al fondo de emergencia o a deudas.

## Hábitos y anomalías

- **Categoría por encima de lo normal:** gasto del mes > 1,5× la media de los 3 meses anteriores, con media ≥ 20 € y diferencia ≥ 30 €.
- **Gasto aislado:** importe > 4× la mediana de la categoría en los últimos 90 días (mínimo 5 movimientos y 80 €).
- **Tendencias:** pendiente (regresión lineal) de la tasa de ahorro y del gasto en los últimos 4 meses; el coeficiente de
  variación de los ingresos de trabajo avisa de ingresos volátiles.

## Saldo estimado de cuentas

`saldo informado + Σ movimientos vinculados a la cuenta con fecha posterior a la última actualización`, convirtiendo monedas.
Importar un extracto con columna de saldo actualiza el saldo y la fecha de la cuenta.

## Canal de contenido

Los requisitos de monetización (YouTube y Twitch) están en una tabla editable en el código; la app avisa de que cambian.
**Fecha estimada:** regresión lineal sobre las últimas semanas de una métrica acumulativa (suscriptores, horas, seguidores);
exige ≥ 3 registros y crecimiento positivo. Las métricas de ventana móvil (minutos en 30 días, etc.) muestran solo el estado.

## Impuesto sobre ganancias (España, referencia)

Escala del ahorro por tramos: 19 % hasta 6.000 €, 21 % hasta 50.000 €, 23 % hasta 200.000 €, 27 % hasta 300.000 €,
28 % por encima. Se aplica a la ganancia total como si se vendiera todo. Es una estimación educativa; confirma los valores vigentes.
