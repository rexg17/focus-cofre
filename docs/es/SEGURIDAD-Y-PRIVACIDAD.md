# Seguridad y privacidad

🌐 [English](../en/SECURITY-AND-PRIVACY.md) · [Português](../pt-BR/SEGURANCA-E-PRIVACIDADE.md) · **Español** · [← README](../../README.es.md)

## Modelo de amenazas

La app es local: los riesgos principales son **otra página o programa que intente usar el servidor local** y **datos que
salgan del ordenador sin que lo sepas**. No es un objetivo defenderse de malware que ya se ejecuta con el mismo usuario.

## Servidor local

| Amenaza | Defensa |
|---|---|
| Un sitio externo llamando a `127.0.0.1` | Sin cabeceras CORS (el navegador bloquea la lectura) y **token por sesión** obligatorio (`X-Cofre-Token`), comparado en tiempo constante |
| *DNS rebinding* | La cabecera `Host` debe ser `127.0.0.1` o `localhost` |
| *Path traversal* en archivos estáticos | La ruta se resuelve y debe estar dentro de `web/`, con extensiones permitidas (probado: `/js/../../app.py` → 404) |
| Entrada maliciosa o corrupta | Validación estricta de tipos, tamaños y valores (`db.save_state`); límites de cuerpo (estado 20 MB, IA 2 MB, restaurar 10 KB) |
| Inyección SQL | Solo consultas parametrizadas; los nombres de tabla son constantes |
| Restaurar un archivo arbitrario | Nombre de la copia validado con una expresión regular (`cofre-AAAA-MM-DD.db`), comprobación de integridad y copia de seguridad previa |

El servidor no registra el contenido de las peticiones.

## Clave de la API de Claude

- Se guarda en `settings.json`, en la carpeta de datos del usuario, con permiso `0600` donde hay soporte.
- **Nunca** se envía al navegador: `/api/settings` solo indica si existe una clave. Tampoco forma parte del estado ni de las copias.
- Limitación: el archivo es texto plano. Activa el cifrado del disco (BitLocker).

## Qué se envía a la IA (y qué no)

**Se envía:** los mensajes que escribes y los resultados de las 10 herramientas: totales, medias, plazos, progreso y
nombres de categorías.
**Nunca se envía:** nombres de clientes, descripciones de movimientos, nombres de cuentas o deudas, la clave de la API ni
la base de datos. Una prueba de extremo a extremo registra textos «secretos» y comprueba que ninguno aparece en ninguna
petición a la API.
La pantalla muestra la última petición en «Qué envía la app a la IA».
Los mensajes que escribes son texto libre: lo que escribas viaja con ellos.

## Datos en reposo y copias de seguridad

La base de datos **no está cifrada** por la app. Las copias diarias (las 14 últimas) quedan en la carpeta de datos; se
puede configurar una carpeta extra (OneDrive, Dropbox, memoria USB). Quien sincronice esa carpeta con la nube lleva los datos allí.

## Carencias conocidas

- Sin cifrado de la base de datos (se recomienda el cifrado de disco).
- Binario sin firmar: SmartScreen avisa en la primera ejecución.
- Sin autenticación entre procesos locales del mismo usuario.
- Los tipos impositivos y los requisitos de las plataformas son referencias educativas y pueden estar desactualizados.
