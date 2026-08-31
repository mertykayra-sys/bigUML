/*********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/

import {
    decodeNodePreset,
    DESTRUCTION_SIZE,
    DURATION_CONSTRAINT_DEFAULT_SIZE,
    GATE_SIZE,
    EXECUTION_DEFAULT_HEIGHT,
    EXECUTION_MIN_HEIGHT,
    EXECUTION_NEST_OFFSET,
    EXECUTION_WIDTH,
    executionWidth,
    COMBINED_FRAGMENT_DEFAULT_SIZE,
    INTERACTION_USE_DEFAULT_SIZE,
    LIFELINE_DEFAULT_SIZE,
    STATE_INVARIANT_DEFAULT_SIZE
} from '@borkdominik-biguml/uml-glsp-server';
import { getCreationPath, getDefaultProperties, hasNoName, isNoBounds } from '@borkdominik-biguml/uml-glsp-server/gen/vscode';
import {
    createRandomUUID,
    findAvailableNodeName,
    type SerializeAstNode,
    type SerializedRecordNode
} from '@borkdominik-biguml/uml-model-server';
import {
    isBehaviorExecutionSpecification,
    isLifeline,
    isState,
    reflection,
    type MetaInfo,
    type Node
} from '@borkdominik-biguml/uml-model-server/grammar';
import {
    type Command,
    CreateNodeOperation,
    type CreateNodeOperationHandler,
    getRelativeLocation,
    type GModelElement,
    OperationHandler,
    Point,
    TriggerNodeCreationAction
} from '@eclipse-glsp/server';
import type * as jsonpatch from 'fast-json-patch';
import { inject, injectable } from 'inversify';
import { URI } from 'vscode-uri';
import { executionBounds, lifelineFrame } from '../../../elements/core/index.js';
import { stateSizeWithRegions } from '../../../elements/state.element.js';
import { ModelPatchCommand } from '../../command/model-patch-command.js';
import { GridSnapper } from '../../grid/grid-snapper.js';
import { DiagramLanguageMetadata } from '../../model/diagram-language-metadata.js';
import { type DiagramModelState } from '../../model/diagram-model-state.js';

const DEFAULT_NODE_SIZE = { width: 80, height: 30 };

/**
 * What a bar is ultimately on, however many bars it is nested inside.
 *
 * A lifeline for every bar this editor creates, and the caller checks for one - the chain can end elsewhere
 * in a hand-written file, and a bar that is not on a lifeline has nothing to be measured against.
 */
function rootLifelineOf(execution: unknown): unknown {
    let container = (execution as { $container?: unknown }).$container;
    while (isBehaviorExecutionSpecification(container)) {
        container = container.$container;
    }
    return container;
}

