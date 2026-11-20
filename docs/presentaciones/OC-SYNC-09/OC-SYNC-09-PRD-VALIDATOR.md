# OC-SYNC-09 — Fase 4: auditoría de los dos FAIL del validador PRD

Misión: **OC-SYNC-09 (Tarra Terra)**. Fecha: 20-nov-2026. Ámbito: **solo lectura**. No se han modificado el PRD, el validador, sus copias aisladas, código, BD, fixtures, ROMs ni saves. No se han ejecutado commits ni pushes.

## 0. Evidencias verificadas

| Elemento | Ruta | SHA-256 |
|---|---|---|
| Validador original | `/tmp/opencode/stitch06-refs/prd-validator.txt` | `9a8a76ffd2d7bfb7ca318c1622bc689c702d3035458d83734cc33efb82c2b989` |
| Copia aislada ejecutada | `/tmp/opencode/oc-stitch-08-validator/verify-prd-conformance.ts` | `9a8a76ffd2d7bfb7ca318c1622bc689c702d3035458d83734cc33efb82c2b989` |
| PRD canónico original | `/tmp/opencode/stitch06-refs/prd-master.json` | `3601b9a6d0f8cc4a78a9d3bba059f65f136c6697a57c4ffaab00b99acf0bcb9f` |
| Copia aislada pasada como argumento | `/tmp/opencode/oc-stitch-08-validator/prd-canonical.json` | `3601b9a6d0f8cc4a78a9d3bba059f65f136c6697a57c4ffaab00b99acf0bcb9f` |
| Matriz PRD de Fase I | `docs/presentaciones/OC-STITCH-08/OC-STITCH-08-PRD-MATRIX.md` | `69266e3bb76d1afb694434af4dbb6c607a799383e54f5086e1feb79e8a749679` |

Los cuatro hashes se recalcularon en esta misión y coinciden con los declarados en `OC-STITCH-08-PRD-MATRIX.md` §1 y en `docs/presentaciones/OC-STITCH-08/evidencias/prd-validador-entorno.json`. Por tanto la ejecución anterior usó exactamente los archivos canónicos, sin modificación.

Resultado literal conservado (`evidencias/prd-validador.stdout.txt`, `.stderr.txt`, `.exit.txt`):

- `RESUMEN FINAL: 5/6 Suites superadas (40 aserciones evaluadas)`.
- `ESTADO GLOBAL DE CONFORMIDAD: NO CONFORME`.
- Suite 04 (`COBERTURA DE DOMINIOS FUNCIONALES`, 10 aserciones) en `FAIL`; las otras cinco en `PASS`.
- stderr, dos líneas: `RF-01.1 debe exigir Guardería Bi-Plaza (2/2 Pokémon)` y `RF-01.4 debe incluir Crianza Biológica y eclosión Phione`.
- Código de salida: `1`. El comando usó `env -i HOME PATH` y pasó el PRD como argumento explícito (`prdPath = process.argv[2] || "docs/prd-canonical.json"`, validador líneas 430-438), de modo que **no** se usó el JSON incrustado de reserva.

## 1. Qué comprueba realmente el validador

Código original, líneas 251-267 del validador (literal):

```ts
// Comprobación específica Dominio 01: 2 plazas y 6 constantes vitales
const nursery = this.prd.domains.find((d) => d.domain_id === "01_CORE_NURSERY");
if (nursery) {
  const hasBiPlaza = nursery.features.some(
    (f) => f.code === "RF-01.1" && f.specs.includes("2/2 Pokémon")
  );
  this.assert(result, hasBiPlaza, "RF-01.1 debe exigir Guardería Bi-Plaza (2/2 Pokémon)");
  ...
  const hasPhioneBreeding = nursery.features.some(
    (f) => f.code === "RF-01.4" && f.specs.includes("Phione")
  );
  this.assert(result, hasPhioneBreeding, "RF-01.4 debe incluir Crianza Biológica y eclosión Phione");
}
```

**VERIFICADO:** ambas aserciones exigen una cadena literal dentro del campo `specs`. No consultan `title`, `status` ni ningún otro campo. No inspeccionan la aplicación: la matriz de Fase I lo resume como «el validador solo audita el documento PRD, no la implementación».

## 2. Qué dice el PRD canónico

`domains[01_CORE_NURSERY].features` del PRD pasado al validador:

| Código | `title` | `specs` |
|---|---|---|
| `RF-01.1` | `Guardería Bi-Plaza (2/2 Pokémon)` | `Capacidad máxima de 2 especímenes simultáneos con cuidado delegado y titularidad protegida.` |
| `RF-01.4` | `Crianza Biológica y Eclosión Phione` | `Generación simétrica de 2 huevos con cooldown de 15 min a 3 horas y eclosión en 4 etapas.` |

