/**********************************************************************************
 * Copyright (c) 2026 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import {
    ACTIVE_LIFELINE_RULE_INSET,
    CommonModelTypes,
    composeLifelineIdent,
    DESTRUCTION_OFFSET_ARG,
    encodeExecutionBands,
    EXECUTION_BANDS_ARG,
    LIFELINE_ACTIVE_ARG,
    LIFELINE_HEAD_HEIGHT_ARG,
    lifelineHeadHeight,
    lifelineMinSize,
    representationTypeId,
    STEREOTYPE_LABEL_SUFFIX,
    stereotypeText
} from '@borkdominik-biguml/uml-glsp-server';
import { GLabelElement, GNodeElement } from '@borkdominik-biguml/uml-glsp-server/jsx';
import type { Lifeline } from '@borkdominik-biguml/uml-model-server/grammar';
import { DefaultTypes } from '@eclipse-glsp/protocol';
import type { GModelElement } from '@eclipse-glsp/server';
import { destructionOffset, executionBands, lifelineFrame } from './core/index.js';
import type { BaseElementProps, ElementContext } from './core/element-context.js';

export interface GLifelineNodeElementProps extends BaseElementProps {
    node: Lifeline;
    /**
     * The stretches of this lifeline that are executing, encoded for the client - see
     * `EXECUTION_BANDS_ARG`. Only the sequence notation draws them.
     */
    bands?: string;
    /**
     * How far down the line this participant's life ends, or nothing where it is never destroyed - see
     * `DESTRUCTION_OFFSET_ARG`.
     */
    endsAt?: number;
}

/**
 * What is written in the head: the UML `lifeline-ident` its parts spell out - `data : Stock`, `: User`,
 * `x[k] : X`, `self` - rather than the name alone. Both notations write it, because it identifies the
 * lifeline and not the way the lifeline happens to be drawn.
 *
 * Falls back to the empty string, which nothing valid reaches: a lifeline that names no class must be
 * named (see the check on `Lifeline`), and an ident that came out empty is refused rather than stored
 * (see `lifelineIdentPatch`).
 */
function lifelineIdent(node: Lifeline): string {
    return composeLifelineIdent(node) ?? '';
}

export function GLifelineNodeElement(props: GLifelineNodeElementProps): GModelElement {
    return (
        <GNodeElement
            id={props.node.__id}
            type={props.type}
            position={props.position}
            size={props.size}
            cssClasses={['uml-node']}
            layout='vbox'
        >
            <GLabelElement type={CommonModelTypes.LABEL_TEXT} text={lifelineIdent(props.node)} />
        </GNodeElement>
    );
}

/**
 * A lifeline as a sequence diagram draws it: the head carrying the name, and the dashed line running
 * down from it for as far as the object lives.
 *
 * The head is a box the size of its name, the way an ordinary node is, but the node as a whole is not -
 * its height is the lifetime and is held rather than shrunk onto the label, which is why the size is
 * settled here instead of being left to the client layouter. The client draws only the head and the line
 * (see `GSequenceLifelineNodeView`) and is told how tall the head is through `args`, so that the two
 * halves cannot drift apart on it.
 */
