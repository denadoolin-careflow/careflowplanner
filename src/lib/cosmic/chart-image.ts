/** Resolve the live SVG's theme before rasterizing it outside the document. */
export async function chartImage(svg: SVGSVGElement): Promise<Blob> {
  await document.fonts.ready;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const originals = [svg, ...svg.querySelectorAll<SVGElement>("*")];
  const copies = [clone, ...clone.querySelectorAll<SVGElement>("*")];
  const properties = ["fill", "stroke", "color", "opacity", "fill-opacity", "stroke-opacity", "stroke-width", "stroke-dasharray", "font-family", "font-size", "font-weight", "text-anchor", "dominant-baseline"];
  originals.forEach((element, index) => {
    const copy = copies[index];
    if (!copy) return;
    const computed = getComputedStyle(element);
    properties.forEach(property => copy.style.setProperty(property, computed.getPropertyValue(property)));
  });
  const size = 1440;
  clone.removeAttribute("class");
  clone.setAttribute("width", String(size));
  clone.setAttribute("height", String(size));
  clone.style.width = `${size}px`;
  clone.style.height = `${size}px`;
  clone.style.maxWidth = "none";
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image canvas unavailable");
    const surface = svg.querySelector("circle");
    context.fillStyle = getComputedStyle(surface ?? svg).fill;
    context.fillRect(0, 0, size, size);
    context.drawImage(image, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Image generation failed")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Called with an already-prepared image, preserving Safari's user activation. */
export async function saveChartImage(blob: Blob): Promise<void> {
  const file = new File([blob], "natal-chart.png", { type: "image/png" });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Natal chart" });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}