export class CoordinateMapper {
  constructor(private viewport: any) {}

  // CSS pixels → PDF points (for storing)
  toPdfPoint(x: number, y: number): [number, number] {
    return this.viewport.convertToPdfPoint(x, y);
  }

  // PDF points → CSS pixels (for rendering)
  toCssPoint(xPdf: number, yPdf: number): [number, number] {
    return this.viewport.convertToViewportPoint(xPdf, yPdf);
  }
}