/********************************************************************************
 * Copyright (c) 2022 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import {
    isAbstraction,
    isAcceptEventAction,
    isActivity,
    isActivityFinalNode,
    isActivityParameterNode,
    isActivityPartition,
    isActor,
    isArtifact,
    isAssociation,
    isBehaviorExecutionSpecification,
    isCentralBufferNode,
    isChoice,
    isClass,
    isCommunicationPath,
    isControlFlow,
    isDataType,
    isDecisionNode,
    isDeepHistory,
    isDependency,
    isDeployment,
    isDeploymentModel,
    isDeploymentNode,
    isDeploymentPackage,
    isDeploymentSpecification,
    isDestructionOccurrenceSpecification,
    isDevice,
    isElementImport,
    isEntryPoint,
    isEnumeration,
    isExecutionEnvironment,
    isExitPoint,
    isExtend,
    isFinalState,
    isFlowFinalNode,
    isDurationConstraint,
    isFork,
    isGate,
    isForkNode,
    isGeneralization,
    isInclude,
    isInformationFlow,
    isInitialNode,
    isInitialState,
    isInputPin,
    isInstanceSpecification,
    isInteraction,
    isCombinedFragment,
    isInteractionUse,
    isInterface,
    isInterfaceRealization,
    isJoin,
    isJoinNode,
    isLifeline,
    isLiteralSpecification,
    isManifestation,
    isMergeNode,
    isMessage,
    isNote,
    isOpaqueAction,
    isOutputPin,
    isPackage,
    isPackageImport,
    isPackageMerge,
    isParameter,
    isPrimitiveType,
    isRealization,
    isRegion,
    isSendSignalAction,
    isShallowHistory,
    isState,
    isStateInvariant,
    isStateMachine,
    isSubject,
    isSubstitution,
    isTerminate,
    isTextLabel,
    isTransition,
    isUsage,
    isUseCase,
    type BehaviorExecutionSpecification,
    type Region
} from '@borkdominik-biguml/uml-model-server/grammar';
import type { GEdge, GGraph, GModelElement, GModelFactory } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { GGraphElement } from '../../../jsx/index.js';
import { createAbstractionRelation } from '../../elements/abstraction-relation.element.js';
import { createAcceptEventActionElement } from '../../elements/accept-event-action.element.js';
import { createActivityFinalNodeElement } from '../../elements/activity-final-node.element.js';
import { createActivityParameterNodeElement } from '../../elements/activity-parameter-node.element.js';
import { createActivityPartitionElement } from '../../elements/activity-partition.element.js';
import { createActivityElement } from '../../elements/activity.element.js';
import { createActorElement } from '../../elements/actor.element.js';
import { createArtifactElement } from '../../elements/artifact.element.js';
import { createAssociationRelation } from '../../elements/association-relation.element.js';
import { createBehaviorExecutionSpecificationElement } from '../../elements/behavior-execution-specification.element.js';
import { createCentralBufferNodeElement } from '../../elements/central-buffer-node.element.js';
import { createChoiceElement } from '../../elements/choice.element.js';
import { createClassElement } from '../../elements/class.element.js';
import { createCommunicationPathRelation } from '../../elements/communication-path.element.js';
import { createControlFlowRelation } from '../../elements/control-flow.element.js';
import type { ElementContext } from '../../elements/core/element-context.js';
import { isSurfaceMark } from '../../elements/core/surface-mark.js';
import { createDataTypeElement } from '../../elements/data-type.element.js';
import { createDecisionNodeElement } from '../../elements/decision-node.element.js';
import { createDeepHistoryElement } from '../../elements/deep-history.element.js';
import { createDependencyRelation } from '../../elements/dependency-relation.element.js';
import { createDeploymentModelElement } from '../../elements/deployment-model.element.js';
import { createDeploymentNodeElement } from '../../elements/deployment-node.element.js';
import { createDeploymentPackageElement } from '../../elements/deployment-package.element.js';
import { createDeploymentRelation } from '../../elements/deployment-relation.element.js';
import { createDeploymentSpecificationElement } from '../../elements/deployment-specification.element.js';
import { createDestructionOccurrenceSpecificationElement } from '../../elements/destruction-occurrence-specification.element.js';
import { createDeviceElement } from '../../elements/device.element.js';
import { createElementImportRelation } from '../../elements/element-import.element.js';
import { createEntryPointElement } from '../../elements/entry-point.element.js';
import { createEnumerationElement } from '../../elements/enumeration.element.js';
import { createExecutionEnvironmentElement } from '../../elements/execution-environment.element.js';
import { createExitPointElement } from '../../elements/exit-point.element.js';
import { createExtendRelation } from '../../elements/extend-relation.element.js';
import { createFinalStateElement } from '../../elements/final-state.element.js';
import { createFlowFinalNodeElement } from '../../elements/flow-final-node.element.js';
import { createForkNodeElement } from '../../elements/fork-node.element.js';
import { createForkElement } from '../../elements/fork.element.js';
import { createDurationConstraintElement } from '../../elements/duration-constraint.element.js';
import { createGateElement } from '../../elements/gate.element.js';
import { createGeneralizationRelation } from '../../elements/generalization-relation.element.js';
import { createIncludeRelation } from '../../elements/include-relation.element.js';
import { createInformationFlowRelation } from '../../elements/information-flow.element.js';
import { createInitialNodeElement } from '../../elements/initial-node.element.js';
import { createInitialStateElement } from '../../elements/initial-state.element.js';
import { createInputPinElement } from '../../elements/input-pin.element.js';
import { createInstanceSpecificationElement } from '../../elements/instance-specification.element.js';
import { createCombinedFragmentElement } from '../../elements/combined-fragment.element.js';
import { createInteractionUseElement } from '../../elements/interaction-use.element.js';
import { createInteractionElement } from '../../elements/interaction.element.js';
import { createInterfaceRealizationRelation } from '../../elements/interface-realization-relation.element.js';
import { createInterfaceElement } from '../../elements/interface.element.js';
import { createJoinNodeElement } from '../../elements/join-node.element.js';
import { createJoinElement } from '../../elements/join.element.js';
import { createLifelineElement } from '../../elements/lifeline.element.js';
import { createLiteralSpecificationElement } from '../../elements/literal-specification.element.js';
import { createManifestationRelation } from '../../elements/manifestation.element.js';
import { createMergeNodeElement } from '../../elements/merge-node.element.js';
import { createMessageRelation } from '../../elements/message.element.js';
import { createNoteElement } from '../../elements/note.element.js';
import { createOpaqueActionElement } from '../../elements/opaque-action.element.js';
import { createOutputPinElement } from '../../elements/output-pin.element.js';
import { createPackageImportRelation } from '../../elements/package-import-relation.element.js';
import { createPackageMergeRelation } from '../../elements/package-merge-relation.element.js';
import { createPackageElement } from '../../elements/package.element.js';
import { createParameterElement } from '../../elements/parameter.element.js';
import { createPrimitiveTypeElement } from '../../elements/primitive-type.element.js';
import { createRealizationRelation } from '../../elements/realization-relation.element.js';
import { createRegionElement } from '../../elements/region.element.js';
import { createSendSignalActionElement } from '../../elements/send-signal-action.element.js';
import { createShallowHistoryElement } from '../../elements/shallow-history.element.js';
import { createStateInvariantElement } from '../../elements/state-invariant.element.js';
import { createStateMachineElement } from '../../elements/state-machine.element.js';
import { createStateElement } from '../../elements/state.element.js';
import { createSubjectElement } from '../../elements/subject.element.js';
import { createSubstitutionRelation } from '../../elements/substitution-relation.element.js';
import { createTerminateElement } from '../../elements/terminate.element.js';
import { createTextLabelElement } from '../../elements/text-label.element.js';
import { createTransitionRelation } from '../../elements/transition.element.js';
import { createUsageRelation } from '../../elements/usage-relation.element.js';
import { createUseCaseElement } from '../../elements/use-case.element.js';
import { DiagramModelState } from '../../features/index.js';
import { DiagramLanguageMetadata } from '../../features/model/diagram-language-metadata.js';
import { DiagramModelIndex } from '../../features/model/diagram-model-index.js';

/** Nodes that are drawn as a boundary around other, flatly listed nodes of the same diagram. */
/**
 * Which layer of the drawing an element belongs to, lowest painted first.
 *
 * The semantic model nests and the graph is flat (see `collectSemanticElements`), so the order the nodes
 * come out in is the order they were walked - and that order is about containment, not about what covers
 * what. Three things have to be true of the drawing regardless of it:
 *
 * A frame is a boundary drawn *around* part of the diagram and must stay behind what stands on it.
 *
 * A mark drawn *on* a shape - the bars and the cross and the conditions on a lifeline, the gates on a
 * frame's border - must stay in front of every shape, and not merely in front of the one it belongs to.
 * Walked depth-first they land immediately after their owner, which puts them behind everything created
 * after that owner: a bar placed on the first lifeline of a diagram was painted under the second lifeline,
 * under the `ref` box and under anything else added since, and a shape you have just placed and cannot see
 * reads as a shape that was not placed at all.
 *
 * Everything else sits between the two, in the order it was written, which is the order it was added.
 */
