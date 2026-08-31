/**********************************************************************************
 * Copyright (c) 2026 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import {
    CommonModelTypes,
    DESTRUCTION_SIZE,
    GATE_SIZE,
    LIFELINE_DEFAULT_SIZE,
    messageOffset,
    messagesInOrder,
    messagesOnLink,
    messageNotation,
    type MessageNotation,
    representationTypeId,
    SELF_MESSAGE_DROP,
    SELF_MESSAGE_REACH,
    STEREOTYPE_LABEL_SUFFIX,
    stereotypeText
} from '@borkdominik-biguml/uml-glsp-server';
import { GEdgeElement, GLabelElement } from '@borkdominik-biguml/uml-glsp-server/jsx';
import { isGate, isLifeline, type Message, type MessageEnd } from '@borkdominik-biguml/uml-model-server/grammar';
import { DefaultTypes, type Point } from '@eclipse-glsp/protocol';
import type { GEdge, GEdgePlacement } from '@eclipse-glsp/server';
import type { DiagramModelIndex } from '../features/model/diagram-model-index.js';
import type { ElementContext } from './core/element-context.js';
import { destructionOffset, gateDrawnCentre, lifelineFrame } from './core/index.js';

/**
 * The label type the communication diagram module maps to `MessageArrowLabelView`, which writes the
 * message beside the link with an arrow under it showing which way it runs.
 *
 * A message used to be given the same `LABEL_EDGE_NAME` every other relation gets, so it was drawn as
 * a plain caption and the arrow view - which has been in the client the whole time - was never
 * reached for any label. The two halves have to name the same type for it to be used.
 */
const MESSAGE_ARROW_LABEL_TYPE = representationTypeId('Communication', DefaultTypes.LABEL, 'message-arrow-edge-name');

/** Clearance between the link and the arrow of a message drawn beside it. */
const BASE_OFFSET = 7;

/**
 * How far along the link the message at `index` sits, as a fraction of the link's length.
 *
 * Messages are placed two to a spot - one above the line, one below - so a pair shares a point along
 * the link without its two arrows meeting. The first pair keeps the middle however many messages the
 * link carries, which is where UML draws a link's one or two messages; further pairs step outwards
 * from there, taking the two directions in turn, so the link fills from the centre rather than from
 * one end. The step is sized from the number of pairs, which keeps even the outermost one on the link
 * instead of over a lifeline.
 */
function messagePosition(index: number, count: number): number {
    const pair = Math.floor(index / 2);
    if (pair === 0) {
        return 0.5;
    }

    // How many steps out this pair goes, and how many the furthest one does. Pairs share each step,
    // one to either side of the middle, so `pairs - 1` of them reach half that many steps out.
    // Taking the larger of the two keeps a message the link does not list - `index` past `count` -
    // on the link rather than beyond its end.
    const level = Math.ceil(pair / 2);
    const levels = Math.max(Math.ceil((Math.ceil(count / 2) - 1) / 2), level);
    const direction = pair % 2 === 1 ? -1 : 1;

    return 0.5 + (direction * level * 0.5) / (levels + 1);
}

/**
 * Beside the link, written upright, the messages in pairs along it and on alternating sides.
 *
 * Messages sharing a link are separate edges routed one on top of the other, so a placement they all
 * agreed on would draw every arrow in the same spot. `messagePosition` separates the pairs along the
 * line and alternating sides separates the two messages of a pair across it, so no two arrows meet
 * even where a link is short.
 *
 * `side: 'bottom'` places a label *above* the line and `'top'` below it - see the note in
 * `core/edge-label.tsx` on why the sides read inverted. The label is never turned along the edge,
 * because it draws its own arrow and a sequence number set sideways is not worth the tidiness.
 *
 * The client reads `side` and `offset` itself rather than leaving them to GLSP's edge layout, so that
 * a message is held off the link by its arrow instead of by the corner of its own text - see
 * `MessageArrowLayoutPostprocessor`. `position` is the one part of the placement GLSP still applies.
 */
