/********************************************************************************
 * Copyright (c) 2022-2023 STMicroelectronics and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import {
    ActivityDiagramNodeTypes,
    ClassDiagramNodeTypes,
    CommonModelTypes,
    CommunicationDiagramEdgeTypes,
    CommunicationDiagramNodeTypes,
    DeploymentDiagramNodeTypes,
    InformationFlowDiagramNodeTypes,
    PackageDiagramNodeTypes,
    SequenceDiagramEdgeTypes,
    SequenceDiagramNodeTypes,
    StateMachineDiagramNodeTypes,
    UseCaseDiagramNodeTypes
} from '@borkdominik-biguml/uml-glsp-server';
import { DefaultTypes, type EdgeTypeHint, type ShapeTypeHint } from '@eclipse-glsp/protocol';
import {
    type DiagramConfiguration,
    GCompartment,
    GLabel,
    type GModelElementConstructor,
    ServerLayoutKind,
    getDefaultMapping
} from '@eclipse-glsp/server';
import { injectable } from 'inversify';
import { GClassNode } from '../elements/class.element.js';
import { GEnumerationNode } from '../elements/enumeration.element.js';
import { GInterfaceNode } from '../elements/interface.element.js';
import { GOperationNode } from '../elements/operation.element.js';
import { GPackageNode } from '../elements/package.element.js';
import { GPropertyNode } from '../elements/property.element.js';

@injectable()
export class UmlDiagramConfiguration implements DiagramConfiguration {
    get typeMapping(): Map<string, GModelElementConstructor> {
        const mapping = getDefaultMapping();
        mapping.set(CommonModelTypes.LABEL_HEADING, GLabel);
        mapping.set(CommonModelTypes.LABEL_TEXT, GLabel);
        mapping.set(CommonModelTypes.COMP_HEADER, GCompartment);
        mapping.set(CommonModelTypes.COMP_STATE_REGION, GCompartment);
        mapping.set(CommonModelTypes.COMP_STATE_PARTS, GCompartment);
        mapping.set(CommonModelTypes.COMP_INTERACTION_OPERAND, GCompartment);
        mapping.set(CommonModelTypes.LABEL_ICON, GLabel);
        mapping.set(CommonModelTypes.ICON, GCompartment);
        mapping.set(ClassDiagramNodeTypes.CLASS, GClassNode);
        mapping.set(ClassDiagramNodeTypes.PROPERTY, GPropertyNode);
        mapping.set(ClassDiagramNodeTypes.OPERATION, GOperationNode);
        mapping.set(ClassDiagramNodeTypes.INTERFACE, GInterfaceNode);
        mapping.set(ClassDiagramNodeTypes.ENUMERATION, GEnumerationNode);
        mapping.set(ClassDiagramNodeTypes.ENUMERATION_LITERAL, GEnumerationNode);
        mapping.set(ClassDiagramNodeTypes.PACKAGE, GPackageNode);
        return mapping;
    }

    get shapeTypeHints(): ShapeTypeHint[] {
        return [
            {
                elementTypeId: ClassDiagramNodeTypes.CLASS,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: [ClassDiagramNodeTypes.PROPERTY, ClassDiagramNodeTypes.OPERATION]
            },
            {
                elementTypeId: ClassDiagramNodeTypes.PACKAGE,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: [
                    ClassDiagramNodeTypes.CLASS,
                    ClassDiagramNodeTypes.DATA_TYPE,
                    ClassDiagramNodeTypes.ENUMERATION,
                    ClassDiagramNodeTypes.INTERFACE,
                    ClassDiagramNodeTypes.PACKAGE,
                    ClassDiagramNodeTypes.PRIMITIVE_TYPE
                ]
            },
            {
                elementTypeId: ClassDiagramNodeTypes.INTERFACE,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: [ClassDiagramNodeTypes.PROPERTY, ClassDiagramNodeTypes.OPERATION]
            },
            {
                elementTypeId: ClassDiagramNodeTypes.ENUMERATION,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: [ClassDiagramNodeTypes.ENUMERATION_LITERAL]
            },
            {
                elementTypeId: ClassDiagramNodeTypes.INSTANCE_SPECIFICATION,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: [ClassDiagramNodeTypes.SLOT]
            },
            {
                elementTypeId: ClassDiagramNodeTypes.PRIMITIVE_TYPE,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: []
            },
            // Members of a classifier are laid out by their container, so they are neither
            // repositionable nor resizable — only the owning classifier is.
            {
                elementTypeId: ClassDiagramNodeTypes.SLOT,
                repositionable: false,
                deletable: true,
                resizable: false,
                reparentable: false,
                containableElementTypeIds: []
            },
            {
                elementTypeId: ClassDiagramNodeTypes.ENUMERATION_LITERAL,
                repositionable: false,
                deletable: true,
                resizable: false,
                reparentable: false,
                containableElementTypeIds: []
            },
            {
                elementTypeId: ClassDiagramNodeTypes.OPERATION,
                repositionable: false,
                deletable: true,
                resizable: false,
                reparentable: false,
                containableElementTypeIds: []
            },
            {
                elementTypeId: ClassDiagramNodeTypes.PROPERTY,
                repositionable: false,
                deletable: true,
                resizable: false,
                reparentable: false,
                containableElementTypeIds: []
            },
            // The same property, written as a row on an activity frame - the parameters listed under its
            // name. A node type is scoped to one diagram, so the class hint above does not cover it, and a
            // row left unhinted is not marked as laid out by the frame that draws it: the frame then has a
            // child that reads as independently movable, which is what took the resize handles off the
            // frame itself.
            {
                elementTypeId: ActivityDiagramNodeTypes.PROPERTY,
                repositionable: false,
                deletable: true,
                resizable: false,
                reparentable: false,
                containableElementTypeIds: []
            },
            {
                elementTypeId: StateMachineDiagramNodeTypes.STATE_MACHINE,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                // The frame is drawn around the whole state machine, so every other node of the diagram
                // must remain creatable on top of it (they are added as flat siblings, see
                // `GenericCreateNodeOperationHandler.FLAT_CONTAINER_TYPES`).
                containableElementTypeIds: [
                    StateMachineDiagramNodeTypes.CHOICE,
                    StateMachineDiagramNodeTypes.DEEP_HISTORY,
                    StateMachineDiagramNodeTypes.ENTRY_POINT,
                    StateMachineDiagramNodeTypes.EXIT_POINT,
                    StateMachineDiagramNodeTypes.FINAL_STATE,
                    StateMachineDiagramNodeTypes.FORK,
                    StateMachineDiagramNodeTypes.INITIAL_STATE,
                    StateMachineDiagramNodeTypes.JOIN,
                    StateMachineDiagramNodeTypes.REGION,
                    StateMachineDiagramNodeTypes.SHALLOW_HISTORY,
                    StateMachineDiagramNodeTypes.STATE,
                    StateMachineDiagramNodeTypes.TERMINATE
                ]
            },
            // A region standing on its own - the area a state machine's states are drawn on. Resizable,
            // which it is not without a hint of its own: `TypeHintProvider` grants `resizeFeature` from
            // `resizable` and from nothing else, so a region had no handles to be dragged out with at
            // all. What may be dropped on it is what may stand in a region, which is every vertex of a
            // state machine but not another region - a region divides a state, not another region.
            {
                elementTypeId: StateMachineDiagramNodeTypes.REGION,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: [
                    StateMachineDiagramNodeTypes.CHOICE,
                    StateMachineDiagramNodeTypes.DEEP_HISTORY,
                    StateMachineDiagramNodeTypes.ENTRY_POINT,
                    StateMachineDiagramNodeTypes.EXIT_POINT,
                    StateMachineDiagramNodeTypes.FINAL_STATE,
                    StateMachineDiagramNodeTypes.FORK,
                    StateMachineDiagramNodeTypes.INITIAL_STATE,
                    StateMachineDiagramNodeTypes.JOIN,
                    StateMachineDiagramNodeTypes.SHALLOW_HISTORY,
                    StateMachineDiagramNodeTypes.STATE,
                    StateMachineDiagramNodeTypes.TERMINATE
                ]
            },
            // A state holding regions is the frame its substates are drawn on, so everything that can
            // stand inside one has to be named here or the client refuses the drop - they are added as
            // flat siblings drawn on top, see `FLAT_CONTAINER_TYPES`.
            {
                elementTypeId: StateMachineDiagramNodeTypes.STATE,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: [
                    StateMachineDiagramNodeTypes.CHOICE,
                    StateMachineDiagramNodeTypes.DEEP_HISTORY,
                    StateMachineDiagramNodeTypes.ENTRY_POINT,
                    StateMachineDiagramNodeTypes.EXIT_POINT,
                    StateMachineDiagramNodeTypes.FINAL_STATE,
                    StateMachineDiagramNodeTypes.FORK,
                    StateMachineDiagramNodeTypes.INITIAL_STATE,
                    StateMachineDiagramNodeTypes.JOIN,
                    StateMachineDiagramNodeTypes.SHALLOW_HISTORY,
                    StateMachineDiagramNodeTypes.STATE,
                    StateMachineDiagramNodeTypes.TERMINATE
                ]
            },
            // The band a region is drawn as. Resizable and nothing else: it is how tall the region is
            // that the user drags, and a hint is the only thing that grants the handles to do it with -
            // `TypeHintProvider` takes `resizeFeature` from `resizable` and from nowhere else. Not
            // repositionable, because the band is placed by the state that owns it and a move would
            // spring back on the next redraw; deletable, because deleting the band is deleting the
            // region. What may be dropped on it is what may be dropped on the state.
            {
                elementTypeId: CommonModelTypes.COMP_STATE_REGION,
                repositionable: false,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: [
                    StateMachineDiagramNodeTypes.CHOICE,
                    StateMachineDiagramNodeTypes.DEEP_HISTORY,
                    StateMachineDiagramNodeTypes.ENTRY_POINT,
                    StateMachineDiagramNodeTypes.EXIT_POINT,
                    StateMachineDiagramNodeTypes.FINAL_STATE,
                    StateMachineDiagramNodeTypes.FORK,
                    StateMachineDiagramNodeTypes.INITIAL_STATE,
                    StateMachineDiagramNodeTypes.JOIN,
                    StateMachineDiagramNodeTypes.SHALLOW_HISTORY,
                    StateMachineDiagramNodeTypes.STATE,
                    StateMachineDiagramNodeTypes.TERMINATE
                ]
            },
            // The compartment a state's parts are written in. Adjusted through `State.partsHeight` in the
            // property panel rather than by dragging: a resize is recorded against the element it was
            // performed on, and this compartment is not an element - a `Size` naming it would go out as a
            // reference to nothing and leave the file unparseable. So it takes no handles, and nothing
            // may be dropped on it either.
            {
                elementTypeId: CommonModelTypes.COMP_STATE_PARTS,
                repositionable: false,
                deletable: false,
                resizable: false,
                reparentable: false,
                containableElementTypeIds: []
            },
            // The bars and the branch diamonds. A node only gets resize handles through a hint of its
            // own - `TypeHintProvider` grants `resizeFeature` from `resizable` and from nothing else -
            // so leaving these out is what made them fixed in size while still being movable. A bar in
            // particular needs them: which way it runs is its shape, so standing one up is a resize.
            ...[
                StateMachineDiagramNodeTypes.FORK,
                StateMachineDiagramNodeTypes.JOIN,
                StateMachineDiagramNodeTypes.CHOICE,
                // The same diamond on the class diagram. A node type is scoped to one diagram, so the
                // state machine's hint above says nothing about this one - and without a hint of its own
                // it would be drawn at whatever size it was created with and never resizable.
                ClassDiagramNodeTypes.CHOICE,
                ActivityDiagramNodeTypes.FORK_NODE,
                ActivityDiagramNodeTypes.JOIN_NODE,
                ActivityDiagramNodeTypes.DECISION_NODE,
                ActivityDiagramNodeTypes.MERGE_NODE
            ].map(elementTypeId => ({
                elementTypeId,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: []
            })),
            {
                elementTypeId: CommunicationDiagramNodeTypes.INTERACTION,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                // The frame is drawn around the whole communication diagram, so the lifelines must remain
                // creatable on top of it (they are added as flat siblings, see
                // `GenericCreateNodeOperationHandler.FLAT_CONTAINER_TYPES`).
                containableElementTypeIds: [CommunicationDiagramNodeTypes.LIFELINE]
            },
            // The interaction frame of a sequence diagram, and the lifelines standing on it. Both are
            // resizable, and both have to be: a frame is the boundary the whole interaction is drawn
            // inside, and a lifeline is a head with a line running down from it - how far down is how
            // long the object lives, which is the one thing about a lifeline there is to drag.
            {
                elementTypeId: SequenceDiagramNodeTypes.INTERACTION,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                // As on the communication diagram: the frame is drawn around the whole diagram, so the
                // lifelines must stay creatable on top of it (they are added as flat siblings, see
                // `GenericCreateNodeOperationHandler.FLAT_CONTAINER_TYPES`).
                containableElementTypeIds: [
                    SequenceDiagramNodeTypes.LIFELINE,
                    SequenceDiagramNodeTypes.GATE,
                    SequenceDiagramNodeTypes.COMBINED_FRAGMENT
                ]
            },
            {
                elementTypeId: SequenceDiagramNodeTypes.LIFELINE,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                // A lifeline holds what is drawn on its line. Without naming them here the client refuses
                // the drop and lets it fall through to the canvas, which would land the shape beside the
                // line as a node of its own - where it is stored is already settled by `getCreationPath`,
                // which puts it in the lifeline's own containment.
                containableElementTypeIds: [
                    SequenceDiagramNodeTypes.BEHAVIOR_EXECUTION_SPECIFICATION,
                    SequenceDiagramNodeTypes.DESTRUCTION_OCCURRENCE_SPECIFICATION,
                    SequenceDiagramNodeTypes.STATE_INVARIANT
                ]
            },
            // The bar itself. Resizable, because how far it reaches is how long the participant is busy;
            // repositionable, because where it starts is when. Only down the page counts either way - the
            // bar is centred on its lifeline's line whatever the drag says about across (see
            // `executionBounds`), so a sideways move simply springs back on the next redraw.
            {
                elementTypeId: SequenceDiagramNodeTypes.BEHAVIOR_EXECUTION_SPECIFICATION,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                // A bar holds the bars nested inside it - what the participant started doing while it was
                // already busy, which is what a call to itself leaves behind. Without naming it here the
                // client refuses the drop and lets it fall through to the lifeline underneath, which makes
                // a second bar beside the first instead of one inside it.
                containableElementTypeIds: [SequenceDiagramNodeTypes.BEHAVIOR_EXECUTION_SPECIFICATION]
            },
            // The `ref` box. Both, because it is drawn across the lifelines it covers: which participants
            // take part is where it is and how wide it is, so it is dragged and stretched like any box.
            // Nothing is containable - it stands for an interaction drawn elsewhere, and holds no shapes.
            {
                elementTypeId: SequenceDiagramNodeTypes.INTERACTION_USE,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                // The gates on its border. Without naming them here the client refuses the drop and lets it
                // fall through to the canvas, which would land the mark beside the box as a node of its
                // own - where it is stored is already settled by `getCreationPath`, which puts it in
                // `InteractionUse.actualGates`.
                containableElementTypeIds: [SequenceDiagramNodeTypes.GATE]
            },
            // A combined fragment. Both, and for the same reason the `ref` box above is: the box is drawn
            // across the lifelines and messages it encloses, so which stretch of the interaction it is
            // about is where it is and how big it is.
            {
                elementTypeId: SequenceDiagramNodeTypes.COMBINED_FRAGMENT,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                // What may be drawn inside it. They are contained by lying within its bounds rather than by
                // being nested in it (see `FLAT_CONTAINER_TYPES`), but the client refuses a drop onto a
                // shape that does not name the type at all - so a fragment that named nothing could not be
                // drawn around anything, which is the whole of what it is for. A fragment is in the list
                // itself: UML nests them, and an `opt` inside a `par` is an ordinary thing to draw.
                containableElementTypeIds: [
                    SequenceDiagramNodeTypes.LIFELINE,
                    SequenceDiagramNodeTypes.COMBINED_FRAGMENT,
                    SequenceDiagramNodeTypes.INTERACTION_USE,
                    SequenceDiagramNodeTypes.BEHAVIOR_EXECUTION_SPECIFICATION,
                    SequenceDiagramNodeTypes.STATE_INVARIANT,
                    SequenceDiagramNodeTypes.DURATION_CONSTRAINT,
                    SequenceDiagramNodeTypes.NOTE,
                    SequenceDiagramNodeTypes.TEXT_LABEL
                ]
            },
            // A duration constraint. Both, and the height is the point of it: the shape spans the stretch
            // of time being constrained, so stretching it is how that stretch is said. Nothing is
            // containable - it is an arrow and a line of text, and holds no shapes.
            {
                elementTypeId: SequenceDiagramNodeTypes.DURATION_CONSTRAINT,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: []
            },
            // A gate. Repositionable, because where it sits on the border is *where* the message crosses -
            // the whole of what it says, and the thing to drag when the message is to be aimed somewhere
            // else. Not resizable: it is a mark drawn at a fixed size (see `gateBounds`), and handles on
            // one would offer a drag that springs back on the next redraw. A drag that lands off the border
            // is snapped back onto it rather than refused, so the mark can be slid around the frame freely.
            {
                elementTypeId: SequenceDiagramNodeTypes.GATE,
                repositionable: true,
                deletable: true,
                resizable: false,
                reparentable: false,
                containableElementTypeIds: []
            },
            // The cross where a participant's life ends. Repositionable, because where it sits on the line
            // is *when* the object dies - the whole of what it says. Not resizable: a mark is drawn at a
            // fixed size (see `destructionBounds`), and handles on one would offer a drag that springs
            // back on the next redraw.
            {
                elementTypeId: SequenceDiagramNodeTypes.DESTRUCTION_OCCURRENCE_SPECIFICATION,
                repositionable: true,
                deletable: true,
                resizable: false,
                reparentable: false,
                containableElementTypeIds: []
            },
            // A condition on the participant at one point of its life. Repositionable, because where it
            // sits on the line is *when* it has to hold; resizable, because what is written in it is an
            // expression of any length and the width is how much of it fits on a line. Only down the page
            // counts of a move - the shape is centred on its lifeline's line whatever the drag says about
            // across (see `stateInvariantBounds`), so a sideways one springs back on the next redraw.
            {
                elementTypeId: SequenceDiagramNodeTypes.STATE_INVARIANT,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: []
            },
            {
                elementTypeId: UseCaseDiagramNodeTypes.SUBJECT,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: []
            },
            {
                elementTypeId: UseCaseDiagramNodeTypes.USE_CASE,
                repositionable: true,
                deletable: true,
                resizable: false,
                reparentable: false,
                containableElementTypeIds: []
            },
            // The activity frame. Resizable, because it is the boundary the flow is drawn inside and has
            // to be dragged out to fit it. Nothing is named as containable: an activity holds its nodes
            // the way a subject and a state machine frame do, by having them drawn on top of it as flat
            // siblings - see `FLAT_CONTAINER_TYPES`, which is what keeps a node dropped on one from being
            // nested into `Activity.nodes`, where the gmodel factory would never reach it to draw it.
            {
                elementTypeId: ActivityDiagramNodeTypes.ACTIVITY,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: []
            },
            // A swimlane, and so resizable for the same reason the frame is: it is the band its actions
            // are drawn along and has to be dragged out to fit them. Nothing is named as containable -
            // the actions sit on it as flat siblings, as they do on the frame.
            {
                elementTypeId: ActivityDiagramNodeTypes.ACTIVITY_PARTITION,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: []
            },
            // An action holds its pins. Without a hint naming them the client refuses the drop and lets
            // it fall through to the canvas, which is what made a pin dropped on an action - or on one of
            // the dots marking where a pin goes - land beside it as a node of its own instead. Where it
            // is then stored is already settled: `getCreationPath` puts it in `inputPins`/`outputPins`.
            {
                elementTypeId: ActivityDiagramNodeTypes.OPAQUE_ACTION,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: [ActivityDiagramNodeTypes.INPUT_PIN, ActivityDiagramNodeTypes.OUTPUT_PIN]
            },
            // The parameter node, drawn as a plain box straddling the border of its activity. Resizable
            // because its size is now held rather than shrunk onto its name (see
            // `GActivityParameterNodeNodeElement`), and a parameter named at any length has to be given
            // room for it - without a hint of its own it would have no handles to do that with.
            {
                elementTypeId: ActivityDiagramNodeTypes.ACTIVITY_PARAMETER_NODE,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: []
            },
            // The pins of an action. Deletable, and nothing else: a pin is placed on the boundary by the
            // action that owns it and drawn at a fixed size, so a move or a resize has nowhere to be
            // recorded and would spring back on the next redraw. `TypeHintProvider` hands each of these
            // straight to the matching feature, and a hint is the only thing that takes one away.
            ...[ActivityDiagramNodeTypes.INPUT_PIN, ActivityDiagramNodeTypes.OUTPUT_PIN].map(elementTypeId => ({
                elementTypeId,
                repositionable: false,
                deletable: true,
                resizable: false,
                reparentable: false,
                containableElementTypeIds: []
            })),
            // The note and the free label, in every diagram there is - both say something about the
            // diagram rather than being part of any one notation, so they are drawn in all of them and
            // need a hint in all of them. A node type is scoped to one diagram, so there is no single
            // hint that could cover either. Resizable above all: how wide one is drawn is where its text
            // wraps, so dragging it out is how the writing in it is laid out, and a hint is the only
            // thing that grants the handles to do it with (`TypeHintProvider` takes `resizeFeature` from
            // `resizable` and from nowhere else). Nothing is containable - both hold writing, not shapes.
            ...[
                ActivityDiagramNodeTypes.NOTE,
                ClassDiagramNodeTypes.NOTE,
                CommunicationDiagramNodeTypes.NOTE,
                DeploymentDiagramNodeTypes.NOTE,
                InformationFlowDiagramNodeTypes.NOTE,
                PackageDiagramNodeTypes.NOTE,
                SequenceDiagramNodeTypes.NOTE,
                StateMachineDiagramNodeTypes.NOTE,
                UseCaseDiagramNodeTypes.NOTE,
                ActivityDiagramNodeTypes.TEXT_LABEL,
                ClassDiagramNodeTypes.TEXT_LABEL,
                CommunicationDiagramNodeTypes.TEXT_LABEL,
                DeploymentDiagramNodeTypes.TEXT_LABEL,
                InformationFlowDiagramNodeTypes.TEXT_LABEL,
                PackageDiagramNodeTypes.TEXT_LABEL,
                SequenceDiagramNodeTypes.TEXT_LABEL,
                StateMachineDiagramNodeTypes.TEXT_LABEL,
                UseCaseDiagramNodeTypes.TEXT_LABEL
            ].map(elementTypeId => ({
                elementTypeId,
                repositionable: true,
                deletable: true,
                resizable: true,
                reparentable: false,
                containableElementTypeIds: []
            })),
            // The actor, in either of the diagrams it appears in. Drawn as the stick figure alone, with
            // no box around it, so its size is whatever the figure and the name below it need - there is
            // nothing for a resize handle to take hold of.
            ...[UseCaseDiagramNodeTypes.ACTOR, InformationFlowDiagramNodeTypes.ACTOR].map(elementTypeId => ({
                elementTypeId,
                repositionable: true,
                deletable: true,
                resizable: false,
                reparentable: false,
                containableElementTypeIds: []
            }))
        ];
    }

    get edgeTypeHints(): EdgeTypeHint[] {
        return [
            createDefaultEdgeTypeHint(DefaultTypes.EDGE),
            // A message runs between the things a message can end on, and nothing else. Named here so the
            // client knows: without a hint every node is a valid end, which let a message be drawn to a
            // state invariant or a note. Nothing refused it - the reference was written, the file was
            // saved, and the message came back pointing at something no `MessageEnd` rule could resolve.
            //
            // Naming them also turns the two clicks into something the reader can see: the valid ends light
            // up while the tool is armed, which is the answer to *where* a message may be connected.
            {
                elementTypeId: SequenceDiagramEdgeTypes.MESSAGE,
                repositionable: true,
                deletable: true,
                routable: true,
                sourceElementTypeIds: SEQUENCE_MESSAGE_ENDS,
                targetElementTypeIds: SEQUENCE_MESSAGE_ENDS
            },
            // The communication notation draws no frames a message can cross and no gates to cross them at,
            // so its messages run between lifelines and nothing else.
            {
                elementTypeId: CommunicationDiagramEdgeTypes.MESSAGE,
                repositionable: true,
                deletable: true,
                routable: true,
                sourceElementTypeIds: [CommunicationDiagramNodeTypes.LIFELINE],
                targetElementTypeIds: [CommunicationDiagramNodeTypes.LIFELINE]
            }
        ];
    }

    layoutKind = ServerLayoutKind.MANUAL;
    needsClientLayout = true;
    animatedUpdate = true;
}

/**
 * What a sequence message may be dropped on.
 *
 * Wider than what it may end on, because all but the first two are read back to something else the moment
 * they are dropped on - each of them being what the user was pointing at rather than what the model can
 * hold.
 *
 * A frame becomes a gate: the server puts one at the point of the border that was dropped on and ends the
 * message there (see `GenericCreateEdgeOperationHandler.createImplicitGates`), which is the gate the user
 * would otherwise have had to place first.
 *
 * An execution bar and the cross where a participant's life ends both become the lifeline they are on: a
 * message ends on a participant at a moment, and this model has no occurrences for that moment to be (see
 * `GenericCreateEdgeOperationHandler.onLifeline`). The arrow still lands on the mark, which the anchor sees
 * to on its own - and the cross has to be droppable for the obvious reason that a delete message is drawn
 * pointing straight at it.
 *
 * So only the first two are ever named in a saved file. The rest are here for the drop.
 */
const SEQUENCE_MESSAGE_ENDS = [
    SequenceDiagramNodeTypes.LIFELINE,
    SequenceDiagramNodeTypes.GATE,
    SequenceDiagramNodeTypes.BEHAVIOR_EXECUTION_SPECIFICATION,
    SequenceDiagramNodeTypes.DESTRUCTION_OCCURRENCE_SPECIFICATION,
    SequenceDiagramNodeTypes.INTERACTION,
    SequenceDiagramNodeTypes.INTERACTION_USE
];

export function createDefaultShapeTypeHint(elementId: string): ShapeTypeHint {
    return {
        elementTypeId: elementId,
        repositionable: true,
        deletable: true,
        resizable: true,
        reparentable: true
    };
}

export function createDefaultEdgeTypeHint(elementId: string): EdgeTypeHint {
    return {
        elementTypeId: elementId,
        repositionable: true,
        deletable: true,
        routable: true,
        sourceElementTypeIds: [ClassDiagramNodeTypes.CLASS, ClassDiagramNodeTypes.INTERFACE],
        targetElementTypeIds: [ClassDiagramNodeTypes.CLASS, ClassDiagramNodeTypes.INTERFACE]
    };
}