function paintLayer(element: unknown): number {
    if (isCanvasContainer(element)) {
        return 0;
    }
    if (isSurfaceMark(element)) {
        return 2;
    }
    return 1;
}

function isCanvasContainer(element: unknown): boolean {
    return (
        isSubject(element) ||
        isStateMachine(element) ||
        isRegion(element) ||
        isActivity(element) ||
        isActivityPartition(element) ||
        // An interaction is the frame the whole communication or sequence diagram is drawn inside, and
        // its lifelines stand on it as flat siblings (see `FLAT_CONTAINER_TYPES`). Left out of this, a
        // frame added after the lifelines it holds was painted over them and hid them behind its fill.
        isInteraction(element)
    );
}

@injectable()
export class UmlDiagramGModelFactory implements GModelFactory {
    @inject(DiagramModelState)
    protected readonly modelState: DiagramModelState;

    @inject(DiagramModelIndex)
    protected readonly modelIndex: DiagramModelIndex;

    @inject(DiagramLanguageMetadata)
    protected readonly metadata: DiagramLanguageMetadata;

    createModel(): void {
        const newRoot = this.createGraph();
        if (newRoot) {
            this.modelState.updateRoot(newRoot);
        }
    }

    protected createGraph(): GGraph | undefined {
        const diagram = this.modelState.semanticRoot.diagram;

        const collectedNodes: unknown[] = [];
        const collectedEdges: unknown[] = [...diagram.relations];
        diagram.entities.forEach(entity => this.collectSemanticElements(entity, collectedNodes, collectedEdges));

        // Painted in layers rather than in the order they were walked - see `paintLayer` for what each of
        // them is for. The sort is stable, so within a layer everything keeps the depth-first order
        // `collectSemanticElements` put it in: a region still paints in front of the frame that owns it
        // and behind the states that sit on it, and a node added later still paints over one added before.
        const entities = collectedNodes.sort((a, b) => paintLayer(a) - paintLayer(b));
        const nodes = entities.map(e => this.createNodeElement(e)).filter(Boolean) as GModelElement[];
        const edges = collectedEdges
            .filter((r: any) => r.source?.ref && r.target?.ref)
            .map(e => this.createEdgeElement(e))
            .filter(Boolean) as GEdge[];

        return (
            <GGraphElement id={this.modelState.semanticUri}>
                {nodes}
                {edges}
            </GGraphElement>
        ) as GGraph;
    }

