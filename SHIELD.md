# AMTV Shield: instalación y desarrollo

Variante para uso personal de [megarohas/apple-music-android-tv](https://github.com/megarohas/apple-music-android-tv), basada en 1.0.5 (`8df530e3e7591974cf41b1ef88d02ede4c294535`). Código MIT; atribuciones y licencia Apache 2.0 de los iconos conservadas en el repositorio y en la APK.

## Estado

Versión actual: **1.0.5-shield.4 / 10504**, paquete `com.megarohas.amtv.shield`.
Prueba manual reportada en NVIDIA Shield TV Pro con Android 11 / API 30 y WebView 155:

- Canciones completas, incluida una de 4:09 minutos.
- Biblioteca, portadas e interfaz para mando.
- Radio y reproducción de estaciones después de la corrección .3.

Estas pruebas no garantizan compatibilidad con todos los dispositivos, persistencia de sesión a largo plazo ni bitrate/codec efectivo. El objetivo es audio web estándar AAC; no se implementan Dolby Atmos ni lossless. La UI sigue alojada en WebView, separada del backend de reproducción. No se publica en Play Store.

## Pantalla negra bajo demanda

Seleccionar **Black screen** en Now Playing o Settings. La app cubre toda su interfaz con negro sólido, manteniendo el audio. No hay temporizador ni se apaga físicamente la TV. La primera pulsación del mando solo muestra la interfaz; también se consume su repetición y liberación para evitar cambios de pista o pausas accidentales. Un cambio real de foco o toque también muestra la interfaz. El modo no persiste al salir/reabrir y nunca tapa login/carga.

Pruebas locales de estado y UI aprobadas. La apariencia, continuidad de audio y mando físico de esta función quedan pendientes de confirmación en Shield.

## Instalar

La app no necesita conocer la IP de la Shield. La dirección se usa únicamente en la computadora para ADB y puede cambiar sin recompilar.

1. En Shield: Ajustes → Preferencias del dispositivo → Información → pulsar siete veces Compilación.
2. Abrir Opciones para desarrolladores y habilitar Depuración de red.
3. Con ambos equipos en la misma red, sustituir `SHIELD_IP` por la dirección local y aceptar la autorización en la TV:

```sh
adb connect SHIELD_IP:5555
adb -s SHIELD_IP:5555 install --no-incremental -r build/amtv.apk
adb -s SHIELD_IP:5555 shell am start -n com.megarohas.amtv.shield/com.megarohas.amtv.MainActivity
```

También puede copiarse la APK por USB y abrirse con un administrador de archivos autorizado para instalar aplicaciones. El paquete es distinto del original, por lo que ambos pueden coexistir.

Iniciar sesión mediante las páginas de Apple. La contraseña y el código 2FA se introducen directamente allí. Para actualizar conservando sesión, usar siempre el mismo paquete y clave de firma. Una clave diferente impide actualizar la instalación existente.

Al terminar, desactivar Depuración de red si no se necesita. No exponer ADB a internet.

## Compilar

Requisitos: Android SDK con Build Tools 36.0.0 y plataforma android-36, JDK 17 o 21, make y zip. La APK es Java/DEX + JavaScript y recursos, sin bibliotecas nativas `.so`; Android mínimo 29, target 34. El WebView y Widevine los aporta el dispositivo.

Crear una clave de desarrollo fuera del repositorio, si aún no existe:

```sh
keytool -genkeypair -keystore /ruta/privada/shield-dev.keystore \
  -storepass android -keypass android -alias androiddebugkey \
  -keyalg RSA -keysize 3072 -validity 3650 \
  -dname 'CN=AMTV Shield Development'
```

El alias y contraseña anteriores son la configuración de desarrollo del Makefile, no credenciales de Apple ni una configuración de firma de producción. Mantener la clave fuera de Git; no se distribuye ninguna clave privada en este repositorio.

```sh
AMTV_SDK=/ruta/al/sdk AMTV_JAVA_HOME=/ruta/al/jdk \
  AMTV_KEYSTORE=/ruta/privada/shield-dev.keystore tools/build-shield.sh
```

Resultado: `build/amtv.apk`. Los paths son parámetros locales; no deben convertirse en rutas personales fijas dentro del código.

La configuración opcional del dispositivo puede guardarse en `local.mk`, excluido de Git:

```make
TV = SHIELD_IP:5555
```

O pasarse únicamente al ejecutar `make install TV=SHIELD_IP:5555`. Las claves, `.env`, APK generadas, logs y archivos locales están excluidos por `.gitignore`.

## Seguridad y límites

- La APK normal desactiva depuración WebView, backup, HTTP sin cifrar, contenido mixto y acceso file/content. La actividad acepta el launcher, pero no extras externos de reproducción o modificación de favoritos.
- La navegación permite destinos HTTPS concretos de Apple, incluida la activación y los servidores numerados de retorno de cuenta de iTunes. El permiso de medios protegidos queda limitado al origen music.apple.com.
- No se observó lectura de campos de contraseña/2FA en los scripts propios. El helper de login modifica foco y presentación. Aun así, un host WebView tiene capacidad técnica de inspeccionar sus páginas: esto no es una garantía de aislamiento frente al host.
- El backend usa los tokens de la sesión del sitio exclusivamente contra el origen fijo de Apple. No se incluyen claves `.p8` ni tokens reales en el código, pruebas o repositorio. Los valores `fixture-*` de las pruebas son ficticios.
- Los logs propios omiten querystrings de login y objetos de error SDK. Sign Out intenta revocar y borra datos locales de sesión.
- Persisten dependencias del sitio, cookies de terceros, endpoints editoriales y detalles internos de MusicKit que Apple puede cambiar. El bridge nativo expone funciones limitadas de UI; la separación UI/backend no constituye una barrera de seguridad entre scripts del mismo WebView.

El [issue upstream #1](https://github.com/megarohas/apple-music-android-tv/issues/1) reporta pérdida de autorización y previews en Android 11. La variante detecta desautorización/preview-only y pide login, pero no sortea rechazos del servicio ni DRM. Reproducir canciones completas es una prueba necesaria.

Radio conserva las secciones editoriales cuando están disponibles; si falta su respuesta, muestra estaciones obtenidas de búsqueda de catálogo en la región de la cuenta. Esta alternativa no replica necesariamente toda la programación editorial del sitio.

[Arquitectura y fase 2](ARCHITECTURE.md) · [Pruebas](SHIELD-TESTS.md) · [Cambios](CHANGELOG.md)
