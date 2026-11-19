using System.Security.Cryptography;
using System.Text.Json;
using PKHeX.Core;

if (args.Length == 0)
{
    Console.Error.WriteLine("uso: pkhex inspect|inventory|export <save> [plan.json]");
    return 2;
}

var cmd = args[0];
if (cmd == "scan")
{
    var dir = args.Length > 1 ? args[1] : ".";
    var exts = new[] { ".srm", ".sav", ".dsv", ".bin" };
    foreach (var f in Directory.EnumerateFiles(dir, "*", SearchOption.AllDirectories))
    {
        if (!exts.Contains(Path.GetExtension(f).ToLowerInvariant())) continue;
        try
        {
            var bytes = File.ReadAllBytes(f);
            if (bytes.Length is not (32768 or 131072 or 524288 or 262144 or 65536)) continue;
            var s2 = SaveUtil.GetSaveFile(bytes);
            if (s2 is null) continue;
            Console.WriteLine($"{s2.GetType().Name}\t{s2.Generation}\t{s2.Version}\t{s2.OT}\t{bytes.Length}\t{f}");
        }
        catch { }
    }
    return 0;
}

if (cmd == "members")
{
    var filter = args.Length > 1 ? args[1] : "Badge";
    var typeFilter = args.Length > 2 ? args[2] : null;
    foreach (var t in typeof(SaveFile).Assembly.GetTypes())
    {
        if (typeFilter is not null && !t.Name.Contains(typeFilter, StringComparison.OrdinalIgnoreCase)) continue;
        var hits = new List<string>();
        foreach (var m in t.GetMembers(System.Reflection.BindingFlags.Public | System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.Static | System.Reflection.BindingFlags.DeclaredOnly))
        {
            if (!m.Name.Contains(filter, StringComparison.OrdinalIgnoreCase)) continue;
            hits.Add(m switch
            {
                System.Reflection.MethodInfo mi => $"M {mi.ReturnType.Name} {mi.Name}({string.Join(", ", mi.GetParameters().Select(x => x.ParameterType.Name + " " + x.Name))})",
                System.Reflection.PropertyInfo pi => $"P {pi.PropertyType.Name} {pi.Name}",
                System.Reflection.FieldInfo fi => $"F {fi.FieldType.Name} {fi.Name}",
                _ => m.MemberType + " " + m.Name,
            });
        }
        if (hits.Count == 0) continue;
        Console.WriteLine("== " + t.FullName);
        foreach (var h in hits.Distinct()) Console.WriteLine("   " + h);
    }
    return 0;
}

