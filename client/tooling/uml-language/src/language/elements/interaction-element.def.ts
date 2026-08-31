/*********************************************************************************
 * Copyright (c) 2026 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/

import { Glsp } from '@borkdominik-biguml/uml-glsp-server/generator';
import 'reflect-metadata';
import { Node, type Visibility } from '../core/element.def.js';
import type { Gate } from './gate-element.def.js';
import type { Lifeline } from './lifeline-element.def.js';
import type { Message } from './message-element.def.js';

// @ts-nocheck

@Glsp.toolPalette({
    section: 'Container',
    label: 'Interaction',
    icon: 'uml-interaction-icon'
})
@Glsp.defaults
export class Interaction extends Node {
    name: string;
    visibility?: Visibility;
    lifelines?: Array<Lifeline>;
    messages?: Array<Message>;
    /**
     * The gates on this interaction's own border: the points where a message crosses out of it.
     *
     * `formal` because these are the gates a use of this interaction has to match - the interaction declares
     * them, and a `ref` box standing for it provides an actual gate against each. Owned by the interaction
     * because they are on *its* frame, which is also what places them: a gate is snapped to the border of
     * whatever owns it (see `gateBounds`).
     */
    formalGates?: Array<Gate>;
}
