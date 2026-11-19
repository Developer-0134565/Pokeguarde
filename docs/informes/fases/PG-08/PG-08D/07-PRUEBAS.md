# PG-08D · Pruebas

## Suite aislada

`scripts/pg08d-check.ts` — 36 casos. Cada caso usa una BD SQLite temporal en
`/tmp/opencode/pg08d-*`, la cierra y la elimina. No hay escrituras en `data/`.
No necesita servidor, sockets ni dependencias nuevas.

## Cobertura

1. Contrato, constantes y tabla provisional.
2. Pareja compatible: evaluación `ready`.
3. Pareja incompleta: `inactive`.
4. Pareja incompatible: `invalid` sin huevos.
5. Compatibilidad desconocida: no se fabrica huevo.
6. Inicio de ciclo y persistencia inmediata.
7. Intervalos: mínimo, máximo y valores inválidos.
8. Primer huevo nunca antes de una hora.
9. Segundo ciclo tras el primer huevo.
10. Persistencia del temporizador tras reinicio del proceso.
11. Idempotencia de `tick` con la misma clave.
12. Doble ejecución concurrente sobre el mismo ciclo.
13. Dos comandos concurrentes: cancelación gana.
14. Retirada por el propietario: custodia y ciclo.
15. Expulsión por el anfitrión: sin cambio de propiedad.
16. Expulsión rechazada a un anfitrión ajeno.
17. Cancelación manual y progreso descartado.
18. Nuevo depósito reinicia el ciclo desde cero.
19. Permisos desactivados por defecto.
20. Revocación impide nuevas producciones.
21. Huevo confirmado antes de la retirada se conserva.
22. Retirada un segundo antes del vencimiento.
23. Orden autoritativo ante operaciones simultáneas.
24. Retirada con anfitrión desconectado.
25. Autoridad desconectada: sin confirmación ni cambios parciales.
26. Reloj manipulado por el cliente: ignorado.
27. Reconstrucción determinista desde eventos.
28. Outbox de crianza: eventos, claves y unicidad.
29. Integridad SQLite de ambos registros.
30. Protección de saves y bases de producción.
31. Política `single`: un huevo pendiente como máximo.
32. Política `bounded`: hasta un máximo configurable.
33. Legendario compatible con condición verificable.
34. Huevos simulados: sin PKM, herencia ni saves.
35. Reanudación tras reconexión con clave nueva.
36. Proveedor de compatibilidad inyectable y verificable.

## Resultado VERIFICADO

- `bun run scripts/pg08d-check.ts` → **36 casos correctos, 0 fallidos**.
- `bun run check` → EXIT 0; incluye todas las suites previas y PG-08D 36/36.

Las pruebas no usan esperas reales de una hora: el reloj se avanza de forma
determinista. La cobertura se revisó junto al informe, no solo por el exit code.