export function GSequenceLifelineNodeElement(props: GLifelineNodeElementProps): GModelElement {
    // The head is an icon with the name above it for an actor and for a boundary, and a box holding the
    // name for everyone else. Which one settles both how deep the head is and what goes in it, along with
    // whether a stereotype is written over the top of all of it.
    const icon = headIcon(props.node.head);
    const stereotype = props.node.stereotype?.trim();
    // An active object is marked by a rule down each side of the head, so only a head that *is* a box has
    // anywhere to put them: an actor and a boundary are drawings with the name above them, and there are no
    // sides there to rule. The property stays as the user set it either way - a lifeline switched to an
    // actor and back is active again, rather than having been quietly turned off on the way through.
    const active = !!props.node.isActive && !icon;
    const headHeight = lifelineHeadHeight(props.node.head, !!stereotype);
    const floor = lifelineMinSize(props.node.head, !!stereotype);
    // Already resolved against the defaults and the floor by `lifelineFrame`, which is also what the bars
    // on this lifeline were placed against.
    const size = props.size ?? { width: floor.width, height: floor.height };

    return (
        <GNodeElement
            id={props.node.__id}
            type={props.type}
            position={props.position}
            size={size}
            cssClasses={['uml-node', 'uml-lifeline-node']}
            layout='vbox'
            // The destruction is written only when there is one: absent means a lifeline that runs to the
            // end of its own line, which is every lifeline that is not destroyed.
            args={{
                [LIFELINE_HEAD_HEIGHT_ARG]: headHeight,
                [EXECUTION_BANDS_ARG]: props.bands ?? '',
                // Written only where the rules are drawn, absent being the ordinary lifeline - which is
                // also what a lifeline stored before this property existed reads as.
                ...(active ? { [LIFELINE_ACTIVE_ARG]: true } : {}),
                ...(props.endsAt === undefined ? {} : { [DESTRUCTION_OFFSET_ARG]: props.endsAt })
            }}
            // The name belongs in the head, and the height under it is the line - so the label is laid
            // out from the top rather than centred in the node, which a vbox does anyway (see
            // `VBoxLayouterExt.layoutChildren`), and the top padding is what sets it in the head.
            //
            // `prefWidth`/`prefHeight` are GLSP's way of holding a layouted node at a size of its own;
            // `minWidth`/`minHeight` are the floor a resize may not be dragged past. Both are needed -
            // the preferred size alone lets the line be dragged away entirely, and the floor alone is
            // ignored once a preferred size is set.
            layoutOptions={{
                // A head drawn with an icon starts its writing at the top of the shape; a box's starts
                // with the name, which this inset drops to about the middle of the box.
                paddingTop: icon ? 0 : HEAD_TEXT_INSET,
                paddingBottom: 0,
                // An active object's head is ruled down each side, so the name is held off by that much
                // again - it would otherwise be laid out against the border and strike through the rules.
                // The head widens to whatever is written in it, so this makes the box wider rather than the
                // writing narrower.
                paddingLeft: HEAD_PADDING + (active ? ACTIVE_LIFELINE_RULE_INSET : 0),
                paddingRight: HEAD_PADDING + (active ? ACTIVE_LIFELINE_RULE_INSET : 0),
                minWidth: floor.width,
                minHeight: floor.height,
                prefWidth: size.width,
                prefHeight: size.height
            }}
        >
            {/*
             * Stereotype, then ident, then the icon under them - which is the order UML writes them in:
             * `«servlet»` over `:DWRServlet` over the drawing. A box head has no icon, so it is the same
             * order with the last of the three left out.
             *
             * The stereotype is an editable label of its own rather than part of the ident, because it is a
             * separate thing said about the participant - the ident says which participant, the stereotype
             * says what kind. Typing on either writes only that one.
             */}
            {stereotype && (
                <GLabelElement
                    id={props.node.__id + STEREOTYPE_LABEL_SUFFIX}
                    type={CommonModelTypes.LABEL_NAME}
                    text={stereotypeText(stereotype)}
                />
            )}
            <GLabelElement id={`${props.node.__id}_name_label`} type={CommonModelTypes.LABEL_NAME} text={lifelineIdent(props.node)} />
            {/*
             * The drawing, for the heads that have one. A child node of its own rather than something the
             * lifeline's view paints, so that the actor is the same figure the use case and information flow
             * diagrams put on theirs - one drawing, laid out and scaled by the view registered for the type
             * (see `StickFigureView`), rather than a second copy of the same strokes to keep in step. The
             * boundary follows the same arrangement so that the two heads are built the same way.
             */}
            {icon && (
                <GNodeElement
                    id={`${props.node.__id}_${icon.toLowerCase()}`}
                    type={representationTypeId('Sequence', DefaultTypes.NODE, icon)}
                />
            )}
        </GNodeElement>
    );
}

/** The drawing this kind of head is built around, or nothing for the box, which is built around none. */
function headIcon(head: string | undefined): string | undefined {
    return head === 'ACTOR' ? 'ActorStickfigure' : head === 'BOUNDARY' ? 'LifelineBoundary' : undefined;
}

/** Room left either side of the name inside the head. */
const HEAD_PADDING = 8;

/**
 * How far down the head the name starts, which puts a single line of it about the middle of the head.
 * A measure rather than a vertical alignment because a vbox has none - it lays its children out from the
 * top - and the height of the text is not known here to divide the rest of the head by.
 */
const HEAD_TEXT_INSET = 10;

export function createLifelineElement(ctx: ElementContext<Lifeline>): GModelElement {
    if (ctx.diagramType === 'SEQUENCE') {
        // Resolved against the defaults here rather than in the component, because the bars on this
        // lifeline are placed against the same frame - see `lifelineFrame`.
        const frame = lifelineFrame(ctx.modelIndex, ctx.node);
        return (
            <GSequenceLifelineNodeElement
                node={ctx.node}
                position={{ x: frame.x, y: frame.y }}
                size={{ width: frame.width, height: frame.height }}
                type={ctx.elementType}
                bands={encodeExecutionBands(executionBands(ctx.modelIndex, ctx.node))}
                endsAt={destructionOffset(ctx.modelIndex, ctx.node)}
            />
        );
    }

    const position = ctx.modelIndex.findPosition(ctx.node.__id);
    const size = ctx.modelIndex.findSize(ctx.node.__id);
    return <GLifelineNodeElement node={ctx.node} position={position} size={size} type={ctx.elementType} />;
}
