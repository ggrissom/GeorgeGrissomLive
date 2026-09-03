# ByGeorge launch source audit — September 3, 2026

## Source and limits

The requested `C:\Dev\ByGeorge\ByGeorge.tab` path is absent on this machine. The inspected fallback is the installed `ByGeorge.extension` under the current Windows user's `%APPDATA%\pyRevit\Extensions`. Its README calls it a curated July 29, 2026 copy and explicitly says Revit 2024, 2025, and 2026 need runtime validation before commercial release. All 15 named buttons exist there. The supplied Drive backup also contains the same six panel names, dated July 29; that folder does not contain Shortcut Matrix.

This is a static source/dependency audit, not an in-Revit certification. No tool can yet be represented as verified safe to sell. No customer or production model was opened or modified. Original installed files were not edited. Source SHA-256 values are recorded below and in the private release manifest.

Common requirements: Windows, full Autodesk Revit (not LT), a pyRevit release compatible with that Revit installation, and the IronPython engine. WinForms tools also use the .NET Windows Forms and Drawing assemblies available to that engine. A specific minimum pyRevit version is not established by the supplied source. Version ranges below are source declarations, not verified support promises.

## Tool decisions

| Tool | Purpose and dependencies | Declared Revit target | Finding and launch decision |
|---|---|---|---|
| DataLink | Parameter export/import through XLSX; stdlib ZIP/XML, Revit API, WinForms. No Excel COM dependency. | 2023–2026 | Candidate. Import writes parameters; validate units, read-only parameters, element identity and transaction rollback. IntegerValue usage needs version testing. |
| Element Explorer | Find/filter/inspect/select elements; Revit API, WinForms, generic .NET collections. | 2023–2026 | Candidate. Lower model-change risk; verify large-model filtering, selection, and grid behavior. `.None` enum access is IronPython syntax, not evidence of a broken script. |
| Import Elements From Model | Import up to five loadable families from open/linked model; temporary RFA files, Revit family API, WinForms. | 2023–2026 | Candidate. Limited to loadable families, not arbitrary model elements. Test duplicate families, linked source editing restrictions, cleanup, and cancellation. |
| Import Titleblock From Model | Extract/load titleblock families; optional replacement of placed titleblocks; temporary files and Revit API. | 2023–2026 | Candidate. Replacement changes model instances; verify type mapping, duplicate handling, read-only sources, and opened-document cleanup. |
| PushParams | Add shared parameters referenced by a schedule to families; active shared-parameter definition file and family editing API. | 2024–2026 | Candidate. Uses GroupTypeId and family load callbacks. Missing shared-parameter definitions must be handled; family edit/load rollback needs runtime verification. |
| Linked View Mapper | Apply By Linked View display to host views; loaded Revit link, Revit link graphics settings, WinForms. | 2024–2026 | Candidate. Version-sensitive API and IntegerValue usage. Verify graphics settings, mapping ambiguity and rollback on each target release. |
| Copy Scope From | Copy scope boxes from another open project; shared scope_transfer module. | 2023–2026 | **Deferred: definite import failure.** Required helper functions are absent from the provided module. |
| Copy Scope To | Copy scope boxes into another open project; shared scope_transfer module. | 2023–2026 | **Deferred: definite import failure.** Same incomplete module. |
| Enl Views AUTO | Enlarged plan/RCP/3D views from local MEP Spaces and templates; Revit geometry API. | Header says 2023–2026; bundle has no range | Candidate. Requires suitable spaces/templates. Validate rotated boundaries, empty/unbounded spaces, crop geometry, naming collisions, units, and undo. |
| Ghostly Transmission | Detach/open local RVT copies, purge, compact-save, gather dependency references, ZIP/report; filesystem and Revit document APIs. | No complete bundle version range | **Deferred.** Batch filesystem and purge operations need model fixtures, path/output separation, failure recovery and per-version checks. Not packaged or purchasable. |
| Turn Off Link Levels Grids Scope Worksets | Reload links with matching named worksets closed; workshared links and Revit workset API. | 2023–2026 | Candidate. Display name shortened to Link Worksets OFF on storefront. Name matching can affect visibility; test worksharing ownership and reload failures. |
| Import Sheets | Create sheets from XLS/XLSX; Microsoft.Office.Interop.Excel / desktop Excel COM. | 2023–2026 | **Deferred.** Additional installed Excel dependency and COM lifecycle require separate verification. Not packaged or purchasable. |
| Place Views On Sheets | Place/map views, match viewport types/titles and scope alignment; Revit viewport API, WinForms. | 2023–2026 | Candidate. Verify already-placed views, unsupported view types, repeat placement, transactions and coordinates. |
| CennerIt | Zoom/center selected element bounding boxes in open plan/section/3D UI views; Revit UI API. | 2023–2026 | First runtime-validation candidate. No transaction or model-write operation in inspected script. Empty selection exits; view failures are caught. Still needs a real Revit check. |
| ViewTemplateManager | Bulk change template Include/parameter-control flags; Revit template API, WinForms. | Bundle 2023–2026; header Revit 2024 | Candidate with an explicit version discrepancy. Changes control flags, not parameter values. Validate parameter IDs and mixed template selection. |
| Shortcut Matrix.panel.off | Absent from installed source and supplied main backup, but located in an older Drive backup. Script dispatch uses WinForms, JSON assignments, and Python compile/exec; older slots also support native Revit PostCommand. | Main bundle 2023–2026, zero-document context | **Deferred.** Main UI and slot library disagree on slot count, assignment file location and schema. Full pyRevit execution context and event-loop behavior are unverified. Not packaged or sold. |

