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
import { Node } from '../core/element.def.js';

// @ts-nocheck

@Glsp.toolPalette({
    section: 'Container',
    label: 'Primitive Type',
    icon: 'uml-primitive-type-icon'
})
@Glsp.defaults
export class PrimitiveType extends Node {
    name: string;
    /**
     * The word written in guillemets over the name, and what it says the shape is.
     *
     * `«PrimitiveType»` unless the user types something else there, which is why it is a property rather
     * than a keyword the drawing puts on by itself: the metaclass is one answer to what a shape is, and a
     * stereotype applied to it is another - `«id»`, `«money»`, the kind of primitive it stands for. UML
     * writes both in the same place and in the same marks, so there is one line to write and the user owns
     * it. Cleared, it goes back to saying `PrimitiveType`.
     *
     * Stored without the guillemets, which are notation (see `stereotypeText`) - the same arrangement a
     * lifeline's and a message's stereotype have.
     */
    stereotype?: string;
}
