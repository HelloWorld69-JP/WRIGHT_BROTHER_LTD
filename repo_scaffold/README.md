# WRIGHT_BROTHER_LTD — PAM-CRASH → LS-DYNA ASSY Conversion

Tooling and methodology for converting PAM-CRASH (VPS) seat-structure models into
error-free LS-DYNA ASSY models, and automating the process for future models.

## Two-stage conversion architecture

1. **Baseline geometry conversion — HyperMesh 2025** (Altair Pamcrash→Dyna toolset).
   A **compiled, black-box** engine (`/PamcrashToDyna/*.tbc` are TclPro ByteCode).
   We drive it but do **not** modify it. It reliably handles: elements, PART,
   sections, mass, SPC constraints, and a few basic contact types.

2. **Custom post-process layer — Oasys PRIMER JavaScript API** (`/scripts/post_process`).
   Owned by us, version-controlled here. Applies everything the Altair default
   flags "not supported": materials, outputs, welds/joints, curves, and
   team-specific contact re-mapping. **This is the core deliverable.**

## Repo layout

```
/PamcrashToDyna/     Altair's default HyperMesh conversion toolset (reference; compiled .tbc + .txt config)
/docs/               Project context + entity conversion mapping (the methodology, in Markdown)
/scripts/
  /post_process/     PRIMER JavaScript post-process layer
    main.js          Orchestrator (runs the modules in order)
    01_materials.js  VPS material -> *MAT mapping
    02_contacts.js   VPS contact -> *CONTACT mapping   (planned)
    03_constraints.js  joints                          (planned)
    04_welds.js      welds/PLINK                        (planned)
    05_outputs.js    history / cross-section outputs    (planned)
    /lib/
      mapping_tables.js   Data tables (confirmed mappings) — edit here to extend
      util.js             Shared helpers (logging, model access)  (planned)
```

## Conventions
- **Units:** the model carries native PAM-CRASH `mm-ms-kg-kN-GPa` through conversion.
  Rescaling to `mm-s-ton-N-MPa` is deferred to the Final Brush-Up (Goal 5). Scripts here do **not** scale.
- **IDs:** MID and other IDs follow the existing PAM-CRASH numbering — no renumbering
  until Goal 5. SECID = PID for created section cards.
- **Model structure:** master `.dyn` + many `*INCLUDE` files (PAM-CRASH-style).
- **PRIMER:** v21+, scripts must run both in the GUI and in batch.

## Status
Early build. Mapping tables encode confirmed card-level rules; parameter-level field
maps and several open questions are tracked in `/docs`. See the two docs there for the
authoritative, up-to-date state.
