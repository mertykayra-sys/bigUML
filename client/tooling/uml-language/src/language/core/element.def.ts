/**********************************************************************************
 * Copyright (c) 2026 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import { Language } from '@borkdominik-biguml/uml-language-tooling';

export abstract class Element {}

export abstract class ElementWithSizeAndPosition extends Element {}

export abstract class Node extends ElementWithSizeAndPosition {}

/**
 * What a message can run between: a lifeline, or a gate on the border of a frame.
 *
 * UML's `MessageEnd`, and it exists here for the reason it exists there - a message has to be able to end
 * on something that is not a participant. A gate is the point where a message crosses the boundary of an
 * interaction or of a `ref` box, and one end of that message is on the boundary rather than on any line.
 *
 * An abstract class rather than a union of the two, deliberately. A union in a reference goes into the file
 * as a positional name (`UnionType_0`), so declaring one renumbers every union after it and every `.uml`
 * file already saved goes on naming the old number for what is now a different union - see the note on
 * `MetaInfo`. A named supertype writes its own name instead, which is stable whatever is added later.
 */
export abstract class MessageEnd extends Node {}

export abstract class Edge extends Element {}

export abstract class Unbounded extends Element {}

/**
 * Layout: what is true of an element on the page rather than of the element itself.
 *
 * Each kind names what it is about itself rather than inheriting one reference from here, because they do
 * not all point at the same thing - a size and a position belong to a shape, a route belongs to an edge.
 * Widening a single inherited reference to a union was the obvious alternative and is not available: a
 * union in a reference goes into the file as a positional name (`UnionType_0`), so adding one renumbers
 * every union declared after it and every `.uml` file already saved goes on saying the old number for what
 * is now a different union.
 *
 * The reference is declared last in each of them, which is where an inherited property was emitted - so
 * the grammar these produce is unchanged for a size and a position.
 */
export abstract class MetaInfo {}

export class Size extends MetaInfo {
    height: number;
    width: number;
    @Language.reference element: ElementWithSizeAndPosition;
}
export class Position extends MetaInfo {
    x: number;
    y: number;
    @Language.reference element: ElementWithSizeAndPosition;
}

/** One bend of an edge's route, in the same coordinates a `Position` is written in. */
export class RoutePoint {
    x: number;
    y: number;
}

/**
 * Where an edge has been routed by hand: the bends someone dragged it through.
 *
 * Stored rather than recomputed, because a route is a decision and not a derivation. Held here for the
 * same reason a position is: it says where the edge is drawn, not what it means, so it belongs beside the
 * other layout and not on the relation itself.
 *
 * An edge with no route of its own is drawn however its notation says to draw it - straight between its
 * two ends for most, and at the height its place in the order gives it for a sequence message.
 */
export class Route extends MetaInfo {
    points?: Array<RoutePoint>;
    @Language.reference element: Edge;
}

/** `NONE` leaves the visibility unspecified — no symbol is rendered for the element. */
export type Visibility = 'PUBLIC' | 'PRIVATE' | 'PROTECTED' | 'PACKAGE' | 'NONE';

/**
 * Which way round a shape that has two ways round is drawn.
 *
 * Said rather than worked out, which is what marks the shapes that carry this from the ones that do not. A
 * fork bar and a branch diamond are drawn to their bounds and have no way up of their own, so which way they
 * run is the shape of those bounds and turning one is swapping them (see `turnableDefaultSize`). These are
 * the shapes whose bounds cannot answer: a partition is a block of any proportions holding lanes that run
 * either way, and a duration constraint is an arrow along one edge with its condition written beside it, so
 * a box wider than it is tall says nothing about which edge the arrow is on.
 *
 * Here rather than beside either of them, being about neither: two diagrams that share nothing else use it,
 * and a sequence element reaching into an activity element's file for a type would say they were related.
 */
export type Orientation = 'HORIZONTAL' | 'VERTICAL';

/**
 * Whether a shape is drawn with a background or as its outline alone.
 *
 * A drawing choice rather than anything UML says: the specification draws every frame as a border and
 * leaves what is behind it showing through, but the two frames that are dragged *over* the rest of a
 * sequence diagram - a `ref` box and a combined fragment - are read either way. A reader who put a `ref`
 * box across three lifelines usually wants it to cover them, and a reader who drew a `par` around messages
 * already on the page wants to go on seeing them.
 *
 * It is also what the shape can be clicked by, which is why it is offered at all rather than settled once
 * in the stylesheet. `TRANSPARENT` paints no fill, and an unpainted fill takes no pointer events - so the
 * inside of the box goes click-through and what stands within its bounds keeps its clicks, while the box
 * itself is still selected and resized by its border (see `hitStrokeBox`). `SOLID` covers what is under it
 * and answers to a click anywhere inside.
 */
export type FrameFill = 'SOLID' | 'TRANSPARENT';
