# PG-08G.2D — Recomendaciones

**Aviso:** todas las recomendaciones de este documento son `PROPOSED`. Ninguna
ha sido autorizada por el usuario y ninguna modifica el comportamiento actual.

## 1. Recomendaciones principales

| Bloqueo | Recomendación principal | Estado | Decisión humana |
|---|---|---|---|
| R-B1 | Política A de D4-G2: capacidad **por propietario**, con tres contadores desacoplados C2/C3/C4. El número definitivo se deja a elección del usuario; `4` sigue siendo valor de prueba. | `PROPOSED` | Sí: valor de C2 y momento de aplicación |
| R-B2 | Mantener `C3=0` con `single` para el piloto; habilitar `bounded` en fase posterior solo con cola acotada y drenaje previo a la puesta al día. | `PROPOSED` | Sí: activar o no `bounded` y valor de C3 |
| R-B3 | No crear C4 en el piloto; si se crea, debe ser un contador independiente y su valor decidido por el usuario. | `PROPOSED` | Sí: existencia del contador y valor |
| R-B4 | `single` para v1; `bounded` queda diferido hasta decidir `maxEvents` y `maxWindowMs`. Ante ausencia de tope, `UNRESOLVED_POLICY` sin generar. | `PROPOSED` | Sí: política y, si procede, ambos números |

## 2. Alternativas conservadoras

| Bloqueo | Alternativa conservadora |
|---|---|
| R-B1 | Inyectar C2 como parámetro en un store en memoria; sin número definitivo ni migración. |
| R-B2 | `single`, sin cola y sin persistencia nueva; rechazo con `CAPACITY_EXHAUSTED` sin consumir idempotencia. |
| R-B3 | Incubación por marcas de tiempo, sin cupo y con `UNKNOWN_HATCH_CYCLES`. |
| R-B4 | `single` con reloj inyectado y una sola evaluación por puesta al día; sin compensación. |

## 3. Qué puede resolverse sin nueva decisión humana

Solo los puntos ya autorizados y verificables, documentados para evitar que se
reabran por error:

| Punto | Estado | Evidencia |
|---|---|---|
| 2 Pokémon por guardería | `DECIDED` | `AGENTS.md` §Guarderías compartidas; D4-G2 §4.1 |
| 1+1 huevos por ciclo | `DECIDED` | PG-08F `RIESGOS-Y-DECISIONES.md:5`; D9-G2 §9.1 |
| `claimed` libera capacidad | `DECIDED` por comportamiento | D4-G2 §4.6; `CAPACIDAD-Y-ATOMICIDAD.md` |
| Propiedad por rol | `DECIDED` | PG-08F `DISTRIBUCION-1-1.md` |
| Atomicidad solo intra-SQLite | `DECIDED` como alcance | PG-08F `ATOMICIDAD-Y-CONCURRENCIA.md` |
| `realPkm:false` / `exportable:false` | `DECIDED` como alcance | G2 `ARQUITECTURA-GENETICA-V2.md`, `LEGALIDAD-Y-PKHEX.md` |
| `UNKNOWN_RULES` para reglas no verificadas | `DECIDED` como contrato técnico | G2 `CONTRATOS-GENERACIONALES.md`, `ARQUITECTURA-GENETICA-V2.md` |

**Ninguno de estos puntos fija C2, C3, C4, `maxEvents` ni `maxWindowMs`.**
Por ello R-B1…R-B4 no pueden pasar a `DECIDED` por iniciativa del agente.

## 4. Secuencia recomendada de decisiones

1. **R-B1**: elegir política de capacidad y valor de C2. Sin esto, no hay
   definición de «lleno».
2. **R-B2**: elegir `single` o `bounded`. Si es `bounded`, fijar C3.
3. **R-B4**: fijar `maxEvents` y `maxWindowMs` solo si se eligió `bounded`.
4. **R-B3**: decidir si existe C4 y, en su caso, su valor. Puede diferirse sin
   bloquear el piloto Gen II.
5. Confirmar que el RNG de producción sigue fuera de alcance (G3-0.5) y que el
   bug `InheritIVs` de Gen III se difiere (G3-0.4).

## 5. Consecuencia global de no decidir

El piloto Gen II puede ejecutarse con store en memoria y sin declararse listo
para uso, pero no puede pasar a persistencia real ni ampliarse a Gen III–V.
Esta fase termina sin autorizar PG-08G.3.