    /**
     * Flattens the semantic model's containment into the flat list the graph is built from.
     *
     * The two do not agree on shape. The semantic model nests - a state machine owns regions, a region
     * owns the states and the transitions drawn inside it, and one of those states can own regions of
     * its own - while the graph holds every node as a direct child, placed at an absolute position, with
     * a container drawn *behind* the nodes that sit on it rather than around them.
     *
     * Only `diagram.entities` and `diagram.relations` were ever walked, so anything reachable solely
     * through a container's own properties never became a GModel element: a region and everything put
     * inside it was stored correctly and then simply never drawn.
     */
    protected collectSemanticElements(element: unknown, nodes: unknown[], edges: unknown[]): void {
        nodes.push(element);

        if (isStateMachine(element)) {
            element.regions?.forEach(region => this.collectSemanticElements(region, nodes, edges));
        }

        // A *state's* regions are the bands drawn inside the state itself (see `GStateRegionCompartment`),
        // so the region is not a node of its own here - what is drawn on the band still is. Collected as a
        // node as well, it would appear twice under the one id: once as the band and once as a frame of
        // its own, standing wherever its stored position happens to put it.
        if (isState(element)) {
            element.regions?.forEach(region => this.collectRegionContents(region, nodes, edges));
        }

        if (isRegion(element)) {
            this.collectRegionContents(element, nodes, edges);
        }

        // An interaction owns its lifelines and the messages between them the same way - and that is
        // where both are put by the property palette's create actions and by `getCreationPath`, so
        // without this a lifeline or message added there is stored correctly and never appears.
        if (isInteraction(element)) {
            element.lifelines?.forEach(lifeline => this.collectSemanticElements(lifeline, nodes, edges));
            element.messages?.forEach(message => edges.push(message));
            // And the gates on its own border - the formal ones, which a use of this interaction has to
            // provide an actual gate against.
            element.formalGates?.forEach(gate => nodes.push(gate));
        }

        // A `ref` box owns the actual gates on its border, standing for the formal ones of whatever it
        // refers to. Collected as nodes of their own, like everything else drawn on another shape here -
        // a gate is put *on* the border by being given a position on it, not by being nested in the frame
        // (see `gateBounds`).
        if (isInteractionUse(element)) {
            element.actualGates?.forEach(gate => nodes.push(gate));
        }

        // And a lifeline owns what is drawn on its line: the execution bars, the cross where its life
        // ends, and the conditions that have to hold of it along the way. All are collected as nodes of
        // their own rather than as children of the lifeline, because the graph is flat - each is placed
        // *on* the line by being given the position of it, not by being nested in it (see
        // `executionBounds` and the rest of `lifeline-geometry`).
        if (isLifeline(element)) {
            element.executions?.forEach(execution => this.collectExecutions(execution, nodes));
            element.destructions?.forEach(destruction => nodes.push(destruction));
            element.stateInvariants?.forEach(invariant => nodes.push(invariant));
        }

        // A bar nested inside another is reached through the bar that holds it, and is a node of its own
        // once it is - there is no containment on the canvas here either.
        if (isBehaviorExecutionSpecification(element)) {
            element.executions?.forEach(execution => this.collectExecutions(execution, nodes));
        }
    }

