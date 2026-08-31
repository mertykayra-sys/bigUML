/*********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/
/** @jsx svg */
import { FRAME_TAG_CORNER_CUT } from '@borkdominik-biguml/uml-glsp-server';
import { GCompartment, RectangularNodeView, type RenderingContext, svg } from '@eclipse-glsp/client';
import { DefaultTypes } from '@eclipse-glsp/protocol';
import { injectable } from 'inversify';
import { type VNode } from 'snabbdom';
import { type NamedElement } from '../elements/named-element/index.js';
import { renderCompartmentSeparators } from './compartment-separator.js';
import { hitStrokeBox } from './hit-area.js';

/**
 * A frame: a shape drawn as the boundary a part of the diagram sits inside - an interaction, a state
 * machine, a region, a use case subject - rather than as a shape the size of its own name.
 *
 * Drawn as a box the size of the frame with its name in a tag in the top left corner, which is how UML
 * names a frame. Square cornered: a frame is the border of a diagram, and a rounded corner would leave
 * the tag's own corner poking out past it.
 */
@injectable()
export class FrameNodeView extends RectangularNodeView {
    override render(element: NamedElement, context: RenderingContext): VNode | undefined {
        if (!this.isVisible(element, context)) {
            return undefined;
        }

        const width = Math.max(0, element.bounds.width);
        const height = Math.max(0, element.bounds.height);

        return (
            <g class-selected={element.selected} class-mouseover={element.hoverFeedback}>
                {/* A frame is drawn as its border and nothing else, so the border is the whole of what
                    can be aimed at - this is the slack around it. */}
                {hitStrokeBox(width, height)}
                <rect x={0} y={0} width={width} height={height} class-uml-node-background />
                {/* The rules dividing what the frame holds, where it holds anything divided - the dashed
                    lines between the operands of a combined fragment. Drawn here rather than by the
                    compartments themselves because a rule runs the whole width of the shape and a
                    compartment is only as wide as the layouter made it; a frame whose compartments ask for
                    no divider gets no lines, which is every other frame. */}
                {renderCompartmentSeparators(element)}
                {this.renderNameTag(element)}
                {context.renderChildren(element)}
            </g>
        ) as any;
    }

    /**
     * The tag the frame's name is written in (see `FrameNameTag`). It is drawn around the name's
     * compartment, out to the same inset the layout left around it, so that it takes the corner at
     * whatever size the name is - and drawn after the frame so that it covers the border along the two
     * edges they share.
     */
    protected renderNameTag(element: NamedElement): VNode | undefined {
        const tag = element.children.find(
            (child): child is GCompartment => child instanceof GCompartment && child.type === DefaultTypes.COMPARTMENT_HEADER
        );

        if (!tag || tag.bounds.width <= 0 || tag.bounds.height <= 0) {
            return undefined;
        }

        const width = 2 * tag.bounds.x + tag.bounds.width;
        const height = 2 * tag.bounds.y + tag.bounds.height;
        const cut = Math.min(FRAME_TAG_CORNER_CUT, height / 2, width / 2);

        return (<path d={`M 0,0 H ${width} V ${height - cut} L ${width - cut},${height} H 0 Z`} />) as any;
    }
}