function messagePlacement(index: number, count: number): GEdgePlacement {
    const above = index % 2 === 0;
    return {
        rotate: false,
        side: above ? 'bottom' : 'top',
        position: messagePosition(index, count),
        offset: BASE_OFFSET
    };
}

/**
 * How far above the name the stereotype sits: one line of text, near enough. An estimate of something only
 * the client can measure, and the safe direction to be wrong in either way - a line too far apart reads as
 * two labels rather than one stack, which is what they are.
 */
const STEREOTYPE_LINE_HEIGHT = 15;

/**
 * The mark each kind of head is drawn as, in the classes the stylesheet turns into SVG markers.
 *
 * A record over every head rather than a test against one of them, so that a head added to the notation
 * table is a compile error here rather than an arrow silently drawn as one of the kinds already known.
 */
const MESSAGE_HEAD_MARKERS: Record<MessageNotation['head'], string> = {
    filled: 'marker-triangle-end',
    open: 'marker-tent-end'
};

/**
 * How the arrow of a message is stroked, which is the whole of what its kind says on the page.
 *
 * Looked up rather than tested for: which kinds are dashed and what each ends in is a fact about the
 * notation and is written down once, beside the kinds themselves (see `MESSAGE_SORTS`). This turns that
 * answer into the classes the stylesheet and the markers work in, and knows nothing else about any
 * particular kind - a kind added to the model is drawn by that table without touching this.
 */
function messageStroke(sort: string | undefined): string[] {
    const { line, head } = messageNotation(sort);

    return ['uml-edge', ...(line === 'dashed' ? ['uml-edge-dashed'] : []), MESSAGE_HEAD_MARKERS[head]];
}

/**
 * Where a message runs on a sequence diagram, and what the arrow is drawn as: a horizontal line across
 * the page at the height its place in the order gives it.
 *
 * The height is carried as routing points rather than left to the anchors alone, because the anchors are
 * computed from a reference point and the only reference an unrouted edge has is the other end's centre -
 * which would put every message of the diagram at the same middle height, one exactly on top of the next.
 * The lifeline anchor then answers on the lifetime line at whatever height it is asked for (see
 * `UmlPolylineLifetimeAnchor`), so the two ends meet the two dashed lines and the segment between them is
 * level.
 */
function createSequenceMessageRelation(ctx: ElementContext<Message>): GEdge {
    const stereotype = ctx.node.stereotype?.trim();
    const source = ctx.node.source!.ref!;
    const target = ctx.node.target!.ref!;
    const index = Math.max(0, messagesInOrder(ctx.node).indexOf(ctx.node));

    const edge = (
        <GEdgeElement
            id={ctx.node.__id}
            type={ctx.elementType}
            sourceId={source.__id}
            targetId={target.__id}
            cssClasses={messageStroke(ctx.node.messageSort)}
        >
            {/* Emitted even when the message has no name, so that a message drawn on the canvas can be
                named by typing on the line it is drawn as. */}
            <GLabelElement
                id={ctx.node.__id + '_name_label'}
                type={CommonModelTypes.LABEL_EDGE_NAME}
                text={ctx.node.name ?? ''}
                args={{ highlight: true }}
                // Above the line and upright: a message is read as a call, not as a caption turned along
                // a line. See the note in `core/edge-label.tsx` on why `'bottom'` is the side above.
                edgePlacement={{ rotate: false, side: 'bottom', position: 0.5, offset: 7 }}
            />
            {/*
             * The stereotype, a line higher again, so the two read down the page in the order UML writes
             * them: `«ajax»` over the name of the call it qualifies.
             *
             * Only where there is one, unlike the name - a message with no name is still a message and the
             * line has to be typed on to give it one, whereas a message with no stereotype has nothing to
             * say there and an empty pair of guillemets would be a mark meaning nothing.
             */}
            {stereotype && (
                <GLabelElement
                    id={ctx.node.__id + STEREOTYPE_LABEL_SUFFIX}
                    type={CommonModelTypes.LABEL_EDGE_NAME}
                    text={stereotypeText(stereotype)}
                    args={{ highlight: true }}
                    edgePlacement={{ rotate: false, side: 'bottom', position: 0.5, offset: 7 + STEREOTYPE_LINE_HEIGHT }}
                />
            )}
        </GEdgeElement>
    ) as GEdge;

    edge.routingPoints = levelWithDestruction(
        ctx.modelIndex,
        target,
        storedRoute(ctx) ?? sequenceMessageRoute(ctx.modelIndex, source, target, index)
    );
    return edge;
}