    /**
     * A bar and every bar nested inside it, parent before child.
     *
     * The order is the drawing order: these all sort alike (see `isSurfaceMark`), and a stable sort leaves
     * them in the order they were collected - so a nested bar is painted over the one it is inside rather
     * than under it, which is the whole of what makes the nesting visible.
     */
    protected collectExecutions(execution: BehaviorExecutionSpecification, nodes: unknown[]): void {
        nodes.push(execution);
        execution.executions?.forEach(nested => this.collectExecutions(nested, nodes));
    }

    /**
     * What is drawn on a region: the states and pseudostates put inside it, and the transitions between
     * them - which are stored on the region rather than in the diagram's flat relation list, so they have
     * to be picked up here or they are never drawn either.
     */
    protected collectRegionContents(region: Region, nodes: unknown[], edges: unknown[]): void {
        region.subvertices?.forEach(subvertex => this.collectSemanticElements(subvertex, nodes, edges));
        region.transitions?.forEach(transition => edges.push(transition));
    }

    protected buildCtx<T>(node: T): ElementContext<T> {
        return {
            modelIndex: this.modelIndex,
            node,
            diagramType: this.modelState.diagramType!,
            elementType: this.metadata.convertToElementType((node as any).$type)
        };
    }

    protected createNodeElement(element: unknown): GModelElement | undefined {
        if (isClass(element)) return createClassElement(this.buildCtx(element));
        if (isInterface(element)) return createInterfaceElement(this.buildCtx(element));
        if (isDataType(element)) return createDataTypeElement(this.buildCtx(element));
        if (isEnumeration(element)) return createEnumerationElement(this.buildCtx(element));
        if (isPrimitiveType(element)) return createPrimitiveTypeElement(this.buildCtx(element));
        if (isInstanceSpecification(element)) return createInstanceSpecificationElement(this.buildCtx(element));
        if (isPackage(element)) return createPackageElement(this.buildCtx(element));
        if (isLiteralSpecification(element)) return createLiteralSpecificationElement(this.buildCtx(element));
        if (isParameter(element)) return createParameterElement(this.buildCtx(element));
        // Activity diagram nodes
        if (isActivity(element)) return createActivityElement(this.buildCtx(element));
        if (isActivityPartition(element)) return createActivityPartitionElement(this.buildCtx(element));
        if (isOpaqueAction(element)) return createOpaqueActionElement(this.buildCtx(element));
        if (isAcceptEventAction(element)) return createAcceptEventActionElement(this.buildCtx(element));
        if (isSendSignalAction(element)) return createSendSignalActionElement(this.buildCtx(element));
        if (isInitialNode(element)) return createInitialNodeElement(this.buildCtx(element));
        if (isDecisionNode(element)) return createDecisionNodeElement(this.buildCtx(element));
        if (isMergeNode(element)) return createMergeNodeElement(this.buildCtx(element));
        if (isJoinNode(element)) return createJoinNodeElement(this.buildCtx(element));
        if (isForkNode(element)) return createForkNodeElement(this.buildCtx(element));
        if (isActivityFinalNode(element)) return createActivityFinalNodeElement(this.buildCtx(element));
        if (isFlowFinalNode(element)) return createFlowFinalNodeElement(this.buildCtx(element));
        if (isCentralBufferNode(element)) return createCentralBufferNodeElement(this.buildCtx(element));
        if (isActivityParameterNode(element)) return createActivityParameterNodeElement(this.buildCtx(element));
        if (isInputPin(element)) return createInputPinElement(this.buildCtx(element));
        if (isOutputPin(element)) return createOutputPinElement(this.buildCtx(element));
        // UseCase diagram nodes
        if (isUseCase(element)) return createUseCaseElement(this.buildCtx(element));
        if (isActor(element)) return createActorElement(this.buildCtx(element));
        if (isSubject(element)) return createSubjectElement(this.buildCtx(element));
        // Communication and sequence diagram nodes
        if (isInteraction(element)) return createInteractionElement(this.buildCtx(element));
        if (isLifeline(element)) return createLifelineElement(this.buildCtx(element));
        if (isInteractionUse(element)) return createInteractionUseElement(this.buildCtx(element));
        if (isCombinedFragment(element)) return createCombinedFragmentElement(this.buildCtx(element));
        if (isBehaviorExecutionSpecification(element)) return createBehaviorExecutionSpecificationElement(this.buildCtx(element));
        if (isDestructionOccurrenceSpecification(element)) return createDestructionOccurrenceSpecificationElement(this.buildCtx(element));
        if (isStateInvariant(element)) return createStateInvariantElement(this.buildCtx(element));
        if (isGate(element)) return createGateElement(this.buildCtx(element));
        if (isDurationConstraint(element)) return createDurationConstraintElement(this.buildCtx(element));
        // Deployment diagram nodes
        if (isArtifact(element)) return createArtifactElement(this.buildCtx(element));
        if (isDeploymentSpecification(element)) return createDeploymentSpecificationElement(this.buildCtx(element));
        if (isDevice(element)) return createDeviceElement(this.buildCtx(element));
        if (isExecutionEnvironment(element)) return createExecutionEnvironmentElement(this.buildCtx(element));
        if (isDeploymentModel(element)) return createDeploymentModelElement(this.buildCtx(element));
        if (isDeploymentNode(element)) return createDeploymentNodeElement(this.buildCtx(element));
        if (isDeploymentPackage(element)) return createDeploymentPackageElement(this.buildCtx(element));
        // State machine diagram nodes
        if (isStateMachine(element)) return createStateMachineElement(this.buildCtx(element));
        if (isRegion(element)) return createRegionElement(this.buildCtx(element));
        if (isState(element)) return createStateElement(this.buildCtx(element));
        if (isFinalState(element)) return createFinalStateElement(this.buildCtx(element));
        if (isInitialState(element)) return createInitialStateElement(this.buildCtx(element));
        if (isChoice(element)) return createChoiceElement(this.buildCtx(element));
        if (isJoin(element)) return createJoinElement(this.buildCtx(element));
        if (isFork(element)) return createForkElement(this.buildCtx(element));
        if (isDeepHistory(element)) return createDeepHistoryElement(this.buildCtx(element));
        if (isShallowHistory(element)) return createShallowHistoryElement(this.buildCtx(element));
        if (isExitPoint(element)) return createExitPointElement(this.buildCtx(element));
        if (isEntryPoint(element)) return createEntryPointElement(this.buildCtx(element));
        if (isTerminate(element)) return createTerminateElement(this.buildCtx(element));
        // Every diagram. A note belongs to none of the groups above because it belongs to all of them -
        // it says something about the diagram rather than being part of any one notation.
        if (isNote(element)) return createNoteElement(this.buildCtx(element));
        if (isTextLabel(element)) return createTextLabelElement(this.buildCtx(element));
        return undefined;
    }