Recuento literal en todo el documento: `"2/2 Pokémon"` aparece **1 vez** y `"Phione"` aparece **1 vez**, en sendos `title`. Ninguna de las cinco features del dominio 01 los contiene en `specs` (`RF-01.1.specs.includes("2/2 Pokémon") = false`; `RF-01.4.specs.includes("Phione") = false`).

Además, el JSON incrustado de reserva del propio validador (líneas 509-530) reproduce exactamente la misma discrepancia: títulos con los literales y `specs` sin ellos. Es decir, el fallo no depende de que se haya pasado el PRD por argumento; el validador es internamente coherente en su propio error de redacción de aserciones.

## 3. Respuesta a las tres hipótesis planteadas

### 3.1 ¿El validador está mal? — **SÍ, como comprobación semántica**

**VERIFICADO:** es una comprobación frágil y engañosa: exige literales exactos en un campo concreto (`specs`) y ignora que el mismo documento expresa la bi-plaza como «2 especímenes simultáneos» y sitúa «Phione» en el título de `RF-01.4`. Un PRD semanticamente equivalente no puede satisfacer la aserción sin cambiar redacción. No se ha corregido ni se propone código nuevo: la misión prohíbe modificar el validador.

### 3.2 ¿El PRD no contiene esos textos? — **SÍ en `specs`, NO en el documento**

**VERIFICADO:** ambos textos están presentes, pero solo en `title` (una aparición cada uno). Por eso un corrector superficial que busque `"Phione"` en el JSON encontraría coincidencia y podría concluir erróneamente que el validador se equivoca por completo. La causa precisa es **desalineación campo-a-campo**: `title` vs `specs`.

### 3.3 ¿Hay funcionalidad incompleta? — **SÍ, pero es una dimensión distinta y no explica estos dos FAIL**

**VERIFICADO por documentación preexistente:**

- `docs/informes/auditorias/PG-STITCH-01/04_CONTRADICCIONES_Y_DECISIONES.md`, C15: la capacidad de dos plazas corresponde a **guarderías compartidas (PG-08)**; el modo local actual tiene **una mascota activa**. El mockup de «Guardería (2/2 Pokémon)» no debe interpretarse como dos mascotas activas en local.
- La misma fuente, C13: «Manaphy + Ditto → Phione presentado como decidido» es una **propuesta de Stitch**; requiere aprobación y validación PKHeX. C14 añade que la eclosión en cuatro etapas y «2 huevos» no son reglas respaldadas.
- `docs/BREEDING_DESIGN_RFC.md` líneas 10-20 confirma como decisiones propias del proyecto las dos plazas, la crianza entre propietarios, las compatibilidades y «se contemplarán excepciones como Manaphy y Ditto», sin fijar la regla Phione ni su resultado.
- `OC-STITCH-08-PRD-MATRIX.md` §2.3 clasifica la emulación, FSM y otras funciones como `PENDIENTE`/prototipo, y §4 recuerda que no se reejecutaron pruebas funcionales en esa misión.

Por tanto la existencia de funcionalidad pendiente es real, pero **no es lo que mide la suite 04**, y no debe inferirse incumplimiento de la app a partir de estos dos FAIL. Esta misión no ha ejecutado pruebas funcionales nuevas.

## 4. Conclusión y bloqueo

**VERIFICADO:** el estado `NO CONFORME` (EXIT 1, 5/6, 40 aserciones, dos FAIL) es literal y reproducible a partir de entradas byte-idénticas. La causa de los dos FAIL es una desalineación entre el validador y el PRD, ya diagnósticada en `OC-STITCH-08-PRD-MATRIX.md` §2.1 y en `../OC-STITCH-07/OC-STITCH-07-VALIDATOR-AUDIT.md`; esta auditoría independiente confirma ese diagnóstico con el código y el JSON originales.

**BLOQUEADO:** «arreglar» el PRD añadiendo `"2/2 Pokémon"` o `"Phione"` a `specs` para satisfacer el validador daría por decididas mecánicas que el proyecto trata como propuestas (regla Phione, eclosión, dos huevos) o mezclaría el modo local con las guarderías compartidas. Modificar el validador para mirar `title` también excede la autorización de esta misión. No se propone ningún cambio funcional ni de redacción: hace falta una decisión explícita del usuario sobre qué documento es autoridad y qué redacción debe prevalecer.

**PENDIENTE DE COMPROBAR:** si la corrección se autorizara, habría que decidir si se ajusta la aserción, el PRD o ambos, y ejecutar de nuevo el validador sin forzar el resultado. Nada de eso se ha realizado aquí.

## 5. Límites

- No se ha reejecutado el validador en esta misión: se han verificado hashes, entradas, código de aserción, resultado literal y documentación, sin alterar ninguno.
- No se ha usado el modelo de imagen: no hay revisión visual asociada a este documento.
- No se han tocado los otros archivos nuevos de `docs/presentaciones/OC-SYNC-09/` ni ningún archivo protegido.