if (cmd == "inventory")
{
    if (args.Length < 2 || !File.Exists(args[1]))
    {
        Console.Error.WriteLine("falta la ruta del save");
        return 2;
    }
    var ipath = args[1];
    var idata = File.ReadAllBytes(ipath);
    // PKHeX conserva el mismo búfer y Write() lo modifica en sitio: hay que guardar
    // una copia intacta antes de tocar nada para poder comparar de verdad.
    var pristine = (byte[])idata.Clone();
    var inv = new Dictionary<string, object?>
    {
        ["file"] = Path.GetFileName(ipath),
        ["path"] = ipath,
        ["size"] = idata.Length,
        ["sha256"] = Convert.ToHexString(SHA256.HashData(idata)).ToLowerInvariant(),
    };
    SaveFile? isav = null;
    try { isav = SaveUtil.GetSaveFile(idata); }
    catch (Exception ex) { inv["error"] = ex.GetType().Name + ": " + ex.Message; }
    if (isav is null)
    {
        inv["detected"] = false;
        Console.WriteLine(JsonSerializer.Serialize(inv, Options.Value));
        return 1;
    }
    var strings = GameInfo.GetStrings("en");
    inv["detected"] = true;
    inv["saveType"] = isav.GetType().Name;
    inv["generation"] = isav.Generation;
    inv["version"] = isav.Version.ToString();
    inv["versionName"] = GameInfo.GetVersionName(isav.Version);
    inv["trainer"] = new Dictionary<string, object?>
    {
        ["ot"] = isav.OT,
        ["tid"] = isav.TID16,
        ["sid"] = isav.SID16,
        ["gender"] = isav.Gender.ToString(),
        ["language"] = isav.Language,
        ["money"] = isav.Money,
        ["coins"] = TryCallInt(isav, "Coins"),
        ["playTime"] = TryGetString(isav, "PlayTimeString"),
    };
    inv["badges"] = TryGetBadges(isav);
    inv["pokedex"] = ReadDex(isav);

    var partyList = new List<Dictionary<string, object?>>();
    try
    {
        int idx = 1;
        foreach (var pkm in isav.PartyData)
        {
            if (pkm.Species == 0) { idx++; continue; }
            var d = PkmJson(pkm, strings);
            d["slot"] = idx++;
            partyList.Add(d);
        }
    }
    catch (Exception ex) { inv["partyError"] = ex.Message; }
    inv["party"] = partyList;

    /* PG-07F:storage-contract:start */
    // Contrato ampliado de almacenamiento (PG-07F). Se conservan los campos
    // antiguos: boxes[].slots solo contiene Pokémon ocupados. La nueva lista
    // boxes[].positions describe TODAS las ranuras reales, incluidas las vacías.
    // Todo lo desconocido se publica como null o con un estado explícito.
    var boxes = new List<Dictionary<string, object?>>();
    var storage = new Dictionary<string, object?>
    {
        ["available"] = false,
        ["availability"] = "unavailable",
        ["boxCount"] = null,
        ["boxCountSource"] = null,
        ["slotCount"] = null,
        ["slotCountSource"] = null,
        ["boxDataSlots"] = null,
        ["namesAvailable"] = false,
        ["emptySlotsKnown"] = false,
        ["error"] = null,
    };
    try
    {
        bool hasStorage = isav.HasBox;
        int declaredBoxes = isav.BoxCount;
        int per = isav.BoxSlotCount;
        var boxAll = hasStorage ? isav.BoxData.ToArray() : Array.Empty<PKM>();
        int dataSlots = boxAll.Length;
        int derivedBoxes = per > 0 && dataSlots > 0 ? (dataSlots + per - 1) / per : 0;
        int boxCount = declaredBoxes > 0 ? declaredBoxes : derivedBoxes;
        bool namesAvailable = false;

        storage["boxCount"] = boxCount > 0 ? boxCount : null;
        storage["boxCountSource"] = declaredBoxes > 0 ? "SaveFile.BoxCount" : derivedBoxes > 0 ? "derived-from-BoxData" : null;
        storage["slotCount"] = per > 0 ? per : null;
        storage["slotCountSource"] = per > 0 ? "SaveFile.BoxSlotCount" : null;
        storage["boxDataSlots"] = dataSlots;
        storage["emptySlotsKnown"] = per > 0 && dataSlots > 0;

        for (int b = 0; b < boxCount; b++)
        {
            var slots = new List<Dictionary<string, object?>>();
            var positions = new List<Dictionary<string, object?>>();
            string? boxName = null;
            try { boxName = TryCallString(isav, "GetBoxName", b); }
            catch { boxName = null; }
            if (boxName is not null) namesAvailable = true;

            for (int j = 0; j < per; j++)
            {
                int k = b * per + j;
                PKM? pkm = k >= 0 && k < dataSlots ? boxAll[k] : null;
                bool occupied = pkm is not null && pkm.Species != 0;
                var reference = new Dictionary<string, object?>
                {
                    ["location"] = "box",
                    ["box"] = b + 1,
                    ["slot"] = j + 1,
                };
                var position = new Dictionary<string, object?>
                {
                    ["slot"] = j + 1,
                    ["occupied"] = occupied,
                    ["ref"] = reference,
                };
                if (occupied)
                {
                    var d = PkmJson(pkm!, strings);
                    d["slot"] = j + 1;
                    d["box"] = b + 1;
                    d["ref"] = reference;
                    slots.Add(d);
                    position["pokemon"] = d;
                }
                positions.Add(position);
            }

            boxes.Add(new Dictionary<string, object?>
            {
                ["index"] = b + 1,
                ["name"] = boxName ?? "",
                ["nameAvailable"] = boxName is not null,
                ["capacity"] = per > 0 ? per : null,
                ["occupied"] = slots.Count,
                ["empty"] = per > 0 ? per - slots.Count : null,
                ["positions"] = positions,
                ["slots"] = slots,
            });
        }

        storage["namesAvailable"] = namesAvailable;
        bool canMap = hasStorage && boxCount > 0 && per > 0;
        storage["available"] = canMap && dataSlots > 0;
        storage["availability"] = canMap
            ? (dataSlots > 0 ? "available" : "partial")
            : (boxCount > 0 || dataSlots > 0 ? "partial" : "unavailable");
    }
    catch (Exception ex)
    {
        inv["boxError"] = ex.Message;
        storage["error"] = ex.GetType().Name + ": " + ex.Message;
        storage["availability"] = "error";
    }
    inv["storage"] = storage;
    inv["boxes"] = boxes;
    /* PG-07F:storage-contract:end */

    var bag = new List<Dictionary<string, object?>>();
    try
    {
        foreach (var pouch in isav.Inventory.Pouches)
        {
            var items = new List<Dictionary<string, object?>>();
            foreach (var it in pouch.Items)
            {
                if (it.Count == 0) continue;
                items.Add(new Dictionary<string, object?>
                {
                    ["index"] = it.Index,
                    ["name"] = ItemName(strings, it.Index),
                    ["count"] = it.Count,
                });
            }
            if (items.Count == 0) continue;
            bag.Add(new Dictionary<string, object?> { ["pouch"] = pouch.Type.ToString(), ["items"] = items });
        }
    }
    catch (Exception ex) { inv["bagError"] = ex.Message; }
    inv["bag"] = bag;

    int invLegal = 0, invUnverified = 0, invIllegal = 0;
    var everyone = partyList.Concat(boxes.SelectMany(b => (List<Dictionary<string, object?>>)b["slots"]!));
    foreach (var mon in everyone)
    {
        switch (mon["verdict"] as string)
        {
            case "legal": invLegal++; break;
            case "unverified": invUnverified++; break;
            case "illegal": invIllegal++; break;
        }
    }
    inv["counts"] = new Dictionary<string, object?>
    {
        ["total"] = invLegal + invUnverified + invIllegal,
        ["legal"] = invLegal,
        ["unverified"] = invUnverified,
        ["illegal"] = invIllegal,
    };

    try
    {
        var outBytes = isav.Write().ToArray();
        int diff = -1;
        int n = Math.Min(outBytes.Length, pristine.Length);
        for (int i = 0; i < n; i++) if (outBytes[i] != pristine[i]) { diff = i; break; }
        if (diff < 0 && outBytes.Length != pristine.Length) diff = n;
        inv["roundTrip"] = new Dictionary<string, object?>
        {
            ["identical"] = diff < 0,
            ["inputSize"] = pristine.Length,
            ["outputSize"] = outBytes.Length,
            ["firstDiffOffset"] = diff < 0 ? null : diff,
            ["outputSha256"] = Convert.ToHexString(SHA256.HashData(outBytes)).ToLowerInvariant(),
            ["diff"] = DiffSummary(pristine, outBytes),
        };
        // Volcado opcional del resultado de Write() para analizar los bytes que difieren.
        if (args.Length > 2)
        {
            File.WriteAllBytes(args[2], outBytes);
            inv["roundTripDump"] = Path.GetFullPath(args[2]);
        }
    }
    catch (Exception ex)
    {
        inv["roundTrip"] = new Dictionary<string, object?> { ["identical"] = false, ["error"] = ex.GetType().Name + ": " + ex.Message };
    }

    Console.WriteLine(JsonSerializer.Serialize(inv, Options.Value));
    return 0;
}