/** Node types that need a bigger default size than the generic fallback to read well on the canvas. */
const NODE_SIZE_OVERRIDES: Record<string, { width: number; height: number }> = {
    Subject: { width: 400, height: 600 },
    UseCase: { width: 140, height: 85 },
    State: { width: 160, height: 70 },
    StateMachine: { width: 800, height: 600 },
    // A region is the area a row of states is drawn on rather than a box holding a name, matching
    // `GRegionNodeElement`. Without an entry of its own it opened at the generic 80 by 30 - below the
    // floor a region is drawn at, so every one of them came out the same minimum size.
    Region: { width: 600, height: 240 },
    // A fork/join is a bar rather than a box - see `GForkJoinNodeElement`, which opens at the same size.
    Fork: { width: 120, height: 10 },
    Join: { width: 120, height: 10 },
    ForkNode: { width: 120, height: 10 },
    JoinNode: { width: 120, height: 10 },
    // An action is a box holding its name, and a name that runs to a second line is the normal case -
    // matching `GOpaqueActionNodeElement`, which places its pins against exactly this size.
    OpaqueAction: { width: 80, height: 60 },
    // The two signal actions, matching `DEFAULT_EVENT_ACTION_SIZE`. Wider than a plain action because
    // half their height is given over to the notch, leaving that much less room for the name.
    AcceptEventAction: { width: 140, height: 60 },
    SendSignalAction: { width: 140, height: 60 },
    // The buffer node is the action's box with square corners, so it opens at the same size.
    CentralBufferNode: { width: 80, height: 60 },
    // A parameter node holds its name on one line, matching `GActivityParameterNodeNodeElement`.
    ActivityParameterNode: { width: 120, height: 50 },
    // The activity is the frame its flow is drawn inside, matching `GActivityNodeElement`.
    Activity: { width: 600, height: 400 },
    // A note holds prose, so it opens as a block rather than as a line: wide enough for a few words to
    // a line and deep enough for a few lines of them, which is what a note is written in. Matching
    // `GNoteNodeElement`, which wraps the text to whatever width the note is dragged to.
    Note: { width: 180, height: 90 },
    // A label is writing with nothing drawn around it, so it opens as one line and grows onto a second
    // by itself where it needs to. Matching `GTextLabelNodeElement`.
    TextLabel: { width: 160, height: 34 },
    // A partition is a swimlane, opening with two bands - matching `GActivityPartitionNodeElement`.
    ActivityPartition: { width: 600, height: 300 },
    // The pseudostates drawn as a small mark of their own - the two histories, the two points on a
    // state's border and the terminate cross - matching `GPseudostateMarkNodeElement`. Square, because
    // the mark is drawn to the shorter side and the node's bounds are what a transition anchors to: at
    // the generic 80 by 30 the mark comes out 30 across in the middle of a box nearly three times as
    // wide, and the transition stops on the side of that box, a clear 25 pixels short of the shape.
    DeepHistory: { width: 30, height: 30 },
    ShallowHistory: { width: 30, height: 30 },
    ExitPoint: { width: 30, height: 30 },
    EntryPoint: { width: 30, height: 30 },
    Terminate: { width: 30, height: 30 },
    // The branch diamonds, likewise matching `GDiamondNodeElement`.
    Choice: { width: 40, height: 40 },
    DecisionNode: { width: 40, height: 40 },
    MergeNode: { width: 40, height: 40 }
};

/**
 * The same, for the types whose shape depends on which diagram they are drawn in.
 *
 * An interaction and its lifelines are held by one model and drawn by two notations: a communication
 * diagram makes a lifeline a box the size of its name, a sequence diagram makes it a head with the
 * lifetime line running down from it. Those are not the same size, and `NODE_SIZE_OVERRIDES` is keyed by
 * the AST type alone - which is all an element that looks the same everywhere needs.
 */
const DIAGRAM_NODE_SIZE_OVERRIDES: Record<string, Record<string, { width: number; height: number }>> = {
    SEQUENCE: {
        // Matching `GSequenceLifelineNodeElement`: the height is the lifetime, and the messages of the
        // interaction are drawn down it.
        Lifeline: LIFELINE_DEFAULT_SIZE,
        // The frame the whole sequence stands inside, so it opens with room for a lifeline of the above
        // height and a few messages down it.
        Interaction: { width: 900, height: 600 },
        // The execution bar. Its width is not really its own - the bar is drawn at `EXECUTION_WIDTH`
        // whatever is stored (see `executionBounds`) - but a `Size` is written for every node on creation,
        // and one that disagreed with what is drawn would be what the property panel reported.
        BehaviorExecutionSpecification: { width: EXECUTION_WIDTH, height: EXECUTION_DEFAULT_HEIGHT },
        // The destruction cross, drawn in a fixed square whatever is stored (see `destructionBounds`) -
        // written all the same, because every node is given a `Size` on creation and one that disagreed
        // with what is drawn would be what the property panel reported.
        DestructionOccurrenceSpecification: { width: DESTRUCTION_SIZE, height: DESTRUCTION_SIZE },
        // The `ref` box, matching `GInteractionUseNodeElement` - about the size of the tag and the name
        // under it, and stretched from there over whichever lifelines it turns out to cover.
        InteractionUse: INTERACTION_USE_DEFAULT_SIZE,
        // A combined fragment, matching `GCombinedFragmentNodeElement`. Wide and deep where the `ref` box
        // above is small: a fragment is drawn *around* messages already on the page, so it opens big
        // enough to enclose a few and is trimmed from there.
        CombinedFragment: COMBINED_FRAGMENT_DEFAULT_SIZE,
        // A condition on the line, matching `stateInvariantBounds`: a line deep and wide enough for a
        // short expression, which is what most of them are.
        StateInvariant: STATE_INVARIANT_DEFAULT_SIZE,
        // The double-headed arrow and the condition beside it, matching `GDurationConstraintNodeElement`:
        // tall enough to span a couple of messages, which is the stretch most durations are about.
        DurationConstraint: DURATION_CONSTRAINT_DEFAULT_SIZE,
        // The mark on a frame's border, drawn in a fixed square whatever is stored (see `gateBounds`) -
        // written all the same, because every node is given a `Size` on creation and one that disagreed
        // with what is drawn would be what the property panel reported.
        Gate: { width: GATE_SIZE, height: GATE_SIZE }
    }
};

