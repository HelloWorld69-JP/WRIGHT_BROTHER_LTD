# ASSY CAE Model Build — PAM-CRASH to LS-DYNA Conversion
## Main Modelling: Contexts and Instructions

**Document status:** Draft v0.4 — working document, to be revised as details are confirmed and the project progresses.

---

## 1. Context

**Objective:** Build an ASSY (assembly-level) CAE model for the LS-DYNA solver by converting existing PAM-CRASH models, using **HyperMesh 2025** for the baseline geometry conversion and **ARUP (Oasys) PRIMER** (via its JavaScript API) as the engine for the custom post-process conversion layer, assembly build-up, and QA.

**Why this project exists:**
- Migrate existing PAM-CRASH modelling capability and data over to LS-DYNA.
- Standardize a repeatable, scripted conversion methodology so future models can be converted with minimal manual rework.
- Prepare the ASSY model(s) so that restraint-system test items (Belt Anchorage, ISO-FIX/CRS, etc.) can be configured and validated on top of them.
- Ultimately integrate the ASSY model(s) at full-vehicle level.

**Toolchain and roles:**

| Stage | Tool | Role |
|---|---|---|
| Source model | PAM-CRASH (VPS / Pamcrash2G) | Legacy/original model format |
| Baseline conversion | HyperMesh 2025 (Altair Pamcrash→Dyna toolset) | Geometry-level conversion only — **compiled black-box engine** (see Section 1a). Handles elements, PART, sections, mass, SPC, basic contacts |
| **Custom post-process layer** | **ARUP (Oasys) PRIMER — JavaScript API** | **The heart of this project.** Applies the team's material / contact / weld / joint / output mappings that the Altair engine does not. Fully owned, version-controlled scripts |
| Assembly build / QA / renumber / encrypt | ARUP (Oasys) PRIMER | LS-DYNA-native pre-processor: connections, contacts, checks, renumbering, encryption |
| Solve / verify | LS-DYNA Solver | Target solver, used for test runs at model level and full-vehicle level |

### 1a. Architecture decision — Altair engine is a black box; we build a PRIMER post-process layer

The Altair HyperMesh Pamcrash→Dyna toolset (`Main.tbc`, `PamcrashToDyna.tbc`, etc.) is distributed as **compiled TclPro ByteCode** — the conversion logic and even its string literals are obfuscated and not human-readable/editable. We will **not** decompile or modify it (it's Altair's licensed IP, and a hacked engine would be unsupportable). Instead:

- **HyperMesh does the baseline geometry conversion** — only what its default engine reliably supports (elements, PART→*PART, sections, mass, SPC constraints, four basic contact types).
- **A custom PRIMER JavaScript post-process layer** (built and owned by us) then applies everything the Altair default flags "not supported": **materials, outputs, welds/PLINK, joints/KJOIN, curves, and any team-specific contact re-mapping.**
- This post-process layer *is* the automation deliverable of the project (Goal 8) and lives in the GitHub repo.

*(Decision date: 2026-09-10. Chosen over editing Altair's `.txt` config files, because the compiled engine may not honor edited config rows at runtime and we'd remain limited to whatever the black box chooses to do.)*

**Scope of "Main Modelling":** **Phase 1 = seat-structure only.** Once the seat-structure ASSY converts and runs cleanly, a master ASSY file will be prepared and test items (Luggage Retention, Belt Anchorage, etc.) will be set up on top of it in a later phase.

---

## 2. Guiding Principles

1. **Verify before proceeding** — any assumption, default value, or unclear input is flagged and confirmed before it's locked into the workflow, the model, or the scripts.
2. **Track data fidelity** — every conversion step is checked against the source PAM-CRASH model for data loss (entities, properties, connections, curves, load curves, contacts, etc.).
3. **Reuse and document methodology** — your existing modelling/conversion methods are the baseline standard; we capture them once (as we encounter them) and reuse them consistently across all subsequent models.
4. **Build automation incrementally** — script fragments are captured step-by-step, not only at the final goal, so the end-to-end automation is really an assembly of individually validated and tested steps.
5. **Error-free before encryption** — a model is only encrypted once it has passed test-run verification (Goal 4/5); encryption happens last (Goal 6), and a post-encryption test run (Goal 7) confirms nothing broke during that step.
6. **Never auto-decide a judgement call** — where conversion depends on manual engineering judgement (e.g. VPS 33 → NODES_TO_SURFACE vs SURFACE_TO_SURFACE) or an unresolved mapping (e.g. the arc/laser weld conflict), scripts apply a documented safe default and **flag the item for engineer review** rather than silently choosing. Human-in-the-loop beats a silent wrong answer.

---

## 3. Project Roadmap (8 Goals)