if (cmd == "export")
{
    if (args.Length < 3 || !File.Exists(args[1]) || !File.Exists(args[2]))
    {
        Console.Error.WriteLine("uso: pkhex export <save> <plan.json> [--out <ruta>] [--dry] [--allow-overwrite]");
        Console.Error.WriteLine("plan: {\"reason\":\"...\",\"changes\":[{\"pid\":N|\"location\":\"party|box\",\"box\":N,\"slot\":N,\"species\":N,\"mode\":\"add|set\",\"evs\":[6]}]}");
        return 2;
    }
    var inPath = args[1];
    var planPath = args[2];
    string? outPath = null;
    bool dry = false, allowOverwrite = false;
    for (int i = 3; i < args.Length; i++)
    {
        switch (args[i])
        {
            case "--out" when i + 1 < args.Length: outPath = args[++i]; break;
            case "--dry": dry = true; break;
            case "--allow-overwrite": allowOverwrite = true; break;
        }
    }

    var rep = new Dictionary<string, object?>
    {
        ["file"] = Path.GetFileName(inPath),
        ["path"] = inPath,
        ["dry"] = dry,
    };

    var inData = File.ReadAllBytes(inPath);
    rep["inputSize"] = inData.Length;
    rep["inputSha256"] = Sha256Hex(inData);
    // Copia intacta antes de que SaveUtil/Write toquen el búfer en sitio.
    var pristine = (byte[])inData.Clone();

    SaveFile? esav = null;
    try { esav = SaveUtil.GetSaveFile(inData); }
    catch (Exception ex) { rep["error"] = ex.GetType().Name + ": " + ex.Message; }
    if (esav is null)
    {
        rep["detected"] = false;
        Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
        return 1;
    }
    rep["detected"] = true;
    rep["saveType"] = esav.GetType().Name;
    rep["generation"] = esav.Generation;
    rep["version"] = esav.Version.ToString();

    // Protocolo docs/FASE-0.md, paso 2: ida y vuelta sin cambios, byte a byte.
    byte[] baseline;
    try { baseline = esav.Write().ToArray(); }
    catch (Exception ex)
    {
        rep["roundTripIdentical"] = false;
        rep["error"] = "Write() falló: " + ex.GetType().Name + ": " + ex.Message;
        Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
        return 1;
    }
    var identical = baseline.Length == pristine.Length && baseline.AsSpan().SequenceEqual(pristine);
    rep["roundTripIdentical"] = identical;
    // Decisión 18-nov-2026: la salida es la forma canónica completa de PKHeX. Un parche
    // mínimo sobre el original rompe los checksums (el de Gen 1 cubre justo el relleno
    // que PKHeX normaliza: medido, 0x0E guardado frente a 0x02 calculado), y conservar
    // bytes que PKHeX considera incorrectos exige reimplementar sus checksums. Se informa
    // del coste: "normalization" resume los bytes que PKHeX corrige al reescribir.
    rep["normalization"] = DiffSummary(pristine, baseline);

    JsonDocument planDoc;
    try { planDoc = JsonDocument.Parse(File.ReadAllText(planPath)); }
    catch (Exception ex)
    {
        rep["error"] = "plan ilegible: " + ex.GetType().Name + ": " + ex.Message;
        Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
        return 2;
    }
    var root = planDoc.RootElement;
    if (root.TryGetProperty("reason", out var reasonEl)) rep["reason"] = reasonEl.GetString();
    var changes = new List<JsonElement>();
    if (root.TryGetProperty("changes", out var chEl) && chEl.ValueKind == JsonValueKind.Array)
        foreach (var e in chEl.EnumerateArray()) changes.Add(e);
    if (changes.Count == 0)
    {
        rep["error"] = "el plan no trae cambios";
        Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
        return 2;
    }

    int gen = esav.Generation;
    var estr = GameInfo.GetStrings("en");
    var results = new List<Dictionary<string, object?>>();
    bool anyWorsened = false, anyChanged = false, anyError = false;

    foreach (var c in changes)
    {
        var r = new Dictionary<string, object?>();
        uint cpid = c.TryGetProperty("pid", out var pidEl) ? pidEl.GetUInt32() : 0u;
        int cspecies = c.TryGetProperty("species", out var spEl) ? spEl.GetInt32() : 0;
        string cmode = c.TryGetProperty("mode", out var modeEl) ? (modeEl.GetString() ?? "add") : "add";
        var delta = new int[6];
        if (c.TryGetProperty("evs", out var evEl) && evEl.ValueKind == JsonValueKind.Array)
        {
            int k = 0;
            foreach (var v in evEl.EnumerateArray()) { if (k < 6) delta[k++] = v.GetInt32(); }
        }
        string cloc = c.TryGetProperty("location", out var locEl) ? (locEl.GetString() ?? "") : "";
        int cbox = c.TryGetProperty("box", out var boxEl) && boxEl.ValueKind == JsonValueKind.Number ? boxEl.GetInt32() : 0;
        int cslot = c.TryGetProperty("slot", out var slotEl) && slotEl.ValueKind == JsonValueKind.Number ? slotEl.GetInt32() : 0;
        r["pid"] = cpid;
        r["species"] = cspecies;
        r["mode"] = cmode;
        r["requested"] = delta;

        (PKM Pkm, string Location, int Box, int Slot, int Index)? found = null;
        if (cloc.Length > 0 && cslot > 0) found = FindBySlot(esav, cloc, cbox, cslot);
        if (found is null && cpid != 0) found = FindByPid(esav, cpid);
        if (found is null)
        {
            r["ok"] = false;
            r["error"] = cloc.Length > 0
                ? "no hay ningún Pokémon en esa ubicación (location party|box, box y slot en base 1)"
                : "no hay ningún Pokémon con ese PID en el save";
            anyError = true;
            results.Add(r);
            continue;
        }
        var (pkm, location, box, slot, index) = found.Value;
        r["location"] = location;
        r["box"] = location == "box" ? box + 1 : null;
        r["slot"] = slot + 1;
        r["foundPid"] = pkm.PID;
        r["speciesName"] = SafeSpecies(estr, pkm.Species);
        if (cspecies != 0 && pkm.Species != cspecies)
        {
            r["ok"] = false;
            r["error"] = "la especie del slot no coincide con el plan (identidad bloqueada)";
            anyError = true;
            results.Add(r);
            continue;
        }

        var before = ReadEvs(pkm);
        var laBefore = new LegalityAnalysis(pkm);
        var verdictBefore = VerdictOf(laBefore);
        var issuesBefore = LegalityIssues(laBefore).Select(CleanIssue).ToArray();
        var target = ApplyEvs(before, delta, cmode, gen);
        r["before"] = before;
        r["target"] = target;
        r["verdictBefore"] = verdictBefore;
        if (target.SequenceEqual(before))
        {
            r["ok"] = true;
            r["changed"] = false;
            r["after"] = before;
            r["verdictAfter"] = verdictBefore;
            results.Add(r);
            continue;
        }

        // Escritura real en el slot y relectura: PKHeX vuelve a ser la autoridad.
        var applied = target;
        StoreSlot(esav, location, index, PrepareForWrite(pkm, applied, location));
        var (readBack, la2) = ReloadAndAnalyze(esav, location, index);
        var verdictAfter = VerdictOf(la2);
        var issuesAfter = LegalityIssues(la2).Select(CleanIssue).ToArray();
        bool worsened = VerdictRank(verdictAfter) > VerdictRank(verdictBefore);

        // Sin EXP ganada PKHeX solo admite EV de vitamina (múltiplos de 10 hasta 100
        // en Gen 3+). Se recorta al mayor valor legal y se informa de lo retenido.
        if (worsened)
        {
            var nuevos = issuesAfter.Where(x => !issuesBefore.Contains(x)).ToArray();
            if (nuevos.Length > 0 && nuevos.All(IsEvExpIssue))
            {
                var clamped = VitaminClamp(target, before, gen);
                if (!clamped.SequenceEqual(target))
                {
                    StoreSlot(esav, location, index, PrepareForWrite(pkm, clamped, location));
                    (readBack, la2) = ReloadAndAnalyze(esav, location, index);
                    var v2 = VerdictOf(la2);
                    if (VerdictRank(v2) <= VerdictRank(verdictBefore))
                    {
                        applied = clamped;
                        verdictAfter = v2;
                        issuesAfter = LegalityIssues(la2).Select(CleanIssue).ToArray();
                        worsened = false;
                        r["capped"] = true;
                        r["withheld"] = Enumerable.Range(0, 6).Select(i => target[i] - clamped[i]).ToArray();
                        r["note"] = $"Sin EXP ganada cada stat solo admite múltiplos de {(gen <= 2 ? 2560 : 10)} hasta {(gen <= 2 ? 25600 : 100)}; lo retenido queda pendiente para cuando gane EXP.";
                    }
                }
            }
        }

        r["after"] = applied;
        r["readBack"] = readBack;
        r["verdictAfter"] = verdictAfter;
        r["issuesAfter"] = issuesAfter;
        if (worsened)
        {
            anyWorsened = true;
            r["worsened"] = true;
        }
        r["ok"] = true;
        bool changedNow = !applied.SequenceEqual(before);
        r["changed"] = changedNow;
        if (changedNow) anyChanged = true;
        results.Add(r);
    }

    rep["changes"] = results;
    rep["anyWorsened"] = anyWorsened;
    rep["anyChanged"] = anyChanged;

    if (anyWorsened)
    {
        rep["written"] = false;
        rep["error"] = "la legalidad empeoraría con estos cambios; no se escribe nada";
        Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
        return 3;
    }
    if (anyError)
    {
        rep["written"] = false;
        rep["error"] = "algún cambio no se pudo aplicar; no se escribe nada";
        Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
        return 3;
    }
    if (!anyChanged)
    {
        rep["written"] = false;
        rep["note"] = "no hay nada que cambiar; no se genera archivo";
        Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
        return 0;
    }

    byte[] editedBytes;
    try { editedBytes = esav.Write().ToArray(); }
    catch (Exception ex)
    {
        rep["written"] = false;
        rep["error"] = "Write() de salida falló: " + ex.GetType().Name + ": " + ex.Message;
        Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
        return 1;
    }
    var outBytes = editedBytes;
    rep["outputSize"] = outBytes.Length;
    rep["outputSha256"] = Sha256Hex(outBytes);
    rep["diff"] = DiffSummary(pristine, outBytes);

    if (dry)
    {
        rep["written"] = false;
        rep["outputPath"] = null;
        Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
        return 0;
    }

    if (outPath is null)
        outPath = Path.Combine(Path.GetDirectoryName(inPath) ?? ".",
            Path.GetFileNameWithoutExtension(inPath) + ".entrenado" + Path.GetExtension(inPath));
    var fullIn = Path.GetFullPath(inPath);
    var fullOut = Path.GetFullPath(outPath);
    if (fullOut == fullIn && !allowOverwrite)
    {
        rep["written"] = false;
        rep["error"] = "la salida apunta al propio save original; usa --allow-overwrite solo con copia fechada";
        Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
        return 3;
    }
    if (File.Exists(fullOut) && !allowOverwrite)
    {
        rep["written"] = false;
        rep["error"] = "el archivo de salida ya existe; elige otro nombre";
        Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
        return 3;
    }
    Directory.CreateDirectory(Path.GetDirectoryName(fullOut)!);
    File.WriteAllBytes(fullOut, outBytes);
    rep["written"] = true;
    rep["outputPath"] = fullOut;
    Console.WriteLine(JsonSerializer.Serialize(rep, Options.Value));
    return 0;
}

