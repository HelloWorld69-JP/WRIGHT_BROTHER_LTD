# PAM-CRASH → LS-DYNA Entity Conversion Mapping
### Companion reference to: `LSDYNA_ASSY_Conversion_Context_and_Instructions.md`

**Purpose:** the single source of truth for how each PAM-CRASH (VPS) entity type is translated into LS-DYNA. Built category-by-category, confirmed with you before each row is locked in. This feeds:
- The HyperMesh PAM-CRASH → LS-DYNA `Configuration.txt` (Standard.3d)
- The Goal 2 data-loss/QA check (compare against this table)
- The downstream automation scripts (Goal 8)

**Status legend:** ✅ Confirmed, no open questions · 🟡 Stated, parameter-level detail TBC · ⚠️ Conflict/ambiguity found — needs your call · ⬜ Not yet reviewed

**Scope note:** entries are being gathered against the **Phase 1 seat-structure ASSY** first.

**Agreed working order (this round):**
1. Part Setting (SEC thickness creation + MID assignment)
2. Material Setting
3. Contact Setting
4. Constraint Setting
5. Welding Types
6. Output Setting

**Explicitly skipped for now:** Unit System (deferred to Goal 5 per main context doc) and Control Cards (parked, no reference provided yet).

---

## 0. Configuration File Architecture — mapped from the actual default files (2026-09-10)

Two default files were provided (`ConfigurationFile.txt`, `ConfigurationFileAttributes.txt`), plus a screenshot of the full toolset folder. The picture is now clear, and it's a significant finding.

### The toolset is 8 files, not 2

The folder holds the dedicated Pamcrash→LsDyna toolset:

| File | Size | Role (inferred) |
|---|---|---|
| `ConfigurationFile.txt` | 2 KB | Element config/type mapping only (`*ElemTypeConversion`) — the file shared first |
| `ConfigurationFileAttributes.txt` | 20 KB | Master attribute/support table — every entity category, what maps to what, and what's flagged unsupported |
| `Main.tbc` | 6 KB | Likely the entry-point / orchestration script |
| `PamcrashToDyna.tbc` | 48 KB | The main conversion engine (by far the largest — where the real logic lives) |
| `ElementConversion.tbc` | 13 KB | Element conversion logic |
| `GroupConversion.tbc` | 21 KB | Group→set / contact conversion logic |
| `SetConversion.tbc` | 19 KB | Set conversion logic |
| `SolvermassConversion.tbc` | 3 KB | Mass conversion logic |

`.tbc` = Tcl Batch Conversion scripts. **These `.tbc` files are the actual executors**; the two `.txt` files are data/config they read. Only the two `.txt` files have been uploaded so far — the `.tbc` files are visible in the screenshot but not yet available to inspect.

### `ConfigurationFileAttributes.txt` — full block list found

Row format: `"DataSourceName/SubType" "PamcrashEntity" "DynaEntity" "AttrsMapped" "AttrsNotMapped" "Message" "AttrsToCheck"`. A row is **supported** when the DynaEntity field is filled (and/or Message = "Conversion supported"); **unsupported** rows have an empty DynaEntity and Message = "Conversion not supported".

Blocks present (24 total): `*SetConversion`, `*CardConversion`, `*PropertyConversion`, `*MaterialBehaviorsConversion`, `*FrictionConversion`, `*ComponentConversion`, `*MaterialConversion`, `*SystemConversion`, `*SystemCollectorConversion`, `*LoadcollectorConversion`, `*LoadstepConversion`, `*CurveConversion`, `*BlockConversion`, `*GroupConversion`, `*ContactSurfaceConversion`, `*SensorConversion`, `*AssemblyConversion`, `*OutputBlockConversion`, `*ElementConversion`, `*SolverMassConversion`, `*LoadConversion`, `*VectorCollectorConversion`, `*ControlVolumeConversion`, `*BeamSectionCollectorConversion`, `*CommentConversion`.

### ⚠️ Key finding: the default converts almost nothing beyond geometry

What the **default** config actually supports (DynaEntity filled in):

