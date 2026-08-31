/**********************************************************************************
 * Copyright (c) 2026 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { INTERACTION_OPERATOR_CHOICES, MESSAGE_SORT_CHOICES } from '@borkdominik-biguml/uml-glsp-server';

/**
 * Predefined choice constants used by generated property palette handlers.
 */
export const PropertyPaletteChoices = {
    VISIBILITY: [
        { label: 'public', value: 'PUBLIC' },
        { label: 'private', value: 'PRIVATE' },
        { label: 'protected', value: 'PROTECTED' },
        { label: 'package', value: 'PACKAGE' },
        { label: 'none', value: 'NONE' }
    ],
    AGGREGATION: [
        { label: 'none', value: 'NONE' },
        { label: 'shared', value: 'SHARED' },
        { label: 'composite', value: 'COMPOSITE' }
    ],
    CONCURRENCY: [
        { label: 'sequential', value: 'SEQUENTIAL' },
        { label: 'guarded', value: 'GUARDED' },
        { label: 'concurrent', value: 'CONCURRENT' }
    ],
    PARAMETER_DIRECTION: [
        { label: 'in', value: 'IN' },
        { label: 'out', value: 'OUT' },
        { label: 'inout', value: 'INOUT' },
        { label: 'return', value: 'RETURN' }
    ],
    EFFECT: [
        { label: 'create', value: 'CREATE' },
        { label: 'read', value: 'READ' },
        { label: 'update', value: 'UPDATE' },
        { label: 'delete', value: 'DELETE' }
    ],
    TRANSITION_KIND: [
        { label: 'internal', value: 'INTERNAL' },
        { label: 'external', value: 'EXTERNAL' },
        { label: 'local', value: 'LOCAL' }
    ],
    /** Which named point of a shape an end of the transition is pinned to; unset means it is not pinned. */
    CONNECTION_POINT: [
        { label: 'automatic', value: '' },
        { label: 'top', value: 'NORTH' },
        { label: 'right', value: 'EAST' },
        { label: 'bottom', value: 'SOUTH' },
        { label: 'left', value: 'WEST' }
    ],
    /**
     * What kind of message it is: what it does to the receiver, and so how its arrow is drawn.
     *
     * Read from the one table that also decides the drawing (see `MESSAGE_SORTS`) rather than listed again
     * here, so the kinds offered and the kinds drawn cannot come apart. Each is offered under its bare name,
     * as every list above is: the dropdown is a few characters wide, so a label carrying an explanation is
     * cut off before it explains anything.
     */
    MESSAGE_SORT: MESSAGE_SORT_CHOICES,
    /**
     * What a combined fragment does with the stretch of the interaction it encloses.
     *
     * Read from the one table that also decides what is written in the tag on its corner (see
     * `INTERACTION_OPERATORS`) rather than listed again here, so the operators offered and the words drawn
     * cannot come apart - and each is offered under that same word, which is what the reader will see on
     * the diagram.
     */
    INTERACTION_OPERATOR: INTERACTION_OPERATOR_CHOICES,
    /** Whether a lifeline's head is a box holding the name, or the stick figure of an actor. */
    LIFELINE_HEAD: [
        { label: 'box', value: 'BOX' },
        { label: 'actor', value: 'ACTOR' },
        { label: 'boundary', value: 'BOUNDARY' }
    ],
    /**
     * Which of the two shapes UML gives a state invariant it is drawn as - the condition in braces on the
     * line, or the state symbol that stands for the same condition. See `composeStateInvariantLabel`.
     */
    STATE_INVARIANT_NOTATION: [
        { label: 'constraint', value: 'CONSTRAINT' },
        { label: 'state', value: 'STATE' }
    ],
    /**
     * Whether a frame covers what it is drawn over or lets it show through - offered on the two shapes of
     * a sequence diagram that are dragged across the rest of it, a `ref` box and a combined fragment.
     *
     * It decides what the box can be clicked by as well as what is seen through it: a transparent one is
     * picked up by its border and leaves the inside click-through. See `FrameFill`.
     */
    FRAME_FILL: [
        { label: 'solid', value: 'SOLID' },
        { label: 'transparent', value: 'TRANSPARENT' }
    ],
    /**
     * Which way round a shape that has two ways round is drawn.
     *
     * Offered two ways, because the shapes divide. A fork bar and a branch diamond are drawn to their bounds
     * and nothing else, so which way one runs *is* which of its bounds is longer: they store nothing, and
     * the palette reads the value off the bounds and sets it by swapping them (see `withOrientationProperty`
     * and `ORIENTATION_PROPERTY_ID`). A partition and a duration constraint store it as a property of their
     * own, because their bounds cannot answer - a block of any proportions holds lanes running either way,
     * and a duration constraint is wider than it is tall whichever edge its arrow is on. Those two get this
     * list through the generated palette, from the `Orientation` type they declare.
     */
    ORIENTATION: [
        { label: 'horizontal', value: 'HORIZONTAL' },
        { label: 'vertical', value: 'VERTICAL' }
    ]
} as const;
