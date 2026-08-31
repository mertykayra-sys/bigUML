/*********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/

import { decodeEdgeCreationY, parseConnectionPointId } from '@borkdominik-biguml/uml-glsp-server';
import { sequenceMessageRoute } from '../../../elements/message.element.js';
import { implicitGates, isMessageEnd, onLifeline, setConnectionPoint, type ImplicitEnds } from './edge-ends.js';
import { getDefaultProperties, getRelationTypeFromElementId } from '@borkdominik-biguml/uml-glsp-server/gen/vscode';
import { createRandomUUID, type IdAstNode, type jsonPatch, type SerializeAstNode } from '@borkdominik-biguml/uml-model-server';
import { type Edge, isGate, isMessage, isPackageMerge } from '@borkdominik-biguml/uml-model-server/grammar';
import {
    type Command,
    CreateEdgeOperation,
    type CreateEdgeOperationHandler,
    OperationHandler,
    TriggerEdgeCreationAction
} from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { URI } from 'vscode-uri';
import { ModelPatchCommand } from '../../command/model-patch-command.js';
import { DiagramLanguageMetadata } from '../../model/diagram-language-metadata.js';
import { type DiagramModelState } from '../../model/diagram-model-state.js';

@injectable()
export class GenericCreateEdgeOperationHandler extends OperationHandler implements CreateEdgeOperationHandler {
    readonly operationType = CreateEdgeOperation.KIND;

    declare readonly modelState: DiagramModelState;

    @inject(DiagramLanguageMetadata)
    protected readonly metadata: DiagramLanguageMetadata;

    get elementTypeIds(): string[] {
        return this.metadata.edgeTypeIds;
    }

    override label = 'Relation';

    getTriggerActions(): TriggerEdgeCreationAction[] {
        return this.elementTypeIds.map(typeId => TriggerEdgeCreationAction.create(typeId));
    }

    override createCommand(operation: CreateEdgeOperation): Command {
        // Worked out first, because the message is written to point at whatever they produce: an end
        // dropped on a frame becomes a gate on that frame's border, and the message ends on the gate.
        const gates = implicitGates(
            this.modelState,
            { source: operation.sourceElementId, target: operation.targetElementId },
            operation.args,
            getRelationTypeFromElementId(operation.elementTypeId, false) === 'Message'
        );
        const semantic = this.createSemantic(operation, gates.ends);
        return new ModelPatchCommand(this.modelState, JSON.stringify([...gates.patch, semantic, ...this.createRoute(operation, semantic)]));
    }

    /**
     * Writes the new edge's route down where its notation places it rather than leaving it to be worked out
     * again on every render - which today is a sequence message and nothing else.
     *
     * A message is drawn at the height its place in the order gives it, so a message inserted or deleted
     * later renumbers the rest and every undrawn one shifts. Storing the route at the moment of creation is
     * what settles it: from then on the message has a route of its own, and `createEdgeElement` prefers a
     * stored route over anything the notation would derive.
     *
     * The height is where the edge was drawn, when the tool reported one (see `EDGE_CREATION_Y_ARG`), and
     * the next free slot in the order otherwise - which is what a message created from the property palette
     * gets, there being no click behind it.
     *
     * Nothing is written for any other edge. A relation with no route is drawn straight between its two
     * ends, which does not change when another relation is added, so there is nothing to pin down.
     */
    protected createRoute(operation: CreateEdgeOperation, semantic: jsonPatch.AddOperation<SerializeAstNode<Edge>>): jsonPatch.Operation[] {
        const value = semantic.value as any;
        // By the AST type on the patch rather than by a type guard: the message is not in the model yet,
        // so there is no node for a guard to be asked about.
        if (this.modelState.diagramType !== 'SEQUENCE' || value.$type !== 'Message') {
            return [];
        }

        const source = this.modelState.index.findIdElement(value.source?.ref?.__id);
        const target = this.modelState.index.findIdElement(value.target?.ref?.__id);
        // Either end may be a gate rather than a lifeline - a message that crosses the border of a frame
        // ends on the border. Anything else at an end is not a message end at all, and there is no route to
        // work out for it.
        if (!isMessageEnd(source) || !isMessageEnd(target)) {
            return [];
        }

        // A gate at either end is itself what pins the message: it is placed on the border by hand, and the
        // route is derived from it on every read (see `sequenceMessageRoute`). Storing one as well would
        // give the message two answers about where it runs, and the stored one wins - so the message would
        // stay put the first time the gate was slid along the border.
        if (isGate(source) || isGate(target)) {
            return [];
        }

        // Where it lands in the order: appended to the diagram's relations by `createSemantic`, so its
        // place is however many messages are already held there. Only needed as the fallback.
        const index = (this.modelState.semanticRoot.diagram.relations ?? []).filter(isMessage).length;
        const points = sequenceMessageRoute(this.modelState.index, source, target, index);
        if (points.length === 0) {
            return [];
        }

        // Drawn at a height of its own, so the route keeps its shape - a loop for a message onto its own
        // lifeline, a single bend for one across - and only moves to where the pointer was.
        const drawnAt = decodeEdgeCreationY(operation.args);
        const placed = drawnAt === undefined ? points : points.map(point => ({ x: point.x, y: point.y - points[0].y + drawnAt }));

        return [
            {
                op: 'add',
                path: '/metaInfos/-',
                value: {
                    $type: 'Route',
                    __id: `route_${value.__id}`,
                    points: placed.map((point, at) => ({
                        $type: 'RoutePoint',
                        __id: `route_${value.__id}_${at}`,
                        x: Math.round(point.x),
                        y: Math.round(point.y)
                    })),
                    element: { $ref: { __id: value.__id, __documentUri: URI.parse(this.modelState.semanticUri).path } }
                }
            } as jsonPatch.Operation
        ];
    }

    protected createSemantic(operation: CreateEdgeOperation, ends: ImplicitEnds = {}): jsonPatch.AddOperation<SerializeAstNode<Edge>> {
        // An end dropped on a connection point names the port, not the shape. The edge is still between
        // the two shapes - a transition runs to the choice, not to a point on it - so the port is split
        // back into its owner, and which point it was records the pin.
        const source = parseConnectionPointId(operation.sourceElementId);
        const target = parseConnectionPointId(operation.targetElementId);

        const { source: sourceNode, target: targetNode } = this.findEnds(
            source?.ownerId ?? operation.sourceElementId,
            target?.ownerId ?? operation.targetElementId
        );
        if (!sourceNode || !targetNode) {
            throw new Error('Source or target node not found for creating edge');
        }

        const astType = getRelationTypeFromElementId(operation.elementTypeId, false);
        const id = createRandomUUID(astType);

        // A gate made for this drop stands in for the frame that was clicked - it is not in the model yet,
        // so its id is all there is to point at, and an id is all a reference carries.
        const sourceId = ends.source ?? sourceNode.__id;
        const targetId = ends.target ?? targetNode.__id;
        const documentUri = URI.parse(this.modelState.semanticUri).path;

        const value: any = {
            $type: astType,
            __id: id,
            source: {
                ref: { __id: sourceId, __documentUri: ends.source ? documentUri : sourceNode.$document?.uri },
                $refText: ends.source ?? this.modelState.nameProvider.getLocalName(sourceNode) ?? sourceNode.__id
            },
            target: {
                ref: { __id: targetId, __documentUri: ends.target ? documentUri : targetNode.$document?.uri },
                $refText: ends.target ?? this.modelState.nameProvider.getLocalName(targetNode) ?? targetNode.__id
            }
        };

        for (const { property, defaultValue } of getDefaultProperties(operation.elementTypeId)) {
            if (value[property] === undefined) {
                value[property] = defaultValue;
            }
        }

        // Written after the defaults, and removed rather than left unset, because the generated
        // defaults do not know what a connection point is: `getDefaultProperties` falls through to an
        // empty array for any property type it has no case for, so an unpinned end would be stored as
        // `sourcePoint: []` - which the grammar, expecting one of four names, cannot read back.
        // An absent property is what marks an end as unpinned.
        setConnectionPoint(value, astType, 'sourcePoint', source?.point);
        setConnectionPoint(value, astType, 'targetPoint', target?.point);

        return {
            op: 'add',
            path: '/diagram/relations/-',
            value
        };
    }

    /**
     * The two elements the new edge is to run between.
     *
     * Usually the two that were clicked, the way round they were clicked. A package merge is the
     * exception: the merges into one package are drawn as a single connector, and an end dropped on it
     * names that connector rather than a package - so it is read back to the package the connector
     * runs into, and the merge joins the set instead of ending on one of its lines.
     *
     * A connector also says which way round the new merge goes, whichever end it was dropped on. It
     * gathers packages into the one it runs into, so the package is what the merge runs from and that
     * one is what it runs to - clicking the connector first and the package second is the same thing
     * said in the other order. Nothing but a merge can be dropped on a connector; the client sees to
     * that (see `GPackageMergeEdge`).
     */
    protected findEnds(sourceId: string, targetId: string): { source?: IdAstNode; target?: IdAstNode } {
        const source = onLifeline(this.modelState.index.findIdElement(sourceId));
        const target = onLifeline(this.modelState.index.findIdElement(targetId));
        const sourceConnector = isPackageMerge(source) ? source : undefined;
        const targetConnector = isPackageMerge(target) ? target : undefined;

        if (sourceConnector && targetConnector) {
            // Both ends on a connector, and so no package to gather. Left unresolved, which is
            // reported rather than stored.
            return {};
        }
        if (sourceConnector) {
            return { source: target, target: sourceConnector.target?.ref };
        }
        if (targetConnector) {
            return { source, target: targetConnector.target?.ref };
        }
        return { source, target };
    }
}
