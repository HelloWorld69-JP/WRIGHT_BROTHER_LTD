/* ============================================================================
 * 01_materials.js  —  PAM-CRASH (VPS) material  ->  LS-DYNA *MAT
 * ----------------------------------------------------------------------------
 * Post-process module. Runs inside PRIMER (GUI or batch) on the HyperMesh
 * baseline deck. Reads rules from lib/mapping_tables.js.
 *
 * ⚠️ SCAFFOLD — NOT YET RUNNABLE FOR REAL CONVERSION. Two things are needed
 *    before the body of this module can be finalised (see the two BLOCKERS
 *    below). Structure, orchestration hooks, and the confirmed PRIMER JS call
 *    patterns are in place; the material-creation specifics are intentionally
 *    left as clearly-marked TODOs rather than guessed.
 *
 * BLOCKER 1 — Source of material DATA.
 *   The Altair engine marks all materials "not supported", so we must confirm
 *   what the baseline .dyn actually contains after HyperMesh:
 *     (a) no material cards at all (parts reference a missing MID), or
 *     (b) empty/placeholder *MAT cards, or
 *     (c) the PAM-CRASH values preserved in some raw/unconverted form.
 *   This decides whether this module CREATES materials from an external source
 *   table (extracted from the PAM-CRASH deck) or EDITS existing cards in place.
 *
 * BLOCKER 2 — Parameter-level field maps.
 *   mapping_tables.materials[*].fields is null for every type. The card-level
 *   target (e.g. VPS 103 -> *MAT_024) is confirmed; the field-by-field mapping
 *   (yield, hardening curve, failure, foam curves, ...) is not yet defined.
 * ========================================================================= */

namespace = "PamToDyna";  // keep module-scoped state out of the global soup

var Materials = (function () {

  // Loaded by main.js; during standalone dev, load directly.
  // In PRIMER JS, use Use()/#include per your project convention.
  // var MAP = MappingTables.materials;

  /* Iterate existing materials in the model using the confirmed Oasys pattern:
   *   var mat = Material.First(m);  while (mat) { ... mat = mat.Next(); }
   * `mat.type` is a string keyword (e.g. "PIECEWISE_LINEAR_PLASTICITY").
   */
  function auditExisting(m) {
    var report = { count: 0, byType: {} };
    var mat = Material.First(m);
    while (mat) {
      report.count++;
      var t = mat.type;                       // CONFIRMED: string property
      report.byType[t] = (report.byType[t] || 0) + 1;
      mat = mat.Next();                        // CONFIRMED: iteration
    }
    return report;
  }

  /* Convert one VPS material type. Body depends on BLOCKER 1 outcome.
   * Sketch for the CREATE case (baseline has no usable material cards):
   *
   *   var rule = MappingTables.materials[vpsType];
   *   if (!rule) { logUnmapped(vpsType); return; }
   *   // CONFIRMED pattern: new <Class>(model, label, ...)
   *   // TODO VERIFY against local JS API manual: exact Material constructor
   *   //      signature + how the *MAT keyword/type is set, and the property
   *   //      setter name (SetPropertyByName vs direct property assignment).
   *   var newMat = new Material(m, mid, rule.dyna);
   *   applyFields(newMat, rule.fields, sourceValues);   // needs BLOCKER 2
   *
   * Sketch for the EDIT case (baseline has placeholder cards): find by MID,
   * switch the card type to rule.dyna, then applyFields().
   */
  function convertType(m, vpsType, sourceValues) {
    // Intentionally unimplemented until BLOCKER 1 + BLOCKER 2 are resolved.
    return { status: "PENDING", vpsType: vpsType };
  }

  function applyFields(matObj, fieldMap, sourceValues) {
    if (!fieldMap) { return "NO_FIELD_MAP"; }   // BLOCKER 2 guard
    // TODO: field-by-field assignment once maps are defined. No unit scaling here.
    return "OK";
  }

  // Public entry point called by the orchestrator.
  function run(m) {
    var audit = auditExisting(m);
    // Real conversion loop is gated on the blockers above.
    return { module: "01_materials", audit: audit, converted: [] };
  }

  return { run: run, auditExisting: auditExisting };
})();

// module.exports for Node-based unit testing of pure helpers (not PRIMER calls).
if (typeof module !== "undefined" && module.exports) { module.exports = Materials; }
