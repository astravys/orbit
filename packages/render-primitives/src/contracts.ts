export type RenderMetadata = Readonly<Record<string, unknown>>;

export type RenderTextAnchor = "start" | "middle" | "end";
export type RenderTextBaseline = "auto" | "middle" | "hanging";
export type RenderMarkerRole = "arrow.target";

export interface RenderMoveCommand {
  readonly kind: "move";
  readonly x: number;
  readonly y: number;
}

export interface RenderLineCommand {
  readonly kind: "line";
  readonly x: number;
  readonly y: number;
}

export interface RenderHorizontalCommand {
  readonly kind: "horizontal";
  readonly x: number;
}

export interface RenderVerticalCommand {
  readonly kind: "vertical";
  readonly y: number;
}

export interface RenderQuadraticCommand {
  readonly kind: "quadratic";
  readonly controlX: number;
  readonly controlY: number;
  readonly x: number;
  readonly y: number;
}

export interface RenderCloseCommand {
  readonly kind: "close";
}

export type RenderPathCommand =
  | RenderMoveCommand
  | RenderLineCommand
  | RenderHorizontalCommand
  | RenderVerticalCommand
  | RenderQuadraticCommand
  | RenderCloseCommand;

interface RenderPrimitiveBase {
  /**
   * Stable logical identity within the render model.
   *
   * Output serializers may omit it when the target format has no matching
   * identity concept or when emitting it would change a compatibility format.
   */
  readonly id: string;
  readonly styleRole?: string;
  readonly semanticKind?: string;
  readonly metadata?: RenderMetadata;
}

export interface RenderGroup extends RenderPrimitiveBase {
  readonly kind: "RenderGroup";
  readonly children: readonly RenderPrimitive[];
}

export interface RenderRect extends RenderPrimitiveBase {
  readonly kind: "RenderRect";
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly radius?: number;
}

export interface RenderText extends RenderPrimitiveBase {
  readonly kind: "RenderText";
  readonly x: number;
  readonly y: number;
  readonly text: string;
  readonly anchor?: RenderTextAnchor;
  readonly baseline?: RenderTextBaseline;
}

export interface RenderPath extends RenderPrimitiveBase {
  readonly kind: "RenderPath";
  readonly commands: readonly RenderPathCommand[];
  readonly markerRole?: RenderMarkerRole;
  readonly title?: string;
}

export interface RenderLine extends RenderPrimitiveBase {
  readonly kind: "RenderLine";
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

export type RenderPrimitive =
  | RenderGroup
  | RenderRect
  | RenderText
  | RenderPath
  | RenderLine;

export interface RenderDocument {
  readonly kind: "RenderDocument";
  readonly width: number;
  readonly height: number;
  readonly primitives: readonly RenderPrimitive[];
  readonly title?: string;
  readonly documentation?: string;
  readonly metadata?: RenderMetadata;
}
