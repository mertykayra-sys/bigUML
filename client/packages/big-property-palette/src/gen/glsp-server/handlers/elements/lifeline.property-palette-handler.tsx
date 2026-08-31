// AUTO-GENERATED – DO NOT EDIT

import { SetPropertyPaletteAction } from '@borkdominik-biguml/big-property-palette';
import { CreateNodeOperation, DeleteElementOperation } from '@eclipse-glsp/server';
import { type Lifeline } from '@borkdominik-biguml/uml-model-server/grammar';
import {
    type GetPropertyPaletteHandlerContext,
    BoolProperty,
    ChoiceProperty,
    PropertyPalette,
    PropertyPaletteChoices,
    ReferenceProperty,
    TextProperty
} from '@borkdominik-biguml/big-property-palette/glsp-server';

export namespace LifelinePropertyPaletteHandler {
    export function getPropertyPalette(context: GetPropertyPaletteHandlerContext<Lifeline>): SetPropertyPaletteAction[] {
        return [
            SetPropertyPaletteAction.create(
                <PropertyPalette
                    elementId={context.semanticElement.__id}
                    label={(context.semanticElement as any).name ?? context.semanticElement.$type}
                >
                    <TextProperty
                        elementId={context.semanticElement.__id}
                        propertyId='name'
                        text={context.semanticElement.name!}
                        label='Name'
                    />
                    <TextProperty
                        elementId={context.semanticElement.__id}
                        propertyId='selector'
                        text={context.semanticElement.selector!}
                        label='Selector'
                    />
                    <TextProperty
                        elementId={context.semanticElement.__id}
                        propertyId='className'
                        text={context.semanticElement.className!}
                        label='Class Name'
                    />
                    <TextProperty
                        elementId={context.semanticElement.__id}
                        propertyId='decomposition'
                        text={context.semanticElement.decomposition!}
                        label='Decomposition'
                    />
                    <ChoiceProperty
                        elementId={context.semanticElement.__id}
                        propertyId='visibility'
                        choices={PropertyPaletteChoices.VISIBILITY}
                        choice={context.semanticElement.visibility!}
                        label='Visibility'
                    />
                    <ChoiceProperty
                        elementId={context.semanticElement.__id}
                        propertyId='head'
                        choices={PropertyPaletteChoices.LIFELINE_HEAD}
                        choice={context.semanticElement.head!}
                        label='Lifeline Head'
                    />
                    <BoolProperty
                        elementId={context.semanticElement.__id}
                        propertyId='isActive'
                        value={!!context.semanticElement.isActive}
                        label='Is Active'
                    />
                    <TextProperty
                        elementId={context.semanticElement.__id}
                        propertyId='stereotype'
                        text={context.semanticElement.stereotype!}
                        label='Stereotype'
                    />
                    <ReferenceProperty
                        elementId={context.semanticElement.__id}
                        propertyId='executions'
                        label='Executions'
                        references={(context.semanticElement.executions ?? [])
                            .filter((e: any) => !!e && !!e.__id)
                            .map((e: any) => ({
                                elementId: e.__id,
                                label: e.name ?? '(unnamed behavior_execution_specification)',
                                name: e.name ?? '',
                                deleteActions: [DeleteElementOperation.create([e.__id])]
                            }))}
                        creates={[
                            {
                                label: 'Create Behavior Execution Specification',
                                action: CreateNodeOperation.create(
                                    context.languageMetadata.convertToElementType('BehaviorExecutionSpecification'),
                                    { containerId: context.semanticElement.__id }
                                )
                            }
                        ]}
                    />
                    <ReferenceProperty
                        elementId={context.semanticElement.__id}
                        propertyId='destructions'
                        label='Destructions'
                        references={(context.semanticElement.destructions ?? [])
                            .filter((e: any) => !!e && !!e.__id)
                            .map((e: any) => ({
                                elementId: e.__id,
                                label: e.name ?? '(unnamed destruction_occurrence_specification)',
                                name: e.name ?? '',
                                deleteActions: [DeleteElementOperation.create([e.__id])]
                            }))}
                        creates={[
                            {
                                label: 'Create Destruction Occurrence Specification',
                                action: CreateNodeOperation.create(
                                    context.languageMetadata.convertToElementType('DestructionOccurrenceSpecification'),
                                    { containerId: context.semanticElement.__id }
                                )
                            }
                        ]}
                    />
                    <ReferenceProperty
                        elementId={context.semanticElement.__id}
                        propertyId='stateInvariants'
                        label='State Invariants'
                        references={(context.semanticElement.stateInvariants ?? [])
                            .filter((e: any) => !!e && !!e.__id)
                            .map((e: any) => ({
                                elementId: e.__id,
                                label: e.name ?? '(unnamed state_invariant)',
                                name: e.name ?? '',
                                deleteActions: [DeleteElementOperation.create([e.__id])]
                            }))}
                        creates={[
                            {
                                label: 'Create State Invariant',
                                action: CreateNodeOperation.create(context.languageMetadata.convertToElementType('StateInvariant'), {
                                    containerId: context.semanticElement.__id
                                })
                            }
                        ]}
                    />
                </PropertyPalette>
            )
        ];
    }
}
