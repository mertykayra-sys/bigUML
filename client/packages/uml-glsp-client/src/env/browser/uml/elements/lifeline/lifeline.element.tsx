/*********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/
/** @jsx svg */
import {
    ACTIVE_LIFELINE_RULE_INSET,
    decodeDestructionOffset,
    decodeLifelineActive,
    DESTRUCTION_OFFSET_ARG,
    LIFELINE_ACTIVE_ARG,
    LIFELINE_HEAD_HEIGHT,
    LIFELINE_HEAD_HEIGHT_ARG
} from '@borkdominik-biguml/uml-glsp-server';
import { ResizeHandleLocation, svg } from '@eclipse-glsp/client';
import { injectable } from 'inversify';
import { type VNode } from 'snabbdom';
import { UML_LIFETIME_ANCHOR_KIND } from '../../../features/routing/uml-lifetime-anchor.js';
import { HIT_SLACK } from '../../views/hit-area.js';
import { NamedElement, NamedElementView } from '../named-element/index.js';
import { staysBehindFeature } from '../../../features/zorder/stays-behind.js';

export class GLifelineNode extends NamedElement {}

@injectable()
export class GLifelineNodeView extends NamedElementView {}

/**
 * A lifeline of a sequence diagram: the head that carries the name, and the dashed line running down from
 * it for as long as the object lives.
 *
 * The node's bounds are the whole of that - head and line together - so that the lifetime is what is
 * dragged when the lifeline is resized, and messages arriving anywhere down it land inside the shape they
 * belong to. Only the head is painted, which is why the line needs a hit area of its own.
 */
export class GSequenceLifelineNode extends NamedElement {
    /**
     * The bars of this lifeline's executions are drawn over its line, so selecting the lifeline must not
     * lift it in front of them - see `staysBehindFeature`.
     */
    static override readonly DEFAULT_FEATURES = [...super.DEFAULT_FEATURES, staysBehindFeature];

    /**
     * The two ends of the line, and nothing to either side of it.
     *
     * A lifeline has one dimension worth setting by hand. Its width is the head's, and the head widens
     * itself to whatever is written in it - a stored width is a floor rather than a size, so dragging one
     * out sideways says nothing the name has not already said. Its height is the lifetime, and that is the
     * whole of what there is to adjust, from either end of it.
     *
     * So the left and right handles are gone. They were not even beside the head: an edge midpoint on a
     * shape this tall sits halfway down the dashed line, out in the space the messages are drawn in,
     * offering a sideways drag on a shape that has no sideways.
     *
     * The corners are gone with them, which is what these two replace - a corner sets both dimensions at
     * once, so the only way to lengthen a lifetime used to be to drag one, which pulled the head wider or
     * narrower on the way.
     *
     * Moving a lifeline up or down needs neither handle. That is a drag on the shape itself, which is what
     * `moveFeature` is for.
     */
    resizeLocations = [ResizeHandleLocation.Top, ResizeHandleLocation.Bottom];

    /**
     * Messages meet the dashed line, not the outline of the box the node's bounds describe. A rectangular
     * anchor would put them on whichever edge of that box they came at, leaving a gap between the arrow
     * and the line it is meant to touch - see `UmlPolylineLifetimeAnchor`.
     */
    override get anchorKind(): string {
        return UML_LIFETIME_ANCHOR_KIND;
    }

    /** How tall the head is, as the server drew it - see `GSequenceLifelineNodeElement`. */
    get headHeight(): number {
        const given = this.args?.[LIFELINE_HEAD_HEIGHT_ARG];
        return typeof given === 'number' ? given : LIFELINE_HEAD_HEIGHT;
    }

    /**
     * How far down the line this participant's life ends, or nothing where it is never destroyed - see
     * `DESTRUCTION_OFFSET_ARG`. The line is drawn only that far: a line running on past the cross would
     * say the object outlived its own destruction.
     */
    get endsAt(): number | undefined {
        return decodeDestructionOffset(this.args?.[DESTRUCTION_OFFSET_ARG]);
    }

    /**
     * Whether this participant is an active object - one with a thread of its own, which UML marks with a
     * rule down each side of the head. Written by the server only for a head that is a box, there being no
     * sides to rule on a stick figure - see `LIFELINE_ACTIVE_ARG`.
     */
    get active(): boolean {
        return decodeLifelineActive(this.args?.[LIFELINE_ACTIVE_ARG]);
    }
}