| Category | Supported by default | Not supported by default |
|---|---|---|
| Elements | BEAM, SHELL, SOLID (all shapes), SPRING→DISCRETE, SPRGBM→beam, RBODY(rigid)→RBE2, MASS | KJOIN, JOINT, PLINK, PLINK_VIS, SLINK, LLINK, ELINK, TSHEL, BSHEL, RETRACTR, SLIPRING, RBODY(weld), SEG, NODCO |
| Components | PART → *PART | — |
| Contacts (`*GroupConversion`) | CNTAC33 → *CONTACT_AUTOMATIC_SURFACE_TO_SURFACE_ID · CNTAC36 → *CONTACT_AUTOMATIC_SINGLE_SURFACE_ID · CNTAC46 → *CONTACT_AUTOMATIC_GENARAL_ID · TIED → *CONTACT_TIED_SHELL_EDGE_TO_SURFACE_BEAM_OFSET_ID | CNTAC34 and all other CNTAC types; RWALL; SECFO/* |
| Loads/Constraints | BOUNC → SPC (constraint) | CONLO, INVEL, DIS3D*, ACC3D, all other loads |
| Mass | MASS → MASS | NSMAS |
| **Materials** | **NONE — every MAT_1D / MAT_2D / MAT_3D type (incl. 100/101/103/105) is "Conversion not supported"** | all |
| **Outputs** (`*OutputBlockConversion`) | **NONE — THELE, THNOD, THLOC all "Conversion not supported"** | all |
| Curves | none (FUNCT not supported) | FUNCT |
| Control cards | OCTRL, RUNEND partial; TITLE/UNIT etc. not supported | most |
| Friction, Sensors, Airbags (BAGIN), Belts (BELTS), Systems (FRAME) | none | all |

**What this means for the project:** your team's conversion tables (MAT 103→MAT_024, the output history mappings, welds via PLINK/connectors, KJOIN joints) map almost entirely to things Altair's **default** flags as *not supported*. So the team methodology is **not** coming from these default `.txt` files as-shipped. It's coming from one of:
1. **Custom logic inside the `.tbc` scripts** (most likely `PamcrashToDyna.tbc`, 48 KB) that overrides/extends the defaults, and/or
2. **An edited `ConfigurationFileAttributes.txt`** where the "not supported" rows have been filled in with real Dyna entities, and/or
3. **Manual / PRIMER-side steps** done after the HyperMesh pass.

This is exactly the gap this project exists to close. The good news: `ConfigurationFileAttributes.txt` is clearly editable, and the "not supported" material/output rows are precisely where entries like `MATERIAL_SHELL/TYPE 103 → *MAT_024` would be added — *if* the `.tbc` engine honors that field rather than hardcoding. **We can't know which until we see `PamcrashToDyna.tbc` and `Main.tbc`.**

### Cross-check notes vs. your team tables
- Default CNTAC46 → `*CONTACT_AUTOMATIC_GENARAL_ID` (note: "GENARAL" is a typo in Altair's own file). Your team table maps VPS 46 → `*CONTACT_AUTOMATIC_SINGLE_SURFACE` — a deliberate deviation.
- Default CNTAC33 → `SURFACE_TO_SURFACE` only. Your team table has VPS 33 → *both* `NODES_TO_SURFACE` and `SURFACE_TO_SURFACE` depending on context — an extension of the default.
- Material types 103 and 105 both exist as distinct `MATERIAL_SHELL` types in the default list (confirming the earlier MAT105-vs-103 point) — both currently "not supported," both candidates for your MAT_024 mapping.

**Immediate action item:** to go further on Materials/Contacts/Output scripting, the `.tbc` files (especially `PamcrashToDyna.tbc` and `Main.tbc`) need to be inspected. Please upload those when convenient.

### ⚠️ RESOLVED (2026-09-10): the `.tbc` engine is compiled — architecture decided

All six `.tbc` files were retrieved from the GitHub repo and inspected. **They are compiled TclPro ByteCode** (each begins `tbcload::bceval { TclPro ByteCode 2 0 ... }`); the conversion logic and even its string literals are obfuscated and not human-readable or editable. Only proc-header comments survive, giving structure but not logic:

| File | Readable proc / role |
|---|---|
| `Main.tbc` | GUI + entity-status population |
| `ElementConversion.tbc` | `::pamcrashtodyna::pamcrashElementTypeConfig` — builds array of PAM-CRASH element config/type |
| `SetConversion.tbc` | `::pamcrashtodyna::ReadSetInformation` — reads PAM-CRASH set info |
| `SolvermassConversion.tbc` | `::pamcrashtodyna::CreateSolvermasses` |
| `GroupConversion.tbc` | (fully compiled — no readable headers) |
| `PamcrashToDyna.tbc` | (48 KB engine — fully compiled) |

**Decision:** we will **not** decompile or modify Altair's compiled engine (licensed IP, unsupportable). Architecture chosen (confirmed with user):

- **HyperMesh / Altair engine** = baseline **geometry** conversion only (elements, PART, sections, mass, SPC, basic contacts — the things its default supports).
- **Custom PRIMER JavaScript post-process layer** (owned by us, in the repo) = everything the Altair default flags "not supported": **materials, outputs, welds/joints, curves, team-specific contact re-mapping.** This layer is the project's core automation deliverable.

PRIMER JS API verified to have the needed classes (Material, Part, Section, Contact, Set, Conx, NodalRigidBody, etc.), current at v21/v22.

---

## 1. Part Setting (SEC thickness creation + MID assignment) — ✅ Confirmed

**Rule:** for every converted part, a `*SECTION_*` card is created automatically with **SECID = PID** (the section reuses the part's own ID — no separate numbering, no manual assignment). The card type follows the element family:

| Element family | LS-DYNA section card | Data source |
|---|---|---|
| Shell | `*SECTION_SHELL` | Thickness read from PAM-CRASH part's **H** field |
| Solid | `*SECTION_SOLID` | Same automatic PID-based rule |
| Beam | `*SECTION_BEAM` | Same automatic PID-based rule |
| Discrete (spring/damper) | `*SECTION_DISCRETE` | Same automatic PID-based rule |

**MID:** carried over identically from PAM-CRASH — no renumbering, no manual reassignment, applied automatically to the converted `*PART`.

*(Note for later: (1) worth cross-checking at Goal 5 whether "MID stays fixed" holds permanently or only through this initial conversion. (2) The Constraint Setting table (Section 4) separately notes the Recliner Kjoint beam has its "Section and Elform Set separately" — worth confirming whether that's a genuine exception to this general PID-based rule, or just describing manual joint setup rather than the section-card creation itself.)*

---

## 2. Material Setting

| VPS (PAM-CRASH) | LS-DYNA | Remark | Status |
|---|---|---|---|
| 1 | *MAT_123 (MAT_MODIFIED_PIECEWISE_LINEAR_PLASTICITY) | For Solids Models (Hook, Strikers) | 🟡 |
| 45 | *MAT_083 (MAT_FU_CHANG_FOAM) | PAD Materials | 🟡 |
| 100 | *MAT_009 (MAT_NULL) | Null Material (JIG, Skin shells) | 🟡 |
| 101 | *MAT_001 (MAT_ELASTIC) | Elastic Shells, Retainer Shells | 🟡 |
| 103 | *MAT_024 (MAT_PIECEWISE_LINEAR_PLASTICITY) | General Shell Materials | 🟡 |
| 213 | *MAT_024 (MAT_PIECEWISE_LINEAR_PLASTICITY) | For Beams/Wires (same as LS-DYNA) | 🟡 |
| 230 | *MAT_119 (MAT_GENERAL_NONLINEAR_6DOF_DISCRETE_BEAM) | For Recliner Joints Models | 🟡 |

All seven card-level mappings match standard LS-DYNA material numbers, so no red flags there. "🟡" just means parameter-level mapping (yield curve, hardening, failure, strain-rate, foam curves, etc.) isn't detailed yet — that will matter for the actual HyperMesh config once we get to writing it.

**Note for the record:** earlier in this conversation, MAT105 → MAT024 was given as an illustrative example. This table lists VPS **103** (not 105) → MAT_024 for "General Shell Materials." **Update (validated 2026-09-10):** Altair's own PAM-CRASH 2G documentation confirms material type 105 is a real, distinct PAM-CRASH2G material type (separate from 103) — so MAT105 was likely correct as originally stated, not a misremembering. If MAT105 is used in the seat-structure model, it should be added here as its own row alongside 103.

---

## 3. Contact Setting

| VPS | LS-DYNA | Remark | Status |
|---|---|---|---|
| 33 | *CONTACT_AUTOMATIC_NODES_TO_SURFACE | Edge Treatment Included (Symmetrical) | ⚠️ |
| 33 | *CONTACT_AUTOMATIC_SURFACE_TO_SURFACE | Bolt Head vs Part, Part Face vs Part Face | ⚠️ |
| 34 | *CONTACT_NODES_TO_SURFACE | Edge to Surface | 🟡 |
| 36 | *CONTACT_AUTOMATIC_SINGLE_SURFACE | Self-Contact (For LS-DYNA, SOLIDS/BEAM/SHELL separated) | ⚠️ |
| 43 | *CONTACT_AUTOMATIC_BEAMS_TO_SURFACE | Beams vs (Shell+Solid) | 🟡 |
| 46 | *CONTACT_AUTOMATIC_SINGLE_SURFACE | Edge to Edge (+ α Self Contact on Edges) | ⚠️ |
| TIED | *CONTACT_TIED_SHELL_EDGE_TO_SURFACE_BEAM_OFFSET | For Connection within the plastic parts and ribs | 🟡 |
| Welding (MPC Plinks) | *CONTACT_SPOTWELD_WITH_TORSION_PENALTY | Spotweld (6mm nugget or 2.5mm interval MIG seam) | 🟡 (see Section 5) |
| Welding (Plink) | *CONTACT_SPOTWELD | Arc-Welding (1mm interval MIG seam) like Laser Weldings | ⚠️ (see Section 5 — conflicts with Welding Types table) |

**Two disambiguation rules needed here (flagged, not blocking — can resolve when we properly work through Contact Setting):**

1. **VPS 33 maps to two different LS-DYNA contacts** depending on context (edge-treated symmetrical contact vs. bolt-head/part-face contact). **Confirmed (2026-09-10): this is a manual, case-by-case engineering judgement — there is no deterministic signal.** Design consequence: the contacts module must **not** auto-decide VPS 33. It applies a documented safe default and **flags every VPS 33 contact for engineer review** (human-in-the-loop). Auto-deciding a judgement call would create silent errors.
2. **VPS 36 and 46 both map to `*CONTACT_AUTOMATIC_SINGLE_SURFACE`.** Difference is parameter-level (edge treatment etc.) — **left as TBC** pending the test model and/or a parameter spec.

**Contacts module = three jobs (not "create from scratch"):** unlike materials, HyperMesh's default *does* partially convert contacts, so the module (a) **re-types** where the team overrides Altair's default (e.g. VPS 46: GENERAL→SINGLE_SURFACE), (b) **creates** what Altair skips (VPS 34, 43 — if source data is available), and (c) **flags** the VPS 33 judgement calls for review. Whether any of this is even possible from the converted deck alone depends on whether the VPS origin survives conversion — see Test Model Checklist.

**Cross-check against Altair's own default mapping (validated 2026-09-10):** Altair's built-in LS-DYNA↔PAM-CRASH reference confirms VPS 33/36/46 correspond to genuine PAM-CRASH contact IDs (CNTAC33/36/46) — so the numbering in your table is standard, not company shorthand. One difference worth flagging: Altair's own default pairs CNTAC46 with `*CONTACT_AUTOMATIC_GENERAL`, while your table uses `*CONTACT_AUTOMATIC_SINGLE_SURFACE` for VPS 46. This isn't necessarily wrong — it looks like an intentional customization on your team's part — just flagging the deviation from Altair's stock default for the record.

---

## 4. Constraint Setting

| VPS | LS-DYNA | DOF | Remark | Status |
|---|---|---|---|---|
| Bolt | *CONSTRAINED_JOINT (Revolute) | Free on the Rotational Axis | Almost same as VCP | 🟡 |
| Bolt_Macro | Shell(Nut) + Beam + Shell(Head) | N/A | Manual Setup with Body Force Setting | 🟡 |
| Recliner Kjoint | *CONSTRAINED_JOINT (Revolute) with COOR + Beam | Free on the Rotational Axis | Beam (Section and Elform Set separately) | 🟡 |
| Kjoint For Lock | *CONSTRAINED_JOINT_LOCKING | All Fixed | Recliner Lever locks, Height Adjustor Locks | 🟡 |

Note: LS-DYNA's locking-joint family has a few keyword variants (e.g. locking revolute vs. generic). Worth confirming the exact `*CONSTRAINED_JOINT_LOCKING_...` keyword you use once we get to writing the actual config entries for this section.

---

## 5. Welding Types

| VPS | LS-DYNA Beam/Connector | Contact Type | Interval | Remark | Status |
|---|---|---|---|---|---|
| Spotweld (MPC-Plink) | Beam ⌀6 via Connector*CoNX | *CONTACT_SPOTWELD_WITH_TORSION_PENALTY | Spot By Spot | *Still need research (your note) | 🟡 |
| Arc-welding (Plinks) | Beam ⌀1 via Connector*CoNX | *CONTACT_TIED_SHELL_EDGE_TO_SURFACE_BEAM_OFFSET | 2.5mm | Contact Soft 1 only applied | ⚠️ |
| Laser Welding | Beam ⌀1 via Connector*CoNX | *CONTACT_TIED_SHELL_EDGE_TO_SURFACE_BEAM_OFFSET | 1mm | Contact Soft 1 only applied, *Still need research | ⚠️ |
| RBODY | NRB (Nodal Rigid Body) | Contact not needed | More than 2 points definition | Weld between 1D and 2D | 🟡 |

**⚠️ Conflict found between the two reference tables you shared, needs your call:**

- The **Contact Setting table (Section 3)** says: `Welding (Plink) → *CONTACT_SPOTWELD`, described as "Arc-Welding (1mm interval MIG seam) like Laser Weldings" — i.e. one contact type, 1mm, covering both arc and laser.
- The **Welding Types table (this section)** says: Arc-welding → `*CONTACT_TIED_SHELL_EDGE_TO_SURFACE_BEAM_OFFSET` at **2.5mm**, and Laser Welding → the *same* tied contact at **1mm** — i.e. a different keyword entirely from `*CONTACT_SPOTWELD`, and arc/laser use different intervals from each other.

These can't both be right as written. Spotweld (MPC-Plink) matches cleanly across both tables, so that one's solid. But for Arc-welding and Laser Welding specifically, which table is the current standard — the Welding Types table (tied shell edge, 2.5mm/1mm split), or the Contact Setting table (spotweld contact, 1mm for both)? Or has the convention changed between when each table was created?

---

## 6. Output Setting

| VPS | LS-DYNA | Remark | Status |
|---|---|---|---|
| THNOD | *DATABASE_HISTORY_NODE | Displacement, Position | ✅ |
| THELE (Shell) | *DATABASE_HISTORY_SHELL | Force, Contact | ✅ |
| THELE (Beam) | *DATABASE_HISTORY_BEAM | *Work In Progress (your note) | 🟡 |
| SECFOR | *DATABASE_CROSS_SECTION | *Work In Progress (your note) | 🟡 |

Straightforward, standard LS-DYNA output-request keywords — no concerns on the card-level mapping. The two "Work In Progress" rows are flagged as such in your own reference, so we'll pick those up again once you've resolved them on your end.

---

## 🎯 Test Model Checklist — the current critical path (serves Materials + Contacts)

Both the Materials module (blocker 1) and the Contacts module are now gated on one thing: seeing what a **HyperMesh-converted deck actually contains**. Running one small PAM-CRASH seat sub-part (a handful of parts covering shell + solid + a couple of contacts + a weld, if possible) through the Altair conversion and capturing the output will unblock both at once.

**What to capture from the converted `.dyn`/`.k` output:**

For **materials** (resolves blocker 1):
- [ ] Is there a `*MAT_*` section at all? Or do parts point to MIDs with no card?
- [ ] If cards exist: are they real materials, empty placeholders, or a generic fallback type?
- [ ] Do the parts still carry the correct MID from PAM-CRASH?
- [ ] Paste one or two full `*PART` + `*SECTION_*` + `*MAT_*` blocks verbatim.

For **contacts** (resolves the "is disambiguation even possible" question):
- [ ] What does a converted CNTAC33 look like — which `*CONTACT_*` keyword did Altair emit?
- [ ] **Is the original VPS type (33/36/46) preserved anywhere** — in the contact title, a `$`-comment, or a naming pattern? (This decides whether the module can even identify what each contact "was".)
- [ ] How did CNTAC36 and CNTAC46 come out — same keyword, different params?
- [ ] Did CNTAC34 / CNTAC43 convert at all, or get dropped?
- [ ] Paste one full converted `*CONTACT_*` block verbatim.

General:
- [ ] Note the include-file structure of the output (which entities landed in which `*INCLUDE`).
- [ ] Confirm whether values are still in native PAM-CRASH units (as expected).

Once we have this, both modules move from scaffold to real, runnable code.

---

## Parked for a later round (not in current scope)

- Sets & Groups (PAM-CRASH GROUP → `*SET_NODE_LIST` / `*SET_PART_LIST`)
- Element formulations/properties beyond what Part Setting covers
- Curves & boundary/loading conditions
- Unit System rescaling detail (deferred to Goal 5, see main context doc Section 5)
- Control Cards

---

*Next step: run the HyperMesh test model and capture the checklist above. That single data point unblocks both the Materials and Contacts modules. In parallel, the Arc/Laser welding conflict (Section 5) still needs your call on which table is current.*