if (cmd != "inspect")
{
    Console.Error.WriteLine($"comando desconocido: {cmd} (usa inspect | inventory | export | scan | members)");
    return 2;
}

if (args.Length < 2 || !File.Exists(args[1]))
{
    Console.Error.WriteLine("falta la ruta del save");
    return 2;
}

var path = args[1];
var data = File.ReadAllBytes(path);
var result = new Dictionary<string, object?>
{
    ["file"] = Path.GetFileName(path),
    ["path"] = path,
    ["size"] = data.Length,
    ["sha256"] = Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant(),
};

SaveFile? sav = null;
try
{
    sav = SaveUtil.GetSaveFile(data);
}
catch (Exception ex)
{
    result["error"] = ex.GetType().Name + ": " + ex.Message;
}

if (sav is null)
{
    result["detected"] = false;
    Console.WriteLine(JsonSerializer.Serialize(result, Options.Value));
    return 1;
}

result["detected"] = true;
result["saveType"] = sav.GetType().Name;
result["generation"] = sav.Generation;
result["version"] = sav.Version.ToString();
result["versionName"] = GameInfo.GetVersionName(sav.Version);
result["trainer"] = sav.OT;
result["tid"] = sav.TID16;
result["sid"] = sav.SID16;
result["gender"] = sav.Gender.ToString();
result["money"] = sav.Money;
result["badges"] = TryGetBadges(sav);
result["playTime"] = TryGetString(sav, "PlayTimeString");

