/**********************************************************************************
 * Copyright (c) 2026 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import { GATE_SIZE } from '@borkdominik-biguml/uml-glsp-server';
import { isGate, isMessage, type Gate } from '@borkdominik-biguml/uml-model-server/grammar';
import { ChangeRoutingPointsOperation, type Command, OperationHandler, type Point } from '@eclipse-glsp/server';
import { injectable } from 'inversify';
import { URI } from 'vscode-uri';
import { gateCentre, gateDrawnCentre, gateFrame } from '../../../elements/core/index.js';
import { ModelPatchCommand } from '../../command/model-patch-command.js';
import { type DiagramModelState } from '../../model/diagram-model-state.js';

type RoutePatch = { op: 'add' | 'replace' | 'remove'; path: string; value?: unknown };

/**
 * Writes a route someone dragged an edge through into the model, as a `Route` beside the positions and
 * sizes of the shapes.
 *
 * It used to be kept in a map on the model state and nowhere else, which meant an edge sprang back to
 * wherever its notation put it the next time the file was opened - and, since that map was outside the
 * patch mechanism, that the drag could not be undone either. A route is a decision about the drawing,
 * exactly as a position is, so it is stored exactly as a position is.
 */
@injectable()
export class GenericChangeRoutingPointsOperationHandler extends OperationHandler {
    readonly operationType = ChangeRoutingPointsOperation.KIND;

    declare readonly modelState: DiagramModelState;

    override createCommand(operation: ChangeRoutingPointsOperation): Command | undefined {
        const patch = this.changeRoutingPoints(operation);

        // An empty patch is not the harmless no-op it looks like: `PatchManager` applies the operations
        // one by one and reads the result of the last, so with none to apply it reads off nothing and the
        // edit fails outright. The same reason `GenericChangeBoundsOperationHandler` refuses one.
        if (patch.length === 0) {
            return undefined;
        }

        return new ModelPatchCommand(this.modelState, JSON.stringify(patch));
    }

    protected changeRoutingPoints(operation: ChangeRoutingPointsOperation): RoutePatch[] {
        const documentPath = URI.parse(this.modelState.semanticUri).path;
        const patch: RoutePatch[] = [];

        for (const { elementId, newRoutingPoints } of operation.newRoutingPoints) {
            // Only for something the model knows. A routing handle belongs to an edge, but the operation
            // is addressed by id and an id that names no element would go out as a reference to nothing -
            // which is what leaves a file that will not open.
            if (!this.modelState.index.findIdElement(elementId)) {
                continue;
            }

            // A message with a gate at one end is not routed, it is *aimed*: the gate says where it crosses
            // the border, and everything about the line follows from that (see `sequenceMessageRoute`). So
            // dragging one moves the gate rather than storing a route beside it - which is also the only
            // way to move such a message at all, the gate being drawn as nothing at all.
            const gatePatch = this.slideGates(elementId, newRoutingPoints ?? [], documentPath);
            if (gatePatch) {
                patch.push(...gatePatch);
                continue;
            }

            const stored = this.modelState.index.findRoute(elementId);
            const routePath = this.modelState.index.findRoutePath(elementId);
            const points = newRoutingPoints ?? [];

            // Straightening an edge out removes its route rather than storing an empty one: an edge with
            // no route is drawn the way its notation says to draw it, which is what "no bends" means.
            if (points.length === 0) {
                if (routePath && stored) {
                    patch.push({ op: 'remove', path: routePath });
                }
                continue;
            }

            patch.push({
                op: routePath && stored ? 'replace' : 'add',
                path: routePath ?? '/metaInfos/-',
                value: {
                    $type: 'Route',
                    __id: `route_${elementId}`,
                    points: points.map((point, index) => this.routePoint(elementId, index, point)),
                    element: {
                        $ref: {
                            __id: elementId,
                            __documentUri: stored?.element?.$nodeDescription?.documentUri.path ?? documentPath
                        }
                    }
                }
            });
        }

        return patch;
    }

    /**
     * Moves the gates of a dragged message along their borders to the height it was dragged to, or nothing
     * where this edge has no gate at either end - in which case the drag is an ordinary route and is stored
     * as one.
     *
     * Only the height is taken from the drag. Across the page a gate is on the border of its frame and
     * nowhere else, exactly as a bar is on the line of its lifeline: a sideways drag is not the user saying
     * otherwise, so the gate keeps the point of the border it is on and slides up or down it. Which border
     * that is can still change - a gate slid far enough past a corner belongs to the next side, and
     * `gateCentre` is what decides.
     *
     * An empty patch is returned as `undefined` rather than as `[]`, so the caller can tell "this was not a
     * gate message" from "there was nothing to move": the second still has to fall through to the ordinary
     * route handling, or straightening such an edge would silently do nothing.
     */
    protected slideGates(elementId: string, points: Point[], documentPath: string): RoutePatch[] | undefined {
        const message = this.modelState.index.findIdElement(elementId);
        if (this.modelState.diagramType !== 'SEQUENCE' || !isMessage(message)) {
            return undefined;
        }

        const gates = [message.source?.ref, message.target?.ref].filter((end): end is Gate => isGate(end));
        if (gates.length === 0) {
            return undefined;
        }

        // The height the message was dragged to. The first bend is what carries it: a sequence message is
        // one level segment and its route is the single point that holds it there (see
        // `sequenceMessageRoute`). A drag that left no bends says nothing about height, so nothing moves.
        const height = points[0]?.y;
        if (height === undefined || !Number.isFinite(height)) {
            return [];
        }

        const patch: RoutePatch[] = [];

        // Any route stored beside the gate goes: a stored one wins over what the notation derives (see
        // `createEdgeElement`), so one left behind would pin the message where it used to be while the gate
        // moved out from under it - which is the diagonal this is here to stop.
        const routePath = this.modelState.index.findRoutePath(elementId);
        if (routePath && this.modelState.index.findRoute(elementId)) {
            patch.push({ op: 'remove', path: routePath });
        }

        for (const gate of gates) {
            const frame = gateFrame(this.modelState.index, gate);
            const drawn = gateDrawnCentre(this.modelState.index, gate);
            // A gate whose frame has no usable bounds has no border to slide along.
            if (!frame || !drawn) {
                continue;
            }

            const centre = gateCentre(frame, { x: drawn.x, y: height });
            const positionPath = this.modelState.index.findPositionPath(gate.__id);
            const stored = this.modelState.index.findPosition(gate.__id);
            patch.push({
                op: positionPath && stored ? 'replace' : 'add',
                path: positionPath ?? '/metaInfos/-',
                value: {
                    $type: 'Position',
                    __id: `pos_${gate.__id}`,
                    element: {
                        $ref: {
                            __id: gate.__id,
                            __documentUri: stored?.element?.$nodeDescription?.documentUri.path ?? documentPath
                        }
                    },
                    // Stored as the mark's top left, the way every node's position is.
                    x: Math.round(centre.x - GATE_SIZE / 2),
                    y: Math.round(centre.y - GATE_SIZE / 2)
                }
            });
        }

        return patch;
    }

    /**
     * One bend, rounded to whole pixels because that is what the grammar holds - and because a route
     * carried to a dozen decimal places rewrites the file on every drag for no visible difference.
     */
    protected routePoint(elementId: string, index: number, point: Point): unknown {
        return {
            $type: 'RoutePoint',
            __id: `route_${elementId}_${index}`,
            x: Math.round(point.x),
            y: Math.round(point.y)
        };
    }
}
