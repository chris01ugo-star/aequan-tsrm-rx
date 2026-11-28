/** Catenina radiopaca sul campo esposto, se il paziente entra in sala senza rimuoverla. */
export function stampUnremovedMetal(
  pixels: Float32Array,
  shutter: Uint8Array,
  width: number,
  height: number,
): void {
  const cx = width * 0.5;
  const cy = height * 0.2;
  const scale = Math.min(width, height);
  const y0 = Math.max(0, Math.floor(cy - scale * 0.08));
  const y1 = Math.min(height, Math.ceil(cy + scale * 0.1));
  const x0 = Math.max(0, Math.floor(cx - scale * 0.16));
  const x1 = Math.min(width, Math.ceil(cx + scale * 0.16));
  for (let y = y0; y < y1; y += 1) {
    for (let x = x0; x < x1; x += 1) {
      const i = y * width + x;
      if (!shutter[i]) continue;
      const dx = (x - cx) / scale;
      const dy = (y - cy) / scale;
      const wave = dy - 0.012 * Math.sin(dx * 48);
      const chain = Math.abs(wave) < 0.007 && Math.abs(dx) < 0.13;
      const bead = ((dx * 14) % 1 + 1) % 1;
      const link = chain && bead > 0.35;
      const pendant = dx * dx * 1.4 + (dy - 0.028) * (dy - 0.028) < 0.00028;
      if (link || pendant) pixels[i] = 3980;
    }
  }
}