PKM[] party;
try { party = sav.PartyData.ToArray(); }
catch (Exception ex) { party = Array.Empty<PKM>(); result["partyError"] = ex.Message; }

PKM[] boxed;
try { boxed = sav.BoxData.ToArray(); }
catch (Exception ex) { boxed = Array.Empty<PKM>(); result["boxError"] = ex.Message; }

result["partyCount"] = party.Length;
result["boxCount"] = boxed.Length;

var all = party.Concat(boxed).Where(p => p.Species != 0).ToArray();
int legal = 0, unverified = 0, illegal = 0;
var samples = new List<Dictionary<string, object?>>();
foreach (var pkm in all)
{
    var la = new LegalityAnalysis(pkm);
    var verdict = VerdictOf(la);
    if (verdict == "legal") legal++;
    else if (verdict == "unverified") unverified++;
    else illegal++;
    if (samples.Count < 8 && pkm.Species != 0)
    {
        samples.Add(new Dictionary<string, object?>
        {
            ["species"] = pkm.Species,
            ["speciesName"] = GameInfo.GetStrings("en").Species[pkm.Species],
            ["nickname"] = pkm.Nickname,
            ["level"] = pkm.CurrentLevel,
            ["exp"] = pkm.EXP,
            ["nature"] = pkm.Nature.ToString(),
            ["ability"] = pkm.Ability,
            ["heldItem"] = pkm.HeldItem,
            ["friendship"] = TryGetInt(pkm, "OT_Friendship"),
            ["ivs"] = new[] { pkm.IV_HP, pkm.IV_ATK, pkm.IV_DEF, pkm.IV_SPA, pkm.IV_SPD, pkm.IV_SPE },
            ["evs"] = new[] { pkm.EV_HP, pkm.EV_ATK, pkm.EV_DEF, pkm.EV_SPA, pkm.EV_SPD, pkm.EV_SPE },
            ["moves"] = new[] { pkm.Move1, pkm.Move2, pkm.Move3, pkm.Move4 },
            ["legal"] = la.Valid,
            ["report"] = la.Valid ? null : la.Report(),
        });
    }
}
result["pokemonTotal"] = all.Length;
result["legal"] = legal;
result["illegal"] = illegal;
result["unverified"] = unverified;
result["samples"] = samples;

// Ida y vuelta sin cambios: requisito bloqueante antes de permitir escritura.
try
{
    var outBytes = sav.Write().ToArray();
    int diff = -1;
    int n = Math.Min(outBytes.Length, data.Length);
    for (int i = 0; i < n; i++)
    {
        if (outBytes[i] != data[i]) { diff = i; break; }
    }
    if (diff < 0 && outBytes.Length != data.Length) diff = n;
    result["roundTrip"] = new Dictionary<string, object?>
    {
        ["identical"] = diff < 0,
        ["inputSize"] = data.Length,
        ["outputSize"] = outBytes.Length,
        ["firstDiffOffset"] = diff < 0 ? null : diff,
        ["outputSha256"] = Convert.ToHexString(SHA256.HashData(outBytes)).ToLowerInvariant(),
    };
}
catch (Exception ex)
{
    result["roundTrip"] = new Dictionary<string, object?> { ["identical"] = false, ["error"] = ex.GetType().Name + ": " + ex.Message };
}

Console.WriteLine(JsonSerializer.Serialize(result, Options.Value));
return 0;

static object? TryGetBadges(SaveFile sav)
{
    var found = new List<Dictionary<string, object?>>();
    foreach (var name in new[] { "Badges16", "Badges" })
    {
        var p = sav.GetType().GetProperty(name);
        if (p is null) continue;
        var v = p.GetValue(sav);
        int raw = v switch { int i => i, byte b => b, _ => -1 };
        if (raw < 0) continue;
        found.Add(new Dictionary<string, object?>
        {
            ["property"] = name,
            ["raw"] = raw,
            ["bits"] = System.Numerics.BitOperations.PopCount((uint)raw),
        });
    }
    return found.Count == 0 ? null : found;
}

