/**********************************************************************************
 * Copyright (c) 2026 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { encodeNodePreset, NODE_PRESET_ARG, SequenceDiagramNodeTypes } from '@borkdominik-biguml/uml-glsp-server';
import { type Args, type MaybePromise, type PaletteItem, ToolPaletteItemProvider, TriggerNodeCreationAction } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import {
    ActivityDiagramToolPaletteItemProvider,
    ClassDiagramToolPaletteItemProvider,
    CommunicationDiagramToolPaletteItemProvider,
    DeploymentDiagramToolPaletteItemProvider,
    InformationFlowDiagramToolPaletteItemProvider,
    PackageDiagramToolPaletteItemProvider,
    SequenceDiagramToolPaletteItemProvider,
    StateMachineDiagramToolPaletteItemProvider,
    UseCaseDiagramToolPaletteItemProvider
} from '../../../../gen/vscode/index.js';
import { DiagramModelState } from '../../features/index.js';

@injectable()
export class UmlDiagramToolPaletteItemProvider extends ToolPaletteItemProvider {
    @inject(DiagramModelState)
    protected readonly modelState: DiagramModelState;

    @inject(ActivityDiagramToolPaletteItemProvider)
    protected readonly activityDiagramToolPaletteItemProvider: ActivityDiagramToolPaletteItemProvider;

    @inject(ClassDiagramToolPaletteItemProvider)
    protected readonly classDiagramToolPaletteItemProvider: ClassDiagramToolPaletteItemProvider;

    @inject(CommunicationDiagramToolPaletteItemProvider)
    protected readonly communicationDiagramToolPaletteItemProvider: CommunicationDiagramToolPaletteItemProvider;

    @inject(DeploymentDiagramToolPaletteItemProvider)
    protected readonly deploymentDiagramToolPaletteItemProvider: DeploymentDiagramToolPaletteItemProvider;

    @inject(InformationFlowDiagramToolPaletteItemProvider)
    protected readonly informationFlowDiagramToolPaletteItemProvider: InformationFlowDiagramToolPaletteItemProvider;

    @inject(PackageDiagramToolPaletteItemProvider)
    protected readonly packageDiagramToolPaletteItemProvider: PackageDiagramToolPaletteItemProvider;

    @inject(SequenceDiagramToolPaletteItemProvider)
    protected readonly sequenceDiagramToolPaletteItemProvider: SequenceDiagramToolPaletteItemProvider;

    @inject(StateMachineDiagramToolPaletteItemProvider)
    protected readonly stateMachineDiagramToolPaletteItemProvider: StateMachineDiagramToolPaletteItemProvider;

    @inject(UseCaseDiagramToolPaletteItemProvider)
    protected readonly useCaseDiagramToolPaletteItemProvider: UseCaseDiagramToolPaletteItemProvider;

    override getItems(args?: Args): MaybePromise<PaletteItem[]> {
        const diagramType = this.modelState.diagramType;

        switch (diagramType) {
            case 'ACTIVITY':
                return this.activityDiagramToolPaletteItemProvider.getItems(args);
            case 'CLASS':
                return this.classDiagramToolPaletteItemProvider.getItems(args);
            case 'COMMUNICATION':
                return this.communicationDiagramToolPaletteItemProvider.getItems(args);
            case 'DEPLOYMENT':
                return this.deploymentDiagramToolPaletteItemProvider.getItems(args);
            case 'INFORMATION_FLOW':
                return this.informationFlowDiagramToolPaletteItemProvider.getItems(args);
            case 'PACKAGE':
                return this.packageDiagramToolPaletteItemProvider.getItems(args);
            case 'SEQUENCE':
                return withActorLifeline(this.sequenceDiagramToolPaletteItemProvider.getItems(args));
            case 'STATE_MACHINE':
                return this.stateMachineDiagramToolPaletteItemProvider.getItems(args);
            case 'USE_CASE':
                return this.useCaseDiagramToolPaletteItemProvider.getItems(args);
            default:
                return [];
        }
    }
}

/**
 * Adds the actor to the sequence palette, beside the lifeline it is one of the two forms of.
 *
 * An actor is a lifeline whose head is a stick figure rather than a box - the same participant, drawn
 * differently, which is why the model holds it as a property of `Lifeline` rather than as a type of its own
 * (see `LifelineHead`). But a reader reaching for an actor is reaching for a *thing*, not for a setting to
 * change after drawing a box they did not want, so the palette offers both.
 *
 * Added here rather than generated, because the generator works from the element types and this is not one.
 * It arms the ordinary lifeline tool with the head already answered - see `NODE_PRESET_ARG`.
 */
async function withActorLifeline(items: MaybePromise<PaletteItem[]>): Promise<PaletteItem[]> {
    const palette = await items;
    const container = palette.find(group => group.children?.some(item => item.id === 'lifeline'));
    const lifeline = container?.children?.findIndex(item => item.id === 'lifeline');
    // Nothing to sit beside means nothing to add: a palette with no lifeline on it is not a sequence
    // palette, and an actor on its own would offer a participant that cannot be drawn.
    if (!container?.children || lifeline === undefined || lifeline < 0) {
        return palette;
    }

    container.children.splice(lifeline + 1, 0, {
        id: 'lifeline-actor',
        // The same sort string every generated item carries, so the two stay in the order they are listed
        // in rather than being sorted apart by their labels.
        sortString: 'A',
        label: 'Actor',
        icon: 'uml-actor-icon',
        actions: [
            TriggerNodeCreationAction.create(SequenceDiagramNodeTypes.LIFELINE, {
                args: { [NODE_PRESET_ARG]: encodeNodePreset('head', 'ACTOR') }
            })
        ]
    });

    return palette;
}
