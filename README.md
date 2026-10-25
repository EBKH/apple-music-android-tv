# AMTV Shield — fork para uso personal, fase 1

APK experimental para NVIDIA Shield TV Pro, Android TV 11 / API 30.
Base MIT: [megarohas/apple-music-android-tv](https://github.com/megarohas/apple-music-android-tv), versión 1.0.5.

**Lee [SHIELD.md](SHIELD.md): instalación, seguridad, bloqueos, compilación y pruebas.**

- Paquete independiente: `com.megarohas.amtv.shield`.
- Objetivo: reproducción web estándar AAC. Dolby Atmos y lossless quedan fuera de esta fase.
- Botón **Black screen** en Now Playing y Settings: negro bajo demanda, audio continuo y retorno con el mando.
- UI y reproductor separados mediante `res/raw/music_backend.js`.
- Validación manual en Shield: canciones completas, biblioteca, portadas, interfaz de TV y Radio. Otros dispositivos requieren sus propias pruebas.
- No se publica en Play Store ni se envían cambios al repositorio original.

[Changelog](CHANGELOG.md) · [Arquitectura](ARCHITECTURE.md) · [Pruebas en dispositivo](SHIELD-TESTS.md)

La documentación del proyecto original se conserva en [README.upstream.md](README.upstream.md).
Sus enlaces de descarga apuntan al APK original, no a este fork.

Licencias: [MIT](LICENSE), [avisos](NOTICE), [Apache 2.0 de los iconos](LICENSE-APACHE-2.0).
