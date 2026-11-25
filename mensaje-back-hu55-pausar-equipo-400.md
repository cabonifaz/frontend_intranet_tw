# HU-55 — `POST /pausar-equipo-abierto` devuelve 400 en pre-prod

**Para:** Bryan / Cristopher
**Ambiente:** pre-prod (`backendintranettw-preprod.up.railway.app`)
**Fecha:** 2026-11-25

## Qué pasó

En el flujo nuevo del front (modal "Comenzar registro" antes de la ficha, HU-55 — commit front 521590b + 91c6b7c), la Asistente:

1. Abre el modal Detalle del Servicio de **OS-000024**.
2. Entra al tab **Avance por Equipos**.
3. Clickea **"Registrar informe"** en el equipo **EQ-TW-2026-0009** (idOsEquipo=76), que está PENDIENTE pero el técnico ya tiene abierto otro equipo (EQ-TW-2026-0007, idOsEquipo=75, EN EJECUCIÓN).
4. Aparece el modal "El técnico tiene otro equipo en ejecución · Pausar y continuar" (ok, correcto).
5. Clickea **"Pausar y continuar"**.
6. El front dispara:
   ```
   POST https://backendintranettw-preprod.up.railway.app/api/intranet/servicios/29/equipos/76/pausar-equipo-abierto
   Body: { "motivo": null }
   ```
7. **Back responde `400`**. El toast muestra el mensaje genérico del envelope y el modal no avanza al "Comenzar registro".

## Contexto

- IdOs = 29 (OS-000024)
- IdOsEquipo del equipo que la Asistente quiere registrar = 76 (EQ-TW-2026-0009)
- IdOsEquipo del otro equipo que el técnico tiene abierto en ejecución = 75 (EQ-TW-2026-0007)
- El tab Avance por Equipos ya trae `otroEquipoAbierto: "INS-CALI-LB-003"` para idOsEquipo=76 (bien) — así que el front sabe que tiene que pausar antes.

## Posibles causas que vale la pena chequear

- El endpoint recibe el **idOsEquipo del equipo nuevo (76)** como parámetro de ruta, pero quizá espera el **idOsEquipo del equipo abierto a pausar (75)**. Confirmame qué id manda la ruta y qué id manda el body.
- El `motivo: null` que el front envía. ¿Lo quieren opcional de verdad o es `required`? Mi contrato dice opcional.
- Validación del estado del otro equipo: ¿el back requiere que el equipo 75 esté estrictamente `EN EJECUCIÓN` y hay un race con el estado del back?

## Lo que necesito

Un ejemplo claro del request que el endpoint espera (ruta + body) y qué `IdTipoMensaje` + mensaje devuelve en cada caso de error. Con eso ajusto el front si hace falta.

Mientras tanto el flujo "Pausar y continuar → Comenzar registro" queda bloqueado en pre-prod; el resto de HU-55 (modal Comenzar directo, ficha wizard, badge Mód 12) funciona.