/**
 * The route this message was last dragged through, or nothing where it has never been dragged.
 *
 * Read here rather than left to the gmodel factory, which puts a stored route on every other edge, because
 * a message's height is not the stored number alone - it is that number answered against what is on the
 * lifeline at that height (see {@link levelWithDestruction}). The factory keeps whatever route the element
 * built for exactly this reason.
 */
function storedRoute(ctx: ElementContext<Message>): Point[] | undefined {
    const stored = ctx.modelIndex.findRoute(ctx.node.__id)?.points;
    return stored?.length ? stored.map(point => ({ x: point.x, y: point.y })) : undefined;
}

/**
 * The same route, brought level with the cross where the receiving participant's life ends.
 *
 * A message that reaches a lifeline at the height of its destruction is a message *to* that destruction,
 * and UML draws it running into the middle of the X. The mark and the message are placed by hand and
 * independently, though, so the two heights agree only by accident - and disagreeing by a pixel or two is
 * what the cross is there to rule out, since either the arrow misses the middle or, worse, only the end
 * that is on the cross moves and the message is drawn as a diagonal.
 *
 * So the height is settled here, on the whole route, where both ends and every bend read the same number.
 * The anchor cannot do it: it is asked about one end at a time and moving that one alone is precisely the
 * bend this avoids.
 *
 * Anything from half a cross above it downwards is taken as aimed at it - below included, there being no
 * lifetime line past the cross for a message to arrive on. A message running higher up the page than that
 * is about something that happened while the participant was still alive and is left where it was put.
 */
function levelWithDestruction(modelIndex: DiagramModelIndex, target: MessageEnd, points: Point[]): Point[] {
    const height = destructionHeight(modelIndex, target);
    if (height === undefined || points.length === 0 || points[0].y < height - DESTRUCTION_SIZE / 2) {
        return points;
    }

    // Every point by the same amount, so the shape of the route is kept: a message onto and off the same
    // lifeline is a loop of two bends, and levelling only the first would flatten it.
    const shift = height - points[0].y;
    return points.map(point => ({ x: point.x, y: point.y + shift }));
}

/** Where down the page this end's participant is destroyed, or nothing where it is not. */
function destructionHeight(modelIndex: DiagramModelIndex, end: MessageEnd): number | undefined {
    if (!isLifeline(end)) {
        return undefined;
    }
    const offset = destructionOffset(modelIndex, end);
    return offset === undefined ? undefined : lifelineFrame(modelIndex, end).y + offset;
}

/**
 * Where across the page a message meets one of its ends.
 *
 * The middle of a lifeline's lifetime line, which is where the arrow touches it. For a gate it is the mark
 * itself: a gate is already on the border of its frame at the point the user slid it to, and that point is
 * the whole of what a gate says - see `gateBounds`.
 */
function endX(modelIndex: DiagramModelIndex, end: MessageEnd): number {
    const position = modelIndex.findPosition(end.__id);
    if (isGate(end)) {
        // Where the gate is *drawn*, not where it is stored - the two differ by however far it was last
        // dragged from the border, and the message has to reach the mark rather than the drag. Falls back
        // to the stored point where the owning frame has no bounds, which is where it is drawn then too.
        return gateDrawnCentre(modelIndex, end)?.x ?? (position?.x ?? 0) + GATE_SIZE / 2;
    }
    const size = modelIndex.findSize(end.__id);
    const width = size?.width && size.width > 0 ? size.width : LIFELINE_DEFAULT_SIZE.width;
    return (position?.x ?? 0) + width / 2;
}

/** The top of a lifeline's head, which is what the messages down the page are measured from. */
function lifelineTop(modelIndex: DiagramModelIndex, end: MessageEnd): number {
    return modelIndex.findPosition(end.__id)?.y ?? 0;
}

