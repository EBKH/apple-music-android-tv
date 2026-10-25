# Pruebas de aceptación en Shield

Dispositivo objetivo: NVIDIA Shield TV Pro, Android TV 11 / API 30, SHIELD Experience 9.2.4.
La aceptación exige evidencia real; las pruebas de Java/JS no certifican login, DRM ni audio.

## Registro mínimo

Anotar versión APK, fecha, Android/API, ABI, versión del WebView, región de la cuenta (solo país), salida de audio y resultado de cada caso.
No registrar correo de Apple, contraseña, códigos 2FA, cookies, tokens, cuerpos de licencias DRM ni capturas de pantallas con credenciales.

| ID | Prueba concreta | Criterio de aprobación |
|---|---|---|
| I1 | Instalar APK y abrir desde la fila de aplicaciones | Aparece AMTV Shield, abre en horizontal, sin exigir pantalla táctil ni crashear |
| I2 | Revisar Settings → Diagnostics | API 30, ARM64, WebView identificado; Widevine y EME disponibles. Solo precondición, no prueba DRM |
| L1 | Sign In, Apple ID, contraseña, 2FA, Continue usando el mando | Llega a Home y Library; cada campo/botón es alcanzable; no requiere ratón |
| L2 | Cancelar login con Back y reintentarlo | Vuelve a una pantalla usable y permite un nuevo intento sin congelarse |
| L3 | Cuenta de región distinta de US, p. ej. MX si corresponde | Región de catálogo coincide con la cuenta; el cambio de región no pierde la sesión |
| L4 | Cerrar app, volver a abrir y después reiniciar Shield | Conserva sesión o pide login claramente; no muestra biblioteca de una sesión anterior |
| D1 | Reproducir una canción del catálogo de más de 4 minutos desde 0 | Sonido continuo después de 90 s, después de 180 s y hasta el final; no solo preview |
| D2 | En otra canción, buscar hasta 2:30 y reproducir 60 s más | Posición y audio avanzan; no se reinicia ni queda limitado a 30/90 s |
| D3 | Reproducir tres canciones consecutivas, luego 30 minutos de una lista | Avance automático y audio estable, sin expulsión de sesión ni silencios inesperados |
| D4 | Settings → Diagnostics durante sesión y verificar audio por diagnóstico del dispositivo si está disponible | Autorizado, no preview. Confirmar AAC por evidencia del decodificador; no inferir codec/bitrate del badge o de que haya sonido |
| D5 | Perder sesión o revocarla y pulsar Play | Pausa y muestra Sign In; no reproduce previews como si fueran canciones completas |
| B1 | Library → álbumes, artistas, canciones y listas | Contenido coincide con la app oficial; distingue vacío, cargando y error |
| B2 | Abrir una lista de más de 100 canciones y llegar al final | Paginación completa, sin duplicados ni omisiones; reproduce un elemento posterior al 100 |
| P1 | Lista personal y lista de catálogo: Play, Shuffle, elegir canción intermedia | Cola correcta, índice inicial correcto y siguiente canción del mismo contexto |
| P2 | Play Next y Play Last mediante pulsación larga | Cola refleja el orden solicitado y reproduce la siguiente esperada |
| P3 | Agregar una canción de prueba a biblioteca/favoritos y verificar en app oficial | Cambio persiste; restaurar el estado inicial después. Hacerlo solo con un elemento elegido por el usuario |
| R1 | Recorrer Home, Browse, Radio, Library, Search, Settings con flechas/OK/Back | Foco visible, sin callejones sin salida ni activaciones dobles |
| R2 | Buscar con teclado de TV y volver con Back | Escribe y borra, cierra teclado, conserva foco en resultados |
| R3 | Play/Pause, siguiente/anterior, mantener OK y avanzar/retroceder | Cada pulsación genera una sola acción; pulsación larga abre menú sin reproducir accidentalmente |
| R4 | Home y volver; apagar/encender pantalla; desconectar/reconectar mando | Al salir se pausa; retorno estable; no recreación destructiva al reconectar el mando |
| S1 | Sign Out y relanzar | No conserva cookies ni biblioteca/historial de búsqueda de la sesión; solicita autorización otra vez |
| S2 | Navegación fuera de los orígenes aprobados, HTTP, file/content, SSL inválido | Se bloquea; no se ignoran errores TLS ni se conceden cámara/micrófono |
| S3 | APK normal: comprobar que no hay inspección WebView de este proceso | `debuggable=false` y sin socket de depuración WebView; permisos mínimos |
| N1 | Cortar/reponer internet durante reproducción y navegación | Error comprensible y recuperación/reintento; no sustituir reproducción protegida con previews |

Una radio que suena o una canción de 90 segundos no aprueban D1. No exportar tráfico de autenticación ni claves de medios para comprobar DRM.

## Verificación local reproducible

```sh
node --test tests/backend.test.mjs
mkdir -p build-tests
javac -d build-tests src/com/megarohas/amtv/WebPolicy.java tests/WebPolicyTest.java
java -cp build-tests com.megarohas.amtv.WebPolicyTest
```

Integración UI con datos simulados, sin conexión a Apple ni audio real:

```sh
npm install --prefix ../test-tools --no-save --package-lock=false --ignore-scripts jsdom@26.1.0
AMTV_JSDOM_MODULE="$PWD/../test-tools/node_modules/jsdom/lib/api.js" node tests/ui-smoke.mjs
```

La prueba de UI verifica foco de Sign In, pantallas Home/Library/Settings, pérdida de autorización con menú abierto, nuevo login y detección de preview-only. No reemplaza R1–R4 en el mando físico.