/**
 * Node types that only visually contain other nodes through absolute position/size overlap
 * on the canvas (the diagram model renders `diagram.entities` flatly). Creating a node "inside"
 * one of these must still add it as a flat sibling, never nested into the container's own
 * containment property (e.g. `Subject.useCases`, `StateMachine.regions`, `ActivityPartition.nodes`) -
 * such nested nodes are never traversed by the gmodel factory and would silently disappear from the
 * rendered diagram, while staying in the file where nothing on the canvas can select or delete them.
 */
const FLAT_CONTAINER_TYPES = new Set<string>([
    'Subject',
    'StateMachine',
    'Interaction',
    'Activity',
    'ActivityPartition',
    // A composite state contains its substates the same way: they are drawn over its region bands, which
    // are compartments of the state and hold nothing themselves (see `GStateRegionCompartment`). Listing
    // it here is also what stops a substate dropped on a state from resolving to no containment property
    // at all, which is a patch path of `''` - the whole document.
    'State',
    // And a combined fragment contains the stretch of the interaction it encloses the same way again: the
    // messages and lifelines inside it lie across it and stay elements of the diagram. Its operands are
    // the exception and are written into it - they arrive from its property palette, which names its
    // container and carries no drop location, and that is what `resolveContainerPath` tells them apart by.
    'CombinedFragment'
]);

/**
 * Element types that are never written inside another element, wherever they happen to be dropped.
 *
 * The containment rules are read off the diagram's own type unions, so an element named in one is
 * offered as a child of every container that holds that union - a note landed in `Package.entities`,
 * `Activity.nodes` and `Region.subvertices` alike. That is wrong for a note twice over. UML attaches one
 * to what it comments on with a line rather than by containment, so there is nothing it is *in*; and
 * only a few containers are walked for their contents (see `collectSemanticElements`), so a note nested
 * in one of the rest would be stored correctly and then never drawn again.
 *
 * The counterpart of {@link FLAT_CONTAINER_TYPES}, which says the same thing about the container end: a
 * node dropped on a state machine frame stays a sibling of it. This says it about the element end, for
 * one that is a sibling of everything.
 */
const FLAT_ELEMENT_TYPES = new Set<string>(['Note', 'TextLabel']);

/**
 * Element types that are owned by the shape they are dropped on, but placed on the page rather than inside
 * it.
 *
 * These are the marks this editor draws *on* another shape: the bars, the cross and the conditions that go
 * on a lifeline, and the gates that go on a frame's border. Each is stored in its owner's containment
 * property, and each is drawn by resolving its stored position against its owner's bounds - which are page
 * coordinates (see `lifeline-geometry` and `gate-geometry`).
 *
 * So each needs both halves of what follows, and neither is the default. The containment path has to be the
 * shape's own even where that shape is a flat container, because {@link FLAT_CONTAINER_TYPES} exists for
 * nested nodes the gmodel factory never walks - and it does walk these, which is what makes them the
 * exception rather than a special case. And the position has to stay the page's: `getRelativeLocation`
 * otherwise subtracts the container's origin, which put a gate dropped on a `ref` box at the box's top left
 * corner however far along the border it was aimed, and a bar dropped on a lifeline as far above the
 * pointer as that lifeline's head is down the page.
 */
const OWNED_BUT_PLACED_TYPES = new Set<string>([
    'Gate',
    'BehaviorExecutionSpecification',
    'DestructionOccurrenceSpecification',
    'StateInvariant'
]);