| # | Goal | Primary Tool(s) | Key Output |
|---|---|---|---|
| 1 | Convert PAM-CRASH → LS-DYNA (seat-structure ASSY, Phase 1) | HyperMesh 2025 | Raw converted LS-DYNA keyword deck — **native PAM-CRASH units carried through, no rescaling yet** |
| 2 | Check data loss over conversion | HyperMesh / PRIMER | Data-loss / QA comparison report vs. source |
| 3 | Reconfigure into an error-free ASSY model | PRIMER | Clean, error-free ASSY LS-DYNA model |
| 4 | Test run — check full-vehicle integration readiness | LS-DYNA Solver | Successful trial run / integration check |
| 5 | Final brush-up (renumbering, model clean-up) | PRIMER | Renumbered model (per PAM-CRASH's existing renumbering rules) + **case-by-case unit rescaling to mm-s-ton-N-MPa done here** |
| 6 | Encryption of the final model | PRIMER (method TBC) | Encrypted LS-DYNA model |
| 7 | Test run of the encrypted model | LS-DYNA Solver | Verified encrypted model runs correctly |
| 8 (Final) | Summarize the process + automate | Scripts (HyperMesh/PRIMER, Python/Tcl) | Documented, repeatable, scripted end-to-end process |

**Downstream scope (after Phase 1 seat-structure ASSY is validated):** Build the master ASSY and set up test items — Luggage Retention, Belt Anchorage, ISO-FIX/CRS — on top of it.

---

## 4. Confirmed Project Parameters
| Parameter | Value |
|---|---|
| PRIMER version | **v21+** (JS API + encryption features assume v21) |
| Script execution | **Dev in PRIMER GUI, run in batch** — scripts must work both interactively and via command-line batch (`primer21_x64 ... -batch`/JS) |
| Converted model file structure | **Master `.dyn` file with many `*INCLUDE` files** (mirrors the PAM-CRASH include-file system) |
|---|---|
| LS-DYNA precision | **Double precision** |
| Test standard region (Belt Anchorage / ISO-FIX-CRS) | **Both** — ECE (UN R14 / R44 / R129) and FMVSS (210 / 213); exact clause list TBC, needed only once Phase 2 (test-item setup) begins |
| ASSY Phase 1 scope | **Seat-structure only.** Master ASSY + test-item setup (Luggage Retention, Belt Anchorage) is Phase 2, after Phase 1 is validated |
| PAM-CRASH unit system (confirmed) | mm, ms, kg, kN, GPa — dimensionally consistent (confirmed via steel E = 210) |
| LS-DYNA unit system (target, standard) | mm, s, ton, N, MPa |
| **Unit rescaling timing** | **Deferred.** Goals 1–4 carry PAM-CRASH's native mm-ms-kg-kN-GPa values through *unchanged* (it's already a consistent set, so LS-DYNA solves correctly either way). Rescaling to mm-s-ton-N-MPa is done **case-by-case at Goal 5 (Final Brush-Up)**, before Goal 6 encryption |
| Naming / include-file / renumbering convention | **Follow the existing PAM-CRASH system exactly** — not a new convention. Detailed rules to be captured when we reach each relevant step. Final renumbering is redone at Goal 5 using PAM-CRASH's existing renumbering rules |

---

## 5. Unit System & Conversion Factors — confirmed, rescaling deferred to Goal 5

**Confirmed:** PAM-CRASH steel Young's modulus reads **210** → units are GPa → PAM-CRASH uses **mm–ms–kg–kN–GPa**, which is dimensionally consistent.

**Policy:** Because mm–ms–kg–kN–GPa is already a self-consistent set, LS-DYNA will solve correctly on it without any rescaling — the numbers don't need to change for the solver to work. So:
- **Goals 1–4:** the converted LS-DYNA deck keeps PAM-CRASH's native mm-ms-kg-kN-GPa *values*, unchanged. No unit rescaling happens during the initial conversion.
- **Goal 5 (Final Brush-Up):** unit rescaling to the mm-s-ton-N-MPa standard is applied **case-by-case**, right before Goal 6 encryption. This is a standardization step (aligning with your usual LS-DYNA convention), not something the solver needs.

**Reference conversion factors (mm–ms–kg–kN–GPa → mm–s–ton–N–MPa), for use when Goal 5 arrives:**

| Quantity | Factor (PAM-CRASH value × factor = LS-DYNA value) |
|---|---|
| Length | × 1 |
| Time | × 0.001 (ms → s) |
| Mass | × 0.001 (kg → ton) |
| Velocity | × 1,000 |
| Acceleration | × 1,000,000 |
| Density | × 0.001 |
| Force | × 1,000 (kN → N) |
| Stress / Pressure / Modulus | × 1,000 (GPa → MPa) |
| Energy | × 1,000 |

*(Parked here for now — revisit in detail when we reach Goal 5.)*

---

## 6. Open Items to Confirm

- [ ] **Exact mechanism/format of the HyperMesh PAM-CRASH→LS-DYNA conversion configuration file** (Tcl / Python / XML mapping table / other) — needed to write it correctly, see Section 7
- [ ] Source PAM-CRASH solver/model version
- [ ] Target LS-DYNA solver version (e.g. R9/R11/R13/R15 — precision is confirmed as double, version is still open)
- [ ] HyperMesh 2025 build/service pack, and whether a PAM-CRASH import profile is already configured
- [ ] Encryption method intended for Goal 6 (PRIMER's native LS-DYNA include-file encryption vs. another tool)
- [ ] File/folder structure convention for the project
- [ ] Detailed PAM-CRASH naming/include-file/renumbering rules — to be captured as we reach each relevant entity type

---

## 7. Companion Document: Entity Conversion Mapping

A second working file, **`PAMCRASH_to_LSDYNA_Entity_Conversion_Mapping.md`**, is being built alongside this one. It's the entity-by-entity translation reference (materials, contacts, sets/groups, connections, etc.) that will feed both the HyperMesh conversion configuration file and the downstream scripts. It's built up category by category, one at a time, confirmed with you before each entry is locked in.

---

*Next step: nail down the HyperMesh conversion-file mechanism, then begin the entity-by-entity walkthrough in the companion mapping document, starting with Materials.*