static string? TryGetString(object o, string name)
{
    var p = o.GetType().GetProperty(name);
    return p?.GetValue(o)?.ToString();
}

static int? TryGetInt(object o, string name)
{
    var p = o.GetType().GetProperty(name);
    var v = p?.GetValue(o);
    return v is int i ? i : null;
}

static string MoveName(GameStrings s, int index)
{
    try
    {
        var arr = s.Move;
        if (index >= 0 && index < arr.Count && !string.IsNullOrWhiteSpace(arr[index])) return arr[index];
    }
    catch { }
    return "move#" + index;
}

static string ItemName(GameStrings s, int index)
{
    try
    {
        var arr = s.Item;
        if (index >= 0 && index < arr.Count && !string.IsNullOrWhiteSpace(arr[index])) return arr[index];
    }
    catch { }
    return "item#" + index;
}

static string MetLocationName(GameStrings strings, int location, PKM pkm)
{
    if (location <= 0) return "(None)";
    try
    {
        return strings.GetLocationName(false, (ushort)location, (byte)pkm.Format, (byte)(pkm.Format is 1 or 2 ? 2 : pkm.Format), pkm.Version);
    }
    catch
    {
        return "#" + location;
    }
}

static Dictionary<string, object?> PkmJson(PKM pkm, GameStrings strings)
{
    var la = new LegalityAnalysis(pkm);
    string name;
    try { name = strings.Species[pkm.Species]; } catch { name = "species#" + pkm.Species; }
    var d = new Dictionary<string, object?>
    {
        ["pid"] = pkm.PID,
        ["species"] = pkm.Species,
        ["speciesName"] = name,
        ["nickname"] = pkm.Nickname,
        ["isNicknamed"] = pkm.IsNicknamed,
        ["level"] = pkm.CurrentLevel,
        ["exp"] = pkm.EXP,
        ["gender"] = pkm.Gender.ToString(),
        ["shiny"] = pkm.IsShiny,
        ["ball"] = pkm.Ball,
        ["language"] = pkm.Language,
        ["ivs"] = new[] { pkm.IV_HP, pkm.IV_ATK, pkm.IV_DEF, pkm.IV_SPA, pkm.IV_SPD, pkm.IV_SPE },
        ["evs"] = new[] { pkm.EV_HP, pkm.EV_ATK, pkm.EV_DEF, pkm.EV_SPA, pkm.EV_SPD, pkm.EV_SPE },
        ["moves"] = MoveList(pkm, strings),
        ["stats"] = new Dictionary<string, object?>
        {
            ["hp"] = pkm.Stat_HPCurrent,
            ["hpMax"] = pkm.Stat_HPMax,
            ["atk"] = pkm.Stat_ATK,
            ["def"] = pkm.Stat_DEF,
            ["spa"] = pkm.Stat_SPA,
            ["spd"] = pkm.Stat_SPD,
            ["spe"] = pkm.Stat_SPE,
        },
        ["legal"] = la.Valid,
        ["legalityReport"] = la.Valid ? null : la.Report(),
        ["verdict"] = VerdictOf(la),
        ["issues"] = LegalityIssues(la).Select(CleanIssue).ToArray(),
        ["exportTargets"] = ExportTargets(pkm),
    };
    d["nature"] = TryEnum(pkm, "Nature");
    d["ability"] = TryInt(pkm, "Ability");
    d["heldItem"] = TryInt(pkm, "HeldItem");
    d["heldItemName"] = ItemName(strings, TryInt(pkm, "HeldItem") is int heldId ? heldId : 0);
    d["friendship"] = TryInt(pkm, "CurrentFriendship") ?? TryInt(pkm, "OriginalTrainerFriendship") ?? TryInt(pkm, "OT_Friendship");
    d["metLocation"] = MetLocationOf(pkm);
    d["metLocationName"] = MetLocationName(strings, MetLocationOf(pkm) is int metId ? metId : 0, pkm);
    d["metLevel"] = TryInt(pkm, "MetLevel");
    d["metDate"] = TryGetString(pkm, "MetDate");
    d["eggDate"] = TryGetString(pkm, "EggDate");
    d["ot"] = TryGetString(pkm, "OriginalTrainerName");
    d["tid"] = TryInt(pkm, "TID16");
    d["sid"] = TryInt(pkm, "SID16");
    return d;
}

static List<Dictionary<string, object?>> MoveList(PKM pkm, GameStrings strings)
{
    var list = new List<Dictionary<string, object?>>();
    int[] ids = { pkm.Move1, pkm.Move2, pkm.Move3, pkm.Move4 };
    int[] pps = { pkm.Move1_PP, pkm.Move2_PP, pkm.Move3_PP, pkm.Move4_PP };
    for (int i = 0; i < 4; i++)
    {
        if (ids[i] == 0) continue;
        list.Add(new Dictionary<string, object?>
        {
            ["slot"] = i + 1,
            ["id"] = ids[i],
            ["name"] = MoveName(strings, ids[i]),
            ["pp"] = pps[i],
            ["ppUps"] = TryInt(pkm, "Move" + (i + 1) + "_PPUps"),
        });
    }
    return list;
}