### Confirmed missing scope helpers

The button imports reference `get_uiapp`, `get_selected_scope_boxes`, `choose_doc`, `choose_docs`, `choose_scope_boxes`, `report_copy`, and `alert`. The supplied 207-line `lib/scope_transfer.py` defines none of these. Its copy function and form class do not satisfy those imports. Excluding the buttons avoids shipping a known immediate import failure.

### Shortcut Matrix backup findings

The [older disabled-panel backup](https://drive.google.com/drive/folders/1P8ryW7QrRoEhPNGeb7dXIKb_WKOJrMnG) contains 12 slot buttons, Show Assignments, Shortcut Matrix, Configure Shortcut Slot, and a shared library. The main UI declares 24 slots and writes `%APPDATA%\\ByGeorge\\ShortcutMatrix\\shortcut_matrix.json`. The older library declares 12 slots, uses `slot_01` assignment keys, and writes `%APPDATA%\\pyRevit\\ByGeorge\\shortcut_matrix.json`. Configure Shortcut Slot imports that older library. Assignments made through the main UI therefore cannot be assumed to reach the existing slot buttons.

The main UI executes selected scripts in its global namespace and restores only `__file__`; selected scripts can leave globals behind. The library uses a copied namespace and restores the working directory, but neither path establishes the complete pyRevit command engine/context. The main form's `Application.Run` also needs an actual Revit event-loop check. These source conflicts are sufficient to defer the panel independently of runtime testing. No backup scripts were executed or added to the release.

## Package boundary

The preview package contains the 11 candidates, their original payload bytes and icons, one shared license module, project-document availability metadata, installation instructions, and a Windows installer. Each button checks its own entitlement before importing/executing its payload. Generated wrappers do not alter the original tool logic. No disabled panels, backups, state files, model files, confidential workbook contents, or payment credentials are copied.

The private ZIP is approximately 128 KB, so keeping one release in the existing PostgreSQL database is practical and avoids another storage service. Downloads require a paid, active license and return private, non-cacheable responses. Code is shipped as licensed source, so this is practical activation enforcement, not tamper-proof DRM.

## Source fingerprints

| Tool | SHA-256 of inspected script.py |
|---|---|
| DataLink | `608596a92ccB1f4d47625b02c9501755fb258441f4b1f3a8236a823b8568fcba` |
| Element Explorer | `6b87728a4deef8c86803e4c2db16559f440b1909e260d78ec1794753a4989ace` |
| Import Elements From Model | `8617bb90d1352c35b3f36f8af69a6fe3a62e258677e5d3496d2ef5112ef75903` |
| Import Titleblock From Model | `b238ef33131c6a1236406aa82f86205fb77f5732fa13857af8c29be788ae3de6` |
| PushParams | `bb6691774d2523266ae254baaf4db0d4e32c828f5cb5e8530be288bc4d9d0e1c` |
| Linked View Mapper | `8a7f8b92deabfc2a054a547a432f5eace3697a441f68e5d341d4e9ab07089d88` |
| Copy Scope From | `f69a555cf0eae449e43df3abc783d9c359c8a0f4ea6d11c78073a4879ebe3c6c` |
| Copy Scope To | `6b686c2078d5b0d74a12bdc66f2711e2c370e994d7502c29176eead4a31cd059` |
| Enl Views AUTO | `31b69604cd655e74db7e492e4b659a4490eddd8a301509be7819499b1f30978d` |
| Ghostly Transmission | `3652e3a121dcbb4830660044ec23b2fbabf245260b4356bedf6516ff3c3bedb3` |
| Link Worksets OFF | `277810770085242622c46401b40c9819d280320b7ab78741165ae644c476e6b7` |
| Import Sheets | `58e93936ffbf001392e8e74fcb41e7ad19ecc8c780d01469ab8841a2db291fa2` |
| Place Views On Sheets | `f93b1216f07016debaa97cc19abc1b1730372d8a4d63048bae7127f3f5c17610` |
| CennerIt | `d5137ecc2b9c728fa9b1f9e9845aca28013f5e406fc81c0bc29dfecab5cd7009` |
| ViewTemplateManager | `a62911a628a8cf4ddb1244862d0343799f4f45f3bec29a829449ef42a7e9bfde` |

## Reference behavior

The package uses pyRevit's documented [project-document bundle context](https://pyrevitlabs.notion.site/Bundle-Context-630fa1f3611f4ee0aa15d290275e7ef3). Payment fulfillment follows [Stripe's fulfillment guidance](https://docs.stripe.com/checkout/fulfillment): verify the webhook, retrieve the session server-side, require paid status, and make fulfillment idempotent. Browser redirects alone never grant an entitlement.