    /**
     * An edge, routed the way it was last dragged - or, failing that, the way the notation asks for.
     *
     * A stored `Route` is what someone has said about this edge (see
     * `GenericChangeRoutingPointsOperationHandler`), and it is what every relation here is drawn along.
     * Every relation that builds no route of its own, that is: most build none and are drawn straight
     * between their ends, and for those this is the only route there is.
     *
     * A sequence message is the one that does. Its height is where it is drawn on the page, so it has a
     * route from the moment it is created (see `createMessageRelation`) - and the stored one is not the
     * whole answer for it either, because a message reaching a lifeline where the participant is destroyed
     * runs level with the cross rather than at whatever number was last written. So the message reads its
     * own stored route, answers it, and what it returns is kept. Overriding it here drew such a message as
     * a diagonal: only the end on the cross moved.
     */
    protected createEdgeElement(edge: unknown): GEdge | undefined {
        const gEdge = this.buildEdgeElement(edge);
        if (gEdge && !gEdge.routingPoints?.length) {
            const stored = this.modelIndex.findRoute(gEdge.id)?.points;
            gEdge.routingPoints = stored?.length ? stored.map(point => ({ x: point.x, y: point.y })) : [];
        }
        return gEdge;
    }

    protected buildEdgeElement(edge: unknown): GEdge | undefined {
        if (isAbstraction(edge)) return createAbstractionRelation(this.buildCtx(edge));
        if (isAssociation(edge)) return createAssociationRelation(this.buildCtx(edge));
        if (isDependency(edge)) return createDependencyRelation(this.buildCtx(edge));
        if (isGeneralization(edge)) return createGeneralizationRelation(this.buildCtx(edge));
        if (isInterfaceRealization(edge)) return createInterfaceRealizationRelation(this.buildCtx(edge));
        if (isPackageImport(edge)) return createPackageImportRelation(this.buildCtx(edge));
        if (isPackageMerge(edge)) return createPackageMergeRelation(this.buildCtx(edge));
        if (isRealization(edge)) return createRealizationRelation(this.buildCtx(edge));
        if (isSubstitution(edge)) return createSubstitutionRelation(this.buildCtx(edge));
        if (isUsage(edge)) return createUsageRelation(this.buildCtx(edge));
        if (isElementImport(edge)) return createElementImportRelation(this.buildCtx(edge));
        if (isControlFlow(edge)) return createControlFlowRelation(this.buildCtx(edge));
        if (isInclude(edge)) return createIncludeRelation(this.buildCtx(edge));
        if (isExtend(edge)) return createExtendRelation(this.buildCtx(edge));
        if (isMessage(edge)) return createMessageRelation(this.buildCtx(edge));
        if (isCommunicationPath(edge)) return createCommunicationPathRelation(this.buildCtx(edge));
        if (isManifestation(edge)) return createManifestationRelation(this.buildCtx(edge));
        if (isDeployment(edge)) return createDeploymentRelation(this.buildCtx(edge));
        if (isTransition(edge)) return createTransitionRelation(this.buildCtx(edge));
        if (isInformationFlow(edge)) return createInformationFlowRelation(this.buildCtx(edge));
        return undefined;
    }
}
