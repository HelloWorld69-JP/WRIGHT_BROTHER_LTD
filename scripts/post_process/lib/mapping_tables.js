/* ============================================================================
 * mapping_tables.js
 * ----------------------------------------------------------------------------
 * Single source of truth for PAM-CRASH (VPS) -> LS-DYNA entity mappings, as a
 * data table the post-process modules read. Adding a new material/contact/etc.
 * type later means editing THIS file, not the module logic.
 *
 * This file encodes ONLY what has been confirmed with the modelling team.
 * Parameter-level field mappings (which PAM-CRASH field -> which LS-DYNA field)
 * are NOT filled in yet for most cards and are marked accordingly. Do not treat
 * an empty `fields` block as "no mapping needed" — it means "not yet defined".
 *
 * Cross-reference: PAMCRASH_to_LSDYNA_Entity_Conversion_Mapping.md
 * Units: model carries native PAM-CRASH mm-ms-kg-kN-GPa through this stage
 *        (rescaling is deferred to Goal 5). Do NOT scale values here.
 * ========================================================================= */

var MappingTables = {

  /* --- 2. MATERIALS -------------------------------------------------------
   * key   = PAM-CRASH (VPS) material type number
   * dyna  = target LS-DYNA *MAT keyword (PRIMER material "type" string)
   * matNo = LS-DYNA material number (for reference/QA)
   * remark= team note on usage
   * fields= parameter-level field map  (TODO: not yet defined — see .md)
   */
  materials: {
    "1":   { dyna: "MODIFIED_PIECEWISE_LINEAR_PLASTICITY", matNo: 123, remark: "Solids (Hook, Strikers)", fields: null },
    "45":  { dyna: "FU_CHANG_FOAM",                        matNo:  83, remark: "PAD materials",            fields: null },
    "100": { dyna: "NULL",                                 matNo:   9, remark: "Null (JIG, Skin shells)",  fields: null },
    "101": { dyna: "ELASTIC",                              matNo:   1, remark: "Elastic / Retainer shells",fields: null },
    "103": { dyna: "PIECEWISE_LINEAR_PLASTICITY",          matNo:  24, remark: "General shell materials",  fields: null },
    "213": { dyna: "PIECEWISE_LINEAR_PLASTICITY",          matNo:  24, remark: "Beams / Wires",            fields: null },
    "230": { dyna: "GENERAL_NONLINEAR_6DOF_DISCRETE_BEAM", matNo: 119, remark: "Recliner joint models",    fields: null }
    // NOTE: VPS 105 (distinct from 103) may also appear -> add here once confirmed.
  },

  /* --- 3. CONTACTS --------------------------------------------------------
   * VPS 33 is context-dependent (two targets) -> see `contactRules` below,
   * not a plain 1:1 lookup. VPS 36 and 46 share a keyword but differ by
   * parameters (edge treatment) -> parameter map TBD.
   */
  contacts: {
    "34": { dyna: "NODES_TO_SURFACE",           remark: "Edge to Surface",                 fields: null },
    "36": { dyna: "AUTOMATIC_SINGLE_SURFACE",   remark: "Self-contact (solids/beam/shell separated)", fields: null },
    "43": { dyna: "AUTOMATIC_BEAMS_TO_SURFACE", remark: "Beams vs (shell+solid)",          fields: null },
    "46": { dyna: "AUTOMATIC_SINGLE_SURFACE",   remark: "Edge to Edge (+a self contact on edges); team override of Altair default GENERAL", fields: null },
    "TIED": { dyna: "TIED_SHELL_EDGE_TO_SURFACE_BEAM_OFFSET", remark: "Connection within plastic parts and ribs", fields: null }
  },

  // VPS 33 disambiguation — needs the deciding signal defined before scripting.
  contactRules: {
    "33": {
      options: [
        { dyna: "AUTOMATIC_NODES_TO_SURFACE",   when: "TODO: edge-treated symmetrical case" },
        { dyna: "AUTOMATIC_SURFACE_TO_SURFACE", when: "TODO: bolt head vs part / part face vs part face" }
      ],
      note: "Deciding signal (parts involved / card flag / rigid-vs-deformable) NOT yet defined."
    }
  },

  /* --- 4. CONSTRAINTS (joints) -------------------------------------------- */
  constraints: {
    "Bolt":           { dyna: "CONSTRAINED_JOINT_REVOLUTE", dof: "Free on rotational axis", remark: "Almost same as VCP", fields: null },
    "Bolt_Macro":     { dyna: "SHELL_BEAM_SHELL_MANUAL",    dof: "N/A",                     remark: "Nut(shell)+Beam+Head(shell), manual body-force setup", fields: null },
    "Recliner_Kjoint":{ dyna: "CONSTRAINED_JOINT_REVOLUTE", dof: "Free on rotational axis", remark: "With COOR + Beam; section & elform set separately", fields: null },
    "Kjoint_For_Lock":{ dyna: "CONSTRAINED_JOINT_LOCKING",  dof: "All fixed",               remark: "Recliner lever / height adjustor locks", fields: null }
  },

  /* --- 5. WELDING --------------------------------------------------------
   * CONFLICT (arc/laser) between the two source tables is UNRESOLVED — see .md
   * Section 5. Only Spotweld (MPC-Plink) and RBODY are consistent. Arc & Laser
   * entries are left as `unresolved: true` so no module silently picks one.
   */
  welding: {
    "Spotweld_MPC_Plink": { beam: "beam D6 via Connector/CoNX", contact: "CONTACT_SPOTWELD_WITH_TORSION_PENALTY", interval: "spot by spot", unresolved: false },
    "Arc_Welding_Plinks": { beam: "beam D1 via Connector/CoNX", contact: "UNRESOLVED", interval: "UNRESOLVED", unresolved: true },
    "Laser_Welding":      { beam: "beam D1 via Connector/CoNX", contact: "UNRESOLVED", interval: "UNRESOLVED", unresolved: true },
    "RBODY":              { beam: "NRB (Nodal Rigid Body)",     contact: "none",                               interval: ">2 points", unresolved: false }
  },

  /* --- 6. OUTPUT --------------------------------------------------------- */
  outputs: {
    "THNOD":       { dyna: "DATABASE_HISTORY_NODE",  remark: "Displacement, Position", ready: true  },
    "THELE_SHELL": { dyna: "DATABASE_HISTORY_SHELL", remark: "Force, Contact",         ready: true  },
    "THELE_BEAM":  { dyna: "DATABASE_HISTORY_BEAM",  remark: "team: work in progress", ready: false },
    "SECFOR":      { dyna: "DATABASE_CROSS_SECTION", remark: "team: work in progress", ready: false }
  }
};

// Export for both PRIMER JS (global) and any Node-based unit testing.
if (typeof module !== "undefined" && module.exports) { module.exports = MappingTables; }