static object? ReadDex(SaveFile sav)
{
    try
    {
        if (sav is SAV4 s4)
        {
            var z = s4.Dex;
            var caught = new List<int>();
            var seen = new List<int>();
            for (ushort sp = 1; sp <= 493; sp++)
            {
                if (z.GetCaught(sp)) caught.Add(sp);
                else if (z.GetSeen(sp)) seen.Add(sp);
            }
            return new Dictionary<string, object?>
            {
                ["available"] = true,
                ["source"] = "Zukan4",
                ["caughtCount"] = caught.Count,
                ["seenCount"] = seen.Count,
                ["caught"] = caught,
                ["seen"] = seen,
            };
        }
        if (sav is SAV5 s5)
        {
            var z = s5.Zukan;
            var caught = new List<int>();
            for (ushort sp = 1; sp <= 649; sp++) if (z.GetCaught(sp)) caught.Add(sp);
            return new Dictionary<string, object?>
            {
                ["available"] = true,
                ["source"] = "Zukan5",
                ["caughtCount"] = caught.Count,
                ["seenCount"] = null,
                ["caught"] = caught,
            };
        }
    }
    catch (Exception ex) { return new Dictionary<string, object?> { ["available"] = false, ["error"] = ex.Message }; }
    return new Dictionary<string, object?> { ["available"] = false, ["reason"] = "PKHeX no expone Pokédex para esta generación" };
}

static object? TryInt(object o, string name)
{
    var p = o.GetType().GetProperty(name);
    if (p is null) return null;
    var v = p.GetValue(o);
    return v switch
    {
        int i => i,
        uint ui => (long)ui,
        short sh => (int)sh,
        ushort us => (int)us,
        byte b => (int)b,
        sbyte sb => (int)sb,
        long l => l,
        _ => null,
    };
}

// PK4 no expone "MetLocation": el banco válido depende del juego de origen.
static object? MetLocationOf(PKM pkm)
{
    return TryInt(pkm, "MetLocation") ?? TryInt(pkm, "MetLocationDP") ?? TryInt(pkm, "MetLocationExtended");
}

static object? TryEnum(object o, string name)
{
    var p = o.GetType().GetProperty(name);
    var v = p?.GetValue(o);
    return v?.ToString();
}

static object? TryCallInt(object o, string name)
{
    try
    {
        var m = o.GetType().GetMethod(name, Type.EmptyTypes);
        var v = m?.Invoke(o, null);
        return v is int i ? i : null;
    }
    catch { return null; }
}

static string? TryCallString(object o, string name, int arg)
{
    try
    {
        var m = o.GetType().GetMethod(name, new[] { typeof(int) });
        return m?.Invoke(o, new object[] { arg })?.ToString();
    }
    catch { return null; }
}

static string[] LegalityIssues(LegalityAnalysis la)
{
    if (la.Valid) return Array.Empty<string>();
    return la.Report()
        .Split('\n', StringSplitOptions.RemoveEmptyEntries)
        .Select(x => x.Trim())
        .Where(x => x.Length > 0)
        .ToArray();
}

// Motivos que dependen del idioma o de filtros modernos, no de datos imposibles.
static bool IsCosmetic(string line) =>
    line.Contains("Nickname does not match species name", StringComparison.OrdinalIgnoreCase) ||
    line.Contains("In-game Trade Nickname has been altered", StringComparison.OrdinalIgnoreCase) ||
    line.Contains("Word Filter", StringComparison.OrdinalIgnoreCase);

static string VerdictOf(LegalityAnalysis la)
{
    if (la.Valid) return "legal";
    var lines = LegalityIssues(la);
    return lines.Length > 0 && lines.All(IsCosmetic) ? "unverified" : "illegal";
}

static string CleanIssue(string line) => line.Replace("Invalid: ", "").Replace("Invalid:", "").Trim();

static Dictionary<string, object?> Target(string system, bool allowed, string reason) => new()
{
    ["system"] = system,
    ["allowed"] = allowed,
    ["reason"] = reason,
};

// Matriz de exportación v1: solo cadenas oficiales.
static object[] ExportTargets(PKM pkm) => pkm.Format switch
{
    1 => new object[]
    {
        Target("gb", true, "misma generación"),
        Target("gbc", true, "compatible con Gen 1"),
        Target("nds", false, "Gen 1/2 → NDS no existe oficialmente: Time Capsule solo conecta Gen 1 y Gen 2"),
    },
    2 => new object[]
    {
        Target("gb", true, "compatible con Gen 2"),
        Target("gbc", true, "misma generación"),
        Target("nds", false, "Gen 1/2 → NDS no existe oficialmente: Time Capsule solo conecta Gen 1 y Gen 2"),
    },
    3 => new object[]
    {
        Target("gba", true, "misma generación"),
        Target("nds", true, "Pal Park (Gen 3 → Gen 4)"),
    },
    4 => new object[]
    {
        Target("nds", true, "misma generación; Poké Transfer permite Gen 4 → Gen 5"),
    },
    5 => new object[]
    {
        Target("nds", true, "misma generación"),
    },
    _ => Array.Empty<object>(),
};

static string Sha256Hex(byte[] data) => Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();

static int VerdictRank(string verdict) => verdict switch
{
    "legal" => 0,
    "unverified" => 1,
    _ => 2,
};

static string SafeSpecies(GameStrings strings, int species)
{
    try { return strings.Species[species]; } catch { return "species#" + species; }
}

// Busca por PID en equipo y cajas; el PID es la identidad que no se puede fabricar.
static (PKM Pkm, string Location, int Box, int Slot, int Index)? FindByPid(SaveFile sav, uint pid)
{
    if (pid == 0) return null;
    var party = sav.PartyData;
    for (int i = 0; i < party.Count; i++)
    {
        var p = party[i];
        if (p.Species != 0 && p.PID == pid) return (p, "party", -1, i, i);
    }
    var boxed = sav.BoxData;
    int per = sav.BoxSlotCount > 0 ? sav.BoxSlotCount : 30;
    for (int i = 0; i < boxed.Count; i++)
    {
        var p = boxed[i];
        if (p.Species != 0 && p.PID == pid) return (p, "box", i / per, i % per, i);
    }
    return null;
}

