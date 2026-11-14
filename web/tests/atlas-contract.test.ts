// Contract: files written by the Python exporter (terratempo.atlas) must pass the
// site's zod schemas. The fixture is a small synthetic 20° export; regenerate with
// terratempo.atlas.export_variable(make_dataset("temperatura", resolution=20), out).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { gridSchema, manifestSchema, metaSchema, regionsSchema, seriesSchema } from "@/lib/atlas/data/schema";

const dir = resolve(__dirname, "../test/fixtures/atlas-v3");
const read = (p: string) => JSON.parse(readFileSync(resolve(dir, p), "utf-8"));

describe("atlas export from the Python pipeline", () => {
  it("meta.json passes the schema and is labelled as demo", () => {
    const meta = metaSchema.parse(read("temperature/meta.json"));
    expect(meta.isDemo).toBe(true);
  });
  it("grid, regions and global series pass the schemas", () => {
    expect(gridSchema.parse(read("temperature/grid_trend.json")).length).toBeGreaterThan(0);
    expect(regionsSchema.parse(read("temperature/regions.json")).length).toBeGreaterThan(0);
    expect(seriesSchema.parse(read("temperature/series_global.json")).length).toBe(288);
  });
  it("variables.json passes the manifest schema", () => {
    expect(manifestSchema.parse(read("variables.json")).variables[0]!.id).toBe("temperature");
  });
});