/**
 * The lanes a node of this type opens with, held in a containment property of its own.
 *
 * A swimlane with one band in it is just a box with its name turned sideways, so a partition opens with
 * two. They are `subpartitions` of the one partition rather than partitions in their own right: the
 * shape on the canvas stays a single thing to move, resize and delete, and its lanes cannot drift apart.
 *
 * A combined fragment opens with two for the same reason, and it is the same reason again: a fragment is
 * created as a `par`, and a `par` with one operand says nothing at all - what it is about is the several
 * stretches beside one another and the dashed rule between them. Opening with one meant every fragment had
 * to be given a second operand by hand before it was the shape anybody drew it for.
 *
 * An `opt` or a `critical` takes a single operand, and one retyped to either has a band too many to
 * delete. That is the cheaper way round: the operator is chosen after the shape is drawn, so the count at
 * creation can only serve the operator it is created as.
 *
 * Its lanes are a type of their own, unlike a partition's - hence `type`, which defaults to the type of
 * the shape being created because that is what a partition's lanes are.
 */
const NODE_OPENING_LANES: Record<string, { property: string; count: number; type?: string }> = {
    ActivityPartition: { property: 'subpartitions', count: 2 },
    CombinedFragment: { property: 'operands', count: 2, type: 'InteractionOperand' }
};

@injectable()
export class GenericCreateNodeOperationHandler extends OperationHandler implements CreateNodeOperationHandler {
    readonly operationType = CreateNodeOperation.KIND;

    declare readonly modelState: DiagramModelState;

    @inject(DiagramLanguageMetadata)
    protected readonly metadata: DiagramLanguageMetadata;

    get elementTypeIds(): string[] {
        return this.metadata.nodeTypeIds;
    }

    override label: string = '';

    getTriggerActions(): TriggerNodeCreationAction[] {
        console.log('Available element types for creation:', this.elementTypeIds);
        return this.elementTypeIds.map(typeId => TriggerNodeCreationAction.create(typeId));
    }

    override createCommand(operation: CreateNodeOperation): Command | undefined {
        // An element that stores no bounds is placed by whatever owns it - a pin by its action - so it
        // has nowhere to be on the canvas itself. Dropped anywhere else it used to be created all the
        // same, as a flat entity with no position, which put it at the origin on top of whatever was
        // already there. Refusing is what a drop outside its container should do.
        if (isNoBounds(operation.elementTypeId) && !this.isNestedInContainer(operation)) {
            return undefined;
        }

        // The element and its opening lanes are written by this one patch, so the names already handed out
        // have to be carried along - the diagram has none of them yet and would hand out the same twice.
        const claimedNames = new Set<string>();
        const documentPath = URI.parse(this.modelState.semanticUri).path;
        const semanticPatch = this.createSemantic(operation, claimedNames);
        const metaPatch = this.createMeta(operation, semanticPatch.value.__id, documentPath);
        const patch: jsonpatch.Operation[] = [semanticPatch, ...metaPatch, ...this.openStateForRegion(operation, documentPath)];

        return new ModelPatchCommand(this.modelState, JSON.stringify(patch));
    }