/**
 * How far down the page a gate at this end pins the message, or nothing where neither end is a gate.
 *
 * A gate is placed by hand on the border of its frame, and where it sits is the whole of what it says - so
 * a message with a gate at one end runs at the gate's height rather than at the height its place in the
 * order would give it. That is what makes a gate the thing to drag when the message is to be aimed
 * somewhere: the order settles the messages between lifelines, and a gate overrides it for the one message
 * that crosses a boundary.
 *
 * The source is preferred where both ends are gates, so that a message between two frames follows the end
 * it leaves rather than the end it arrives at - the same choice `EDGE_CREATION_Y_ARG` makes about which
 * click sets the height.
 */
function gateY(modelIndex: DiagramModelIndex, source: MessageEnd, target: MessageEnd): number | undefined {
    const gate = isGate(source) ? source : isGate(target) ? target : undefined;
    if (!gate) {
        return undefined;
    }
    // The drawn point again, for the reason `endX` uses it: a message level with the stored position and
    // not with the mark is a message drawn as a diagonal reaching for somewhere the gate is not.
    return gateDrawnCentre(modelIndex, gate)?.y ?? (modelIndex.findPosition(gate.__id)?.y ?? 0) + GATE_SIZE / 2;
}

/**
 * The bends a sequence message is drawn with.
 *
 * Between two lifelines that is a single point halfway across, which is enough to hold the line level -
 * both ends anchor at the height of the point they are given. A message onto and off the same lifeline
 * has no across to it, so it is taken out to the right and dropped, which is the loop UML draws it as.
 *
 * Measured from the lower of the two heads, so a message never runs above a lifeline that has been
 * dragged further down the page than its partner.
 *
 * Exported because it is wanted twice: here, to draw a message that has never been placed, and by
 * `GenericCreateEdgeOperationHandler`, to write that same route down the moment the message is created -
 * which is what stops a message inserted later from shifting the ones already on the page.
 */
export function sequenceMessageRoute(modelIndex: DiagramModelIndex, source: MessageEnd, target: MessageEnd, index: number): Point[] {
    // A gate at either end settles the height itself - it was put where it was put. Only where both ends
    // are lifelines does the place in the order decide, since neither end says anything about when.
    const top = Math.max(lifelineTop(modelIndex, source), lifelineTop(modelIndex, target));
    const y = gateY(modelIndex, source, target) ?? top + messageOffset(index);
    const from = endX(modelIndex, source);

    if (source.__id === target.__id) {
        const out = from + SELF_MESSAGE_REACH;
        return [
            { x: out, y },
            { x: out, y: y + SELF_MESSAGE_DROP }
        ];
    }

    return [{ x: (from + endX(modelIndex, target)) / 2, y }];
}

export function createMessageRelation(ctx: ElementContext<Message>): GEdge {
    if (ctx.diagramType === 'SEQUENCE') {
        return createSequenceMessageRelation(ctx);
    }

    // `indexOf` rather than a counter, so a message its own link does not list falls back to the first
    // place along it instead of to one past the end.
    const onLink = messagesOnLink(ctx.node);
    const index = Math.max(0, onLink.indexOf(ctx.node));

    return (
        <GEdgeElement
            id={ctx.node.__id}
            type={ctx.elementType}
            sourceId={ctx.node.source!.ref!.__id}
            targetId={ctx.node.target!.ref!.__id}
            // No arrow head on the link: it is the association between two lifelines, and the direction
            // belongs to the messages running along it, each of which draws its own.
            cssClasses={['uml-edge']}
        >
            {/* Emitted even when the message has no name, unlike an ordinary relation label - the arrow
                is the point of it, and a message with no name still runs one way rather than the other. */}
            <GLabelElement
                id={ctx.node.__id + '_name_label'}
                type={MESSAGE_ARROW_LABEL_TYPE}
                text={ctx.node.name ?? ''}
                args={{ highlight: true }}
                edgePlacement={messagePlacement(index, onLink.length)}
            />
        </GEdgeElement>
    ) as GEdge;
}
