# Printer Cat

Aplicación web instalable (PWA) para imprimir texto, imágenes, códigos QR y códigos de barras en impresoras térmicas Bluetooth tipo "Cat Printer" (GB01/GB02/GB03, MX05/MX06/MX10, YT01, SC03h…) desde **Chrome/Edge en Windows** y **Chrome en Android**.

## Requisitos

- Node.js 20+
- Chrome o Edge con Bluetooth activado (Web Bluetooth). Safari/iPhone no es compatible.
- La app debe abrirse en `localhost` o por **HTTPS**.

## Uso

```bash
npm install
npm run dev          # http://localhost:5173 en el PC
npm run test         # pruebas unitarias
npm run build        # versión de producción en dist/
```

### Probar desde el celular Android

Opción A (USB): activa la depuración USB y ejecuta `adb reverse tcp:5173 tcp:5173`; luego abre `http://localhost:5173` en Chrome del celular.

Opción B (Wi-Fi): `npm run dev:https` y abre `https://<IP-del-PC>:5173` en el celular (acepta el aviso del certificado autofirmado).

Opción C: publica `dist/` en GitHub Pages o Netlify (ya usan HTTPS) e instala la app desde el menú de Chrome → "Instalar aplicación".

## Primera conexión con un modelo nuevo (p. ej. SC03h)

1. Enciende la impresora. **No** la emparejes desde la configuración de Windows/Android; la conexión la hace el navegador.
2. Pulsa **Conectar** y elige la impresora en la lista.
3. Abre **Diagnóstico**: verás los servicios GATT y el protocolo detectado.
4. Pulsa **Imprimir patrón de prueba**.
   - Sale bien → listo.
   - Sale "en espejo" cada 8 puntos → en Ajustes cambia el orden de bits a MSB.
   - Sale cortado o con rayas → baja "Bytes por escritura" (p. ej. 20) o sube la pausa.
   - Sale muy claro/oscuro → ajusta "Oscuridad".
   - No sale nada → prueba otro protocolo en Ajustes. Si ninguno funciona, captura el tráfico de la app oficial con el "Registro de búsqueda de HCI Bluetooth" de Android (Opciones de desarrollador) y analízalo en Wireshark; usa "Enviar bytes" en Diagnóstico para reproducir los comandos.

## Arquitectura

| Carpeta | Contenido |
|---|---|
| `src/ble/` | Conexión Web Bluetooth (`connect.ts`), envío en trozos con control de flujo (`link.ts`), CRC-8 y perfiles de protocolo (`profiles/`) |
| `src/render/` | Bloques del documento, texto con fuentes, imágenes con tramado (Floyd–Steinberg, Atkinson, Bayer, umbral), QR y códigos de barras, empaquetado a bits |
| `src/hooks/` | Estado de la impresora y de las fuentes |
| `src/ui/` | Editor, vista previa, diagnóstico y ajustes |

### Protocolo clásico

Servicio `ae30`, escritura en `ae01`, notificaciones en `ae02`. Cada paquete es
`51 78 CMD 00 LEN_L LEN_H DATOS… CRC8 FF`. La impresora no tiene fuentes: todo se envía como filas de 384 puntos (48 bytes) con el comando `A2`, o comprimidas con `BF`.