    /**
     * Opens a state into the frame it becomes when it is given a region, where that is what this operation
     * is doing - nothing at all for every other creation.
     *
     * A state is drawn as a box holding its name and it stores the size of one from the moment it is
     * created, which is the size it keeps: a stored width is the user's and nothing overrides it. But a
     * state with a region in it is not that box any more, it is the frame its substates stand inside, and
     * the one moment it is fair to resize it for them is the moment it stops being the one and starts
     * being the other. Without this the first region left the state at the width of its own name, a slot
     * too narrow to put a substate in, and every composite state had to be dragged open by hand.
     *
     * Only for a region that is actually going *into* the state: the same drop carrying a location makes
     * a region of the diagram drawn on top of the state instead (see `FLAT_CONTAINER_TYPES`), and that one
     * is not a band of it and must not resize it. `resolveContainerPath` is what decides between the two,
     * so it is asked rather than second-guessed.
     */
    protected openStateForRegion(operation: CreateNodeOperation, documentPath: string): jsonpatch.Operation[] {
        if (!operation.containerId) {
            return [];
        }

        const state = this.modelState.index.findIdElement(operation.containerId);
        const statePath = state && this.modelState.index.findPath(state.__id);
        if (!isState(state) || !statePath || this.resolveContainerPath(operation) !== `${statePath}/regions/-`) {
            return [];
        }

        const stored = this.modelState.index.findSize(state.__id);
        const sizePath = this.modelState.index.findSizePath(state.__id);
        // The region this operation adds is not on the state yet, so it is counted in here.
        const size = stateSizeWithRegions(stored, state, (state.regions?.length ?? 0) + 1);

        return [
            {
                op: sizePath && stored ? 'replace' : 'add',
                path: sizePath ?? '/metaInfos/-',
                value: {
                    $type: 'Size',
                    __id: `size_${state.__id}`,
                    element: {
                        $ref: {
                            __id: state.__id,
                            __documentUri: stored?.element?.$nodeDescription?.documentUri.path ?? documentPath
                        }
                    },
                    width: size.width,
                    height: size.height
                }
            } as jsonpatch.Operation
        ];
    }

    /** Whether the drop landed on an element that takes this type as one of its own contents. */
    protected isNestedInContainer(operation: CreateNodeOperation): boolean {
        const containerPath = this.resolveContainerPath(operation);
        return containerPath !== '' && containerPath !== '/diagram/entities/-';
    }

    protected createSemantic(
        operation: CreateNodeOperation,
        claimedNames: Set<string> = new Set()
    ): jsonpatch.AddOperation<SerializeAstNode<Node>> {
        const newName = findAvailableNodeName(
            this.modelState.semanticRoot,
            'New' + this.stripPrefix(operation.elementTypeId),
            claimedNames
        );
        claimedNames.add(newName);
        const containerPath = this.resolveContainerPath(operation);
        const astType = this.metadata.convertToAst(operation.elementTypeId) as Node['$type'];

        const id = createRandomUUID(astType);

        const nodeValue: SerializedRecordNode = {
            $type: astType,
            __id: id
        };

        // Only where the element has somewhere to put one. A note is the text it holds and carries no
        // name at all, and a `name` written onto one goes into the file as a property the grammar has no
        // rule for - swallowed by the unknown-property rule on the next read and gone, after a round trip
        // through the user's file. What such an element opens holding comes from its own defaults below.
        if (!hasNoName(astType)) {
            nodeValue.name = newName;
        }

        const allProps = getDefaultProperties(operation.elementTypeId);
        for (const { property, defaultValue } of allProps) {
            if (property !== 'name' && nodeValue[property] === undefined) {
                nodeValue[property] = defaultValue;
            }
        }

        // And over the top of those, whatever the palette item that armed the tool had already answered -
        // an actor being a lifeline whose head is answered before it is drawn (see `NODE_PRESET_ARG`).
        // Written after the defaults because it *is* a default, of the more particular kind: the item says
        // which of the ways this element is drawn was reached for.
        //
        // Asked of the grammar rather than trusted, the way `setConnectionPoint` asks: this arrives from
        // the client, and a property written onto a type with no field for it goes into the file under a
        // rule that cannot read it back - which is a diagram that never opens again.
        const preset = decodeNodePreset(operation.args);
        if (preset && preset.property in reflection.getTypeMetaData(astType).properties) {
            nodeValue[preset.property] = preset.value;
        }

        // Written straight into the element rather than as patch operations of their own: a lane is part
        // of what the shape *is*, and one `add` carrying them keeps that true of the file as well.
        const opening = NODE_OPENING_LANES[this.stripPrefix(operation.elementTypeId)];
        if (opening) {
            const laneType = (opening.type ?? astType) as Node['$type'];
            nodeValue[opening.property] = Array.from({ length: opening.count }, () => {
                const laneName = findAvailableNodeName(this.modelState.semanticRoot, 'New' + laneType, claimedNames);
                claimedNames.add(laneName);
                return { $type: laneType, __id: createRandomUUID(laneType), name: laneName };
            });
        }

        return {
            op: 'add',
            path: containerPath,
            value: nodeValue as SerializeAstNode<Node>
        };
    }

