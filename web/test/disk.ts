/** Leitura dos JSON reais de `public/data` a partir do disco, para testes sem rede. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const DATA_DIR = resolve(__dirname, "../public/data");

/** Imita `fetch("/data/<caminho>")`, mas lê do disco. */
export const diskFetcher = (url: string): Promise<Response> => {
  const relative = url.replace(/^\/data\//, "");
  try {
    return Promise.resolve(new Response(readFileSync(resolve(DATA_DIR, relative), "utf-8")));
  } catch {
    return Promise.resolve(new Response("not found", { status: 404 }));
  }
};
