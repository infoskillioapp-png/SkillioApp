"use client";

import { useEffect, useRef, useState } from "react";

type Props = { markdown: string };

type MarkmapInstance = { fit: () => Promise<void> | void };

/**
 * Renderiza un mapa conceptual interactivo a partir de markdown
 * jerarquico (formato markmap). Carga la lib dinamicamente.
 */
export function MarkmapRender({ markdown }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mmRef = useRef<MarkmapInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let resizeObs: ResizeObserver | null = null;
    let refitTimer: ReturnType<typeof setTimeout> | null = null;

    async function run() {
      try {
        const [{ Transformer }, viewMod] = await Promise.all([
          import("markmap-lib"),
          import("markmap-view"),
        ]);
        if (cancelled || !svgRef.current) return;

        const transformer = new Transformer();
        const { root } = transformer.transform(markdown);

        // Limpiar contenido previo
        while (svgRef.current.firstChild) {
          svgRef.current.removeChild(svgRef.current.firstChild);
        }

        const mm = viewMod.Markmap.create(
          svgRef.current,
          {
            initialExpandLevel: 1,
            duration: 350,
            // Spacing reducido para que entre más en pantalla
            spacingHorizontal: 60,
            spacingVertical: 12,
            paddingX: 12,
            maxWidth: 280, // Limita el ancho de las pills largas (wrappea texto)
            zoom: true,
            pan: true,
          },
          root,
        );
        mmRef.current = mm as unknown as MarkmapInstance;

        // fit inicial — y otro retrasado por si el contenedor todavia no
        // tenia tamaño final (modales con animacion de entrada)
        await mm.fit();
        refitTimer = setTimeout(() => {
          mmRef.current?.fit();
        }, 250);

        // Re-fit cada vez que el contenedor cambia de tamaño (resize ventana)
        if (containerRef.current && "ResizeObserver" in window) {
          resizeObs = new ResizeObserver(() => {
            mmRef.current?.fit();
          });
          resizeObs.observe(containerRef.current);
        }

        setReady(true);
      } catch (e) {
        console.error("[markmap]", e);
        setErr(e instanceof Error ? e.message : "render_failed");
      }
    }

    run();
    return () => {
      cancelled = true;
      if (refitTimer) clearTimeout(refitTimer);
      resizeObs?.disconnect();
    };
  }, [markdown]);

  return (
    <div className="relative w-full">
      <div
        ref={containerRef}
        className="rounded-2xl border border-rule bg-paper-warm overflow-hidden"
        style={{ height: 600 }}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ background: "transparent" }}
        />
        {!ready && !err && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[12.5px] text-ink-soft">
              Dibujando el mapa…
            </span>
          </div>
        )}
        {err && (
          <div className="absolute inset-0 flex items-center justify-center text-[12.5px] text-danger px-4 text-center">
            Error al renderizar el mapa: {err}
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-softer">
        <span>Arrastrá para mover · scroll para zoom · click en un nodo para plegarlo</span>
        <button
          type="button"
          onClick={() => mmRef.current?.fit()}
          className="px-3 py-1 rounded-full border border-rule-soft hover:border-ink-soft transition"
        >
          Centrar
        </button>
      </div>
    </div>
  );
}