    /**
     * The size a bar opens at when it is being dropped inside another bar, or nothing where it is not.
     *
     * A nested execution is drawn inside the one it is nested in, and the table above opens every bar at the
     * full stretch a bar on the bare line gets - which on a parent no deeper than that is a bar hanging out
     * of the bottom of its own parent, the one place it may not be. So it opens at what is left of the parent
     * once the insets are taken off both ends, which is what `executionBounds` would have given it had
     * nothing been stored (see `EXECUTION_NEST_OFFSET`).
     *
     * The width is written to match what will be drawn, for the reason every bar's is: a `Size` is written
     * for every node on creation, the bar's width is not really its own, and one that disagreed with the
     * drawing is what the property panel would report.
     */
    protected nestedExecutionSize(operation: CreateNodeOperation): { width: number; height: number } | undefined {
        if (this.stripPrefix(operation.elementTypeId) !== 'BehaviorExecutionSpecification' || !operation.containerId) {
            return undefined;
        }
        const parent = this.modelState.index.findIdElement(operation.containerId);
        if (!isBehaviorExecutionSpecification(parent)) {
            return undefined;
        }
        const lifeline = rootLifelineOf(parent);
        if (!isLifeline(lifeline)) {
            return undefined;
        }

        const frame = lifelineFrame(this.modelState.index, lifeline);
        const bounds = executionBounds(this.modelState.index, parent, frame);
        return {
            width: executionWidth(bounds.width),
            height: Math.max(bounds.height - 2 * EXECUTION_NEST_OFFSET, EXECUTION_MIN_HEIGHT)
        };
    }

    protected createMeta(
        operation: CreateNodeOperation,
        id: string,
        nodeDocumentUri: string
    ): jsonpatch.AddOperation<SerializeAstNode<MetaInfo>>[] {
        const location = GridSnapper.snap(this.getRelativeLocation(operation));
        const astType = this.stripPrefix(operation.elementTypeId);
        const perDiagram = this.modelState.diagramType ? DIAGRAM_NODE_SIZE_OVERRIDES[this.modelState.diagramType] : undefined;
        const { width, height } =
            this.nestedExecutionSize(operation) ?? perDiagram?.[astType] ?? NODE_SIZE_OVERRIDES[astType] ?? DEFAULT_NODE_SIZE;
        const patch: jsonpatch.AddOperation<SerializeAstNode<MetaInfo>>[] = [
            {
                op: 'add',
                path: '/metaInfos/-',
                value: {
                    $type: 'Size',
                    __id: 'size_' + id,
                    element: { $ref: { __id: id, __documentUri: nodeDocumentUri } },
                    width,
                    height
                }
            },
            {
                op: 'add',
                path: '/metaInfos/-',
                value: {
                    $type: 'Position',
                    element: { $ref: { __id: id, __documentUri: nodeDocumentUri } },
                    __id: 'pos_' + id,
                    x: location?.x ?? 0,
                    y: location?.y ?? 0
                }
            }
        ];

        return isNoBounds(operation.elementTypeId) ? [] : patch;
    }

    protected getLocation(operation: CreateNodeOperation): Point | undefined {
        return operation.location;
    }

    protected getRelativeLocation(operation: CreateNodeOperation): Point | undefined {
        const absoluteLocation = this.getLocation(operation) ?? Point.ORIGIN;
        return getRelativeLocation(absoluteLocation, this.getPositioningContainer(operation));
    }

    /**
     * The element the new node's location is made relative to. A node created inside a flat container
     * (see {@link FLAT_CONTAINER_TYPES}) becomes an absolutely positioned sibling of that container rather
     * than a real child, so its location must stay relative to the graph - making it relative to the
     * container would shift it by the container's own origin and drop it off its intended spot.
     */
    protected getPositioningContainer(operation: CreateNodeOperation): GModelElement {
        const container = this.getContainer(operation);
        // A mark drawn *on* a shape is placed against that shape's page coordinates rather than inside it,
        // so its location stays the graph's however it is stored - see {@link OWNED_BUT_PLACED_TYPES}.
        if (OWNED_BUT_PLACED_TYPES.has(this.stripPrefix(operation.elementTypeId))) {
            return this.modelState.root;
        }
        if (!container || (container.type && FLAT_CONTAINER_TYPES.has(this.stripPrefix(container.type)))) {
            return this.modelState.root;
        }
        return container;
    }