static int[] ReadEvs(PKM p) => new[] { p.EV_HP, p.EV_ATK, p.EV_DEF, p.EV_SPA, p.EV_SPD, p.EV_SPE };

// En Gen 1/2 solo existe el stat exp de Especial: los índices 3 y 4 son el mismo campo.
static void WriteEvs(PKM p, int[] v)
{
    if (p.Format <= 2)
    {
        p.EV_HP = v[0];
        p.EV_ATK = v[1];
        p.EV_DEF = v[2];
        p.EV_SPE = v[5];
        int spc = Math.Max(v[3], v[4]);
        switch (p)
        {
            case PK1 a: a.EV_SPC = spc; break;
            case PK2 b: b.EV_SPC = spc; break;
            default: p.EV_SPA = spc; p.EV_SPD = spc; break;
        }
        return;
    }
    p.EV_HP = v[0];
    p.EV_ATK = v[1];
    p.EV_DEF = v[2];
    p.EV_SPA = v[3];
    p.EV_SPD = v[4];
    p.EV_SPE = v[5];
}

static int[] ApplyEvs(int[] current, int[] delta, string mode, int gen)
{
    var target = new int[6];
    for (int i = 0; i < 6; i++) target[i] = mode == "set" ? delta[i] : current[i] + delta[i];
    if (gen <= 2)
    {
        for (int i = 0; i < 6; i++) target[i] = Math.Clamp(target[i], 0, 65535);
        return target;
    }
    for (int i = 0; i < 6; i++) target[i] = Math.Clamp(target[i], 0, 255);
    int total = target.Sum();
    while (total > 510)
    {
        int idx = 0;
        for (int i = 1; i < 6; i++) if (target[i] > target[idx]) idx = i;
        if (target[idx] <= 0) break;
        target[idx]--;
        total--;
    }
    return target;
}

static Dictionary<string, object?> DiffSummary(byte[] a, byte[] b)
{
    int n = Math.Min(a.Length, b.Length);
    int count = 0, first = -1, last = -1;
    for (int i = 0; i < n; i++)
    {
        if (a[i] == b[i]) continue;
        count++;
        if (first < 0) first = i;
        last = i;
    }
    return new Dictionary<string, object?>
    {
        ["changedBytes"] = count + Math.Abs(a.Length - b.Length),
        ["firstOffset"] = first < 0 ? null : first,
        ["lastOffset"] = last < 0 ? null : last,
        ["sizeDelta"] = b.Length - a.Length,
    };
}

// Resuelve por ubicación (base 1) para poder tocar Gen 1/2, que no tienen PID.
static (PKM Pkm, string Location, int Box, int Slot, int Index)? FindBySlot(SaveFile sav, string location, int box, int slot)
{
    if (location == "party")
    {
        if (slot < 1) return null;
        int i = slot - 1;
        if (i >= sav.PartyData.Count) return null;
        var p = sav.GetPartySlotAtIndex(i);
        if (p.Species == 0) return null;
        return (p, "party", -1, i, i);
    }
    if (location == "box")
    {
        if (box < 1 || slot < 1) return null;
        int per = sav.BoxSlotCount > 0 ? sav.BoxSlotCount : 30;
        int i = (box - 1) * per + (slot - 1);
        if (i >= sav.BoxData.Count) return null;
        var p = sav.GetBoxSlotAtIndex(i);
        if (p.Species == 0) return null;
        return (p, "box", box - 1, slot - 1, i);
    }
    return null;
}

// PartyData/BoxData devuelven copias: hay que escribir el slot y recalcular checksum.
static PKM PrepareForWrite(PKM pkm, int[] evs, string location)
{
    WriteEvs(pkm, evs);
    if (location == "party") pkm.ResetPartyStats();
    pkm.RefreshChecksum();
    return pkm;
}

static void StoreSlot(SaveFile sav, string location, int index, PKM pkm)
{
    if (location == "party") sav.SetPartySlotAtIndex(pkm, index, EntityImportSettings.None);
    else sav.SetBoxSlotAtIndex(pkm, index, EntityImportSettings.None);
}

static (int[] Evs, LegalityAnalysis La) ReloadAndAnalyze(SaveFile sav, string location, int index)
{
    var p = location == "party" ? sav.GetPartySlotAtIndex(index) : sav.GetBoxSlotAtIndex(index);
    return (ReadEvs(p), new LegalityAnalysis(p));
}

static bool IsEvExpIssue(string line) =>
    line.Contains("without changing EXP", StringComparison.OrdinalIgnoreCase) ||
    (line.Contains("EXP", StringComparison.OrdinalIgnoreCase) && line.Contains("Stat Exp", StringComparison.OrdinalIgnoreCase));

// Recorte tipo vitamina: nunca baja de lo que ya estaba, redondea a pasos legales.
static int[] VitaminClamp(int[] target, int[] original, int gen)
{
    var res = (int[])target.Clone();
    int step = gen <= 2 ? 2560 : 10;
    int cap = gen <= 2 ? 25600 : 100;
    for (int i = 0; i < 6; i++)
    {
        if (res[i] <= original[i]) continue;
        int q = Math.Min(cap, res[i] - (res[i] % step));
        res[i] = Math.Max(original[i], q);
    }
    if (gen > 2)
    {
        int total = res.Sum();
        while (total > 510)
        {
            int idx = -1;
            for (int i = 0; i < 6; i++)
                if (res[i] > original[i] && (idx < 0 || res[i] > res[idx])) idx = i;
            if (idx < 0) break;
            res[idx]--;
            total--;
        }
    }
    return res;
}

internal static class Options
{
    public static readonly JsonSerializerOptions Value = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

}