@injectable()
export class GSequenceLifelineNodeView extends NamedElementView {
    protected override renderBackground(element: GSequenceLifelineNode): VNode {
        const width = Math.max(0, element.bounds.width);
        const height = Math.max(0, element.bounds.height);
        // Never taller than the lifeline itself: one dragged down to less than its own head would
        // otherwise have the head drawn out past the bottom of the shape.
        const head = Math.min(element.headHeight, height);
        // The line stops where the object is destroyed, and at the end of the lifeline otherwise. Never
        // above the head: a cross dragged up into it would otherwise leave a lifeline with no line at all.
        const lifeEnd = Math.max(head, Math.min(element.endsAt ?? height, height));

        return (
            <g>
                {/* The slack that makes the line clickable, along the line and nowhere else. Over the
                    whole of the node's bounds it would swallow every click landing anywhere beside the
                    line - and what is beside the line is the interaction frame and whatever else has
                    been drawn on it. */}
                <rect class-uml-hit-area x={width / 2 - HIT_SLACK} y={head} width={2 * HIT_SLACK} height={Math.max(0, lifeEnd - head)} />
                {/*
                 * A head built around an icon - an actor's stick figure, a boundary's circle and bar - is
                 * that drawing and the writing above it, with nothing around them. The box would be a
                 * second outline around a shape that already reads as one thing.
                 *
                 * It still needs a hit area of its own, for the reason `ActorView` paints one: a figure is
                 * a few strokes, and without this the head could only be picked up by landing on one of
                 * them. Painted `transparent`, which still takes pointer events.
                 */}
                <rect
                    class-uml-hit-area={drawsIcon(element)}
                    class-uml-node-background={!drawsIcon(element)}
                    x={0}
                    y={0}
                    width={width}
                    height={head}
                />
                {this.renderActiveRules(element, width, head)}
                <line class-uml-lifeline-lifetime x1={width / 2} y1={head} x2={width / 2} y2={lifeEnd} />
            </g>
        ) as any;
    }

    /**
     * The mark UML gives an active object: a vertical rule down each side of the head, a little inside its
     * border, so the head reads as doubled along its two upright edges.
     *
     * Two lines rather than a second rectangle inside the first. A rectangle would rule the top and bottom
     * edges as well, which is a different notation - that is how a class diagram draws a nested classifier
     * - and it would take the node's fill and paint over the writing it was drawn behind.
     *
     * Drawn after the head's background and before the lifetime line, so they lie on the box rather than
     * under it. They stop at the foot of the head: the mark is about the object, and the lifetime line
     * below carries no border to double.
     *
     * The inset is held to a third of the width so that a lifeline dragged narrow keeps two rules with a
     * gap between them, rather than two that meet in the middle and read as one thick line.
     */
    protected renderActiveRules(element: GSequenceLifelineNode, width: number, head: number): VNode | undefined {
        if (!element.active || width <= 0 || head <= 0) {
            return undefined;
        }
        const inset = Math.min(ACTIVE_LIFELINE_RULE_INSET, width / 3);

        return (
            <g>
                <line class-uml-lifeline-active-rule x1={inset} y1={0} x2={inset} y2={head} />
                <line class-uml-lifeline-active-rule x1={width - inset} y1={0} x2={width - inset} y2={head} />
            </g>
        ) as any;
    }
}

/**
 * Whether this lifeline's head is built around a drawing rather than a box - which is to say whether the
 * server put an icon in it.
 *
 * Read off the children rather than carried as an `arg` of its own, the way `StateNodeView` asks whether a
 * state holds regions: the icon is a child node with a type of its own, so its presence is already the
 * answer and a second way of saying it could only disagree with the first.
 */
function drawsIcon(element: GSequenceLifelineNode): boolean {
    return element.children.some(child => HEAD_ICON_SUFFIXES.some(suffix => child.type.endsWith(suffix)));
}

/** What the types of the head icons end in - see `representationTypeId`. */
const HEAD_ICON_SUFFIXES = ['__ActorStickfigure', '__LifelineBoundary'];
