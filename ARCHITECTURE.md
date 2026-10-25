# Arquitectura y migración

```text
Mando Shield
  → MainActivity / Cursor (ventanas, teclas, cookies, permisos)
  → tv_core + tv_screens + tv_player (UI, foco, pantallas, caché)
  → music_backend.js (contrato explícito de sesión, catálogo y reproducción)
  → instancia MusicKit de music.apple.com
  → reproductor web / WebView / Widevine del dispositivo
```

La UI ya no accede directamente a `MusicKit.getInstance()`, tokens, `_whenConfigured` ni `api.music`.
El adaptador concentra esos detalles. El contrato incluye:

- Disponibilidad y sesión: `ready`, `configured`, `isAuthorized`, `previewOnly`, `storefrontId`, `authorize`, `unauthorize`, `watchSession`.
- Reproducción: `setQueue`, `play`, `pause`, `seekToTime`, `skipToNextItem`, `skipToPreviousItem`, `playNext`, `playLater`.
- Estado observable: `playbackState`, `isPlaying`, tiempos, elemento actual, cola, shuffle/repeat, eventos con alta/baja explícita.
- Catálogo/biblioteca: `request` y `send`, con rutas `/v1/` y origen fijo. Los tokens no se devuelven a UI/Java ni se guardan en archivos del proyecto.
- Diagnóstico: capacidades AAC/EME y sesión sin credenciales. Capacidad de Widevine NO significa licencia ni reproducción comprobada.

El contrato inicial mantiene los nombres de eventos/estados y las estructuras de metadatos que ya utiliza la UI. Una implementación nativa deberá normalizarlos a ese contrato; no basta con reemplazar una línea. Esta separación de responsabilidades no es un aislamiento de seguridad: ambos módulos JS siguen viviendo en la página web.

Dependencias frágiles aisladas: instancia de MusicKit configurada por el sitio, `_whenConfigured`, eventos de reflexión de autenticación, flag `previewOnly`, endpoints editoriales/favoritos de AMP y forma de sus respuestas. Apple puede cambiarlas sin avisar. El flag de preview no sustituye una prueba de canción completa.

## Fase 2: investigación futura

Apple publica bibliotecas nativas de autenticación y reproducción para Android: [MusicKit](https://developer.apple.com/musickit/).
Antes de reemplazar el backend:

1. Obtener el SDK oficial y revisar sus términos de uso/distribución, versión, minSdk, dependencias y presencia de `arm64-v8a` dentro de los AAR.
2. Probar autorización real en Android TV 11. Confirmar si depende de la app oficial de Apple Music y si el flujo admite mando.
3. Usar identidad y tokens de desarrollador propios por mecanismos oficiales; nunca incluir una clave privada `.p8` en la APK. Esta fase web no exige una clave propia porque se apoya en el sitio existente.
4. Probar primero AAC completo y estabilidad de sesión con el SDK nativo. Mapear cola, estado y errores al contrato de la UI.
5. Investigar por separado si el SDK, la autorización DRM y el catálogo permiten solicitar Atmos; después validar el formato realmente recibido y la salida HDMI/AVR. Que la Shield reproduzca Atmos con otras apps no prueba que MusicKit lo permita.

No hay backend nativo ni soporte Atmos implementado en esta entrega. No se extraen claves DRM ni se descifran streams fuera del reproductor de Apple.
