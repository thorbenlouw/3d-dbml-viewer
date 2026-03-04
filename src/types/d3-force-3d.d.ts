declare module 'd3-force-3d' {
  export interface SimulationNodeDatum {
    index?: number;
    x?: number;
    y?: number;
    z?: number;
    vx?: number;
    vy?: number;
    vz?: number;
    fx?: number | null;
    fy?: number | null;
    fz?: number | null;
  }

  export interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> {
    source: NodeDatum | string | number;
    target: NodeDatum | string | number;
    index?: number;
  }

  export interface Force<NodeDatum extends SimulationNodeDatum> {
    (alpha: number): void;
    initialize?(nodes: NodeDatum[], random: () => number): void;
  }

  export interface Simulation<NodeDatum extends SimulationNodeDatum> {
    restart(): this;
    stop(): this;
    tick(iterations?: number): this;
    nodes(): NodeDatum[];
    nodes(nodes: NodeDatum[]): this;
    alpha(): number;
    alpha(alpha: number): this;
    alphaMin(): number;
    alphaMin(min: number): this;
    alphaDecay(): number;
    alphaDecay(decay: number): this;
    alphaTarget(): number;
    alphaTarget(target: number): this;
    velocityDecay(): number;
    velocityDecay(decay: number): this;
    force(name: string): Force<NodeDatum> | undefined;
    force(name: string, force: Force<NodeDatum> | null): this;
    find(x: number, y?: number, z?: number, radius?: number): NodeDatum | undefined;
    on(typenames: string): ((this: object) => void) | undefined;
    on(typenames: string, listener: (this: object) => void): this;
    numDimensions(): number;
    numDimensions(n: number): this;
  }

  export interface ManyBodyForce<NodeDatum extends SimulationNodeDatum> extends Force<NodeDatum> {
    strength(): number;
    strength(strength: number | ((d: NodeDatum, i: number, data: NodeDatum[]) => number)): this;
    theta(): number;
    theta(theta: number): this;
    distanceMin(): number;
    distanceMin(distance: number): this;
    distanceMax(): number;
    distanceMax(distance: number): this;
  }

  export interface LinkForce<
    NodeDatum extends SimulationNodeDatum,
    LinkDatum extends SimulationLinkDatum<NodeDatum>,
  > extends Force<NodeDatum> {
    links(): LinkDatum[];
    links(links: LinkDatum[]): this;
    id(): (node: NodeDatum, i: number, nodesData: NodeDatum[]) => string | number;
    id(id: (node: NodeDatum, i: number, nodesData: NodeDatum[]) => string | number): this;
    distance(): number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number);
    distance(distance: number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number)): this;
    strength(): number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number);
    strength(strength: number | ((link: LinkDatum, i: number, links: LinkDatum[]) => number)): this;
    iterations(): number;
    iterations(iterations: number): this;
  }

  export interface CenterForce<NodeDatum extends SimulationNodeDatum> extends Force<NodeDatum> {
    x(): number;
    x(x: number): this;
    y(): number;
    y(y: number): this;
    z(): number;
    z(z: number): this;
  }

  export interface AxisForce<NodeDatum extends SimulationNodeDatum> extends Force<NodeDatum> {
    strength(): number | ((d: NodeDatum, i: number, data: NodeDatum[]) => number);
    strength(strength: number | ((d: NodeDatum, i: number, data: NodeDatum[]) => number)): this;
    x(): number | ((d: NodeDatum, i: number, data: NodeDatum[]) => number);
    x(x: number | ((d: NodeDatum, i: number, data: NodeDatum[]) => number)): this;
  }

  export function forceSimulation<NodeDatum extends SimulationNodeDatum>(
    nodes?: NodeDatum[],
    numDimensions?: number,
  ): Simulation<NodeDatum>;

  export function forceManyBody<NodeDatum extends SimulationNodeDatum>(): ManyBodyForce<NodeDatum>;

  export function forceLink<
    NodeDatum extends SimulationNodeDatum,
    LinkDatum extends SimulationLinkDatum<NodeDatum>,
  >(links?: LinkDatum[]): LinkForce<NodeDatum, LinkDatum>;

  export function forceCenter<NodeDatum extends SimulationNodeDatum>(
    x?: number,
    y?: number,
    z?: number,
  ): CenterForce<NodeDatum>;

  export function forceX<NodeDatum extends SimulationNodeDatum>(x?: number): AxisForce<NodeDatum>;
  export function forceY<NodeDatum extends SimulationNodeDatum>(y?: number): AxisForce<NodeDatum>;
  export function forceZ<NodeDatum extends SimulationNodeDatum>(z?: number): AxisForce<NodeDatum>;
}
