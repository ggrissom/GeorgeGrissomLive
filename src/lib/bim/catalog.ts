export type Product = {
  id: string; name: string; price: number; category: string; description: string;
  requirements: string; status: "candidate" | "deferred"; features: string[];
};

const tool = (id: string, name: string, price: number, category: string, description: string,
  requirements = "Source targets Revit 2023–2026. Windows and pyRevit with IronPython required.",
  status: Product["status"] = "candidate"): Product =>
  ({ id, name, price, category, description, requirements, status, features: [id] });

export const tools: Product[] = [
  tool("datalink", "DataLink", 4900, "Data & families", "Export Revit parameters to XLSX, edit them in a spreadsheet, and import writable values back. Excel is not required for the file engine."),
  tool("element-explorer", "Element Explorer", 1900, "Data & families", "Find, inspect, filter, and select elements by category, type, parameter, level, or workset."),
  tool("import-elements", "Import Elements From Model", 2900, "Data & families", "Browse an open or linked model and bring up to five loadable families into your project."),
  tool("import-titleblock", "Import Titleblock From Model", 2900, "Data & families", "Bring in a titleblock family from another model, with an optional replacement of placed titleblocks."),
  tool("pushparams", "PushParams", 3900, "Data & families", "Push shared parameters used by a schedule into loadable families.", "Source targets Revit 2024–2026; pyRevit IronPython and a matching shared-parameter file required."),
  tool("linked-view-mapper", "Linked View Mapper", 3900, "Views & coordination", "Map host views to linked-model views and apply By Linked View display settings.", "Source targets Revit 2024–2026; pyRevit IronPython and a loaded Revit link required."),
  tool("copy-scope-from", "Copy Scope From", 1900, "Views & coordination", "Copy selected scope boxes from another open model into the active model.", "Deferred: the supplied scope_transfer module is missing functions imported by this button.", "deferred"),
  tool("copy-scope-to", "Copy Scope To", 1900, "Views & coordination", "Copy selected scope boxes from the active model to another open model.", "Deferred: the supplied scope_transfer module is missing functions imported by this button.", "deferred"),
  tool("enlarged-views", "Enl Views AUTO", 4900, "Views & coordination", "Create cropped plans, reflected ceiling plans, and 3D section boxes from local MEP Spaces and view templates.", "Source targets Revit 2023–2026; pyRevit IronPython, bounded local MEP Spaces, and suitable view templates required."),
  tool("ghostly-transmission", "Ghostly Transmission", 5900, "Model setup", "Prepare detached local RVT copies, purge unused elements, and collect a transmission package.", "Deferred: batch file output, purge behavior, dependency paths, and Revit-version handling need runtime validation.", "deferred"),
  tool("link-worksets", "Link Worksets OFF", 1900, "Model setup", "Reload linked models with worksets matching Levels, Grids, or Scope Boxes closed."),
  tool("import-sheets", "Import Sheets", 2900, "Sheets", "Create Revit sheets from an Excel sheet index.", "Deferred: requires Microsoft Excel desktop COM/Interop in addition to Revit 2023–2026 and pyRevit IronPython.", "deferred"),
  tool("place-views", "Place Views On Sheets", 3900, "Sheets", "Map and place views on sheets, with scope-box alignment and reference viewport matching."),
  tool("cennerit", "CennerIt", 900, "Views & coordination", "Center the current selection across open supported views. A small shortcut for a task you repeat all day."),
  tool("view-template-manager", "ViewTemplateManager", 2900, "Views & coordination", "Change which parameters selected view templates control, without changing the parameter values.", "Bundle targets Revit 2023–2026; script header says Revit 2024. Other versions require verification. pyRevit IronPython required."),
];
export const launchFeatures = tools.filter(p => p.status === "candidate").map(p => p.id);
export const suite: Product = {
  id: "launch-suite", name: "ByGeorge Launch Suite", price: 12900,
  category: "The complete launch collection", status: "candidate", features: launchFeatures,
  description: `${launchFeatures.length} focused utilities. One download. One activation key. Less clicking between you and a finished model.`,
  requirements: "Suite target: Revit 2024–2026 on Windows with pyRevit IronPython. Runtime verification is pending. Deferred tools are not included.",
};
export const products = [suite, ...tools];
export const productById = (id: string) => products.find(p => p.id === id);
export const dollars = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