    protected getContainer(operation: CreateNodeOperation): GModelElement | undefined {
        const index = this.modelState.index;
        // `find` rather than `get`, which throws on an id it does not hold. The callers all read this as
        // optional, and a drop names its container by an id that came from the client - so a stale one
        // should leave the node on the canvas, not fail the whole operation.
        return operation.containerId ? index.find(operation.containerId) : undefined;
    }

    /**
     * What the container *is*, rather than how it happens to be drawn.
     *
     * A container is not always a node: a region of a composite state is a compartment of that state
     * (see `GStateRegionCompartment`), so its gmodel type is `comp` and says nothing about what may be
     * put in it. Its semantic type does, and it is the semantic model the new element is written into.
     * For everything drawn as a node the two agree, the gmodel type being the semantic one with the
     * representation prefixed - which is what `stripPrefix` takes back off.
     */
    protected containerType(containerId: string): string | undefined {
        const semantic = this.modelState.index.findIdElement(containerId)?.$type;
        return semantic ?? this.modelState.index.find(containerId)?.type;
    }

    protected resolveContainerPath(operation: CreateNodeOperation): string {
        // Asked before anything about the container, because for these the container does not come into
        // it - see `FLAT_ELEMENT_TYPES`.
        if (FLAT_ELEMENT_TYPES.has(this.stripPrefix(operation.elementTypeId))) {
            return '/diagram/entities/-';
        }

        if (operation.containerId) {
            const container = { type: this.containerType(operation.containerId) };
            const containerPath = this.modelState.index.findPath(operation.containerId);

            // Asked before the flat-container rule below, for the two things that belong *in* the named
            // container rather than on the canvas beside it.
            //
            // An element that stores no bounds is written on its owner - an activity's parameters are rows
            // on its frame, which the gmodel factory reads straight off the containment property.
            //
            // A request carrying no drop location came from the property palette, which names its
            // container outright: its `+` adds to that element's own list. A drop from the canvas always
            // carries the point it landed on, and that is what the flat-container rule below is about -
            // a node dropped *onto* a shape, which must stay a flat sibling drawn on top of it.
            //
            // Diverting either to `/diagram/entities/-` stores it where nothing lists it, and for a
            // no-bounds element `createCommand` then refuses the operation outright - which is what left
            // the palette's `+` doing nothing at all.
            if (
                container?.type &&
                (isNoBounds(operation.elementTypeId) ||
                    operation.location === undefined ||
                    // A mark belongs on the shape it was dropped on, even where that shape is a flat
                    // container - the gmodel factory walks these containment properties, so the reason the
                    // flat rule exists does not apply. A gate dropped on the interaction frame went to
                    // `/diagram/entities/-` without this, which left it a sibling of the frame rather than
                    // one of its formal gates: nothing snapped it to the border, and nothing listed it.
                    OWNED_BUT_PLACED_TYPES.has(this.stripPrefix(operation.elementTypeId)))
            ) {
                const creationProperty = getCreationPath(container.type, operation.elementTypeId);
                if (creationProperty) {
                    return containerPath + '/' + creationProperty + '/-';
                }
            }

            if (container?.type === 'graph' || (container?.type && FLAT_CONTAINER_TYPES.has(this.stripPrefix(container.type)))) {
                return '/diagram/entities/-';
            }

            if (container?.type) {
                const creationProperty = getCreationPath(container.type, operation.elementTypeId);
                if (creationProperty) {
                    return containerPath + '/' + creationProperty + '/-';
                }
            }
        }

        // A drop the container cannot take becomes a flat entity of the diagram, which is where every
        // node in this editor lives anyway. Never the empty path: that is the whole document in JSON
        // Patch, so an `add` against it would have replaced the model with the one new node.
        return '/diagram/entities/-';
    }

    protected stripPrefix(name: string): string {
        return name.replace(/^.*?__/, '');
    }
}
