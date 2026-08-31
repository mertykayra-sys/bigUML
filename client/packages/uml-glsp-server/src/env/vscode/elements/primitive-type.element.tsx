/**********************************************************************************
 * Copyright (c) 2023 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/
import { ClassDiagramNodeTypes } from '@borkdominik-biguml/uml-glsp-server';
import type { PrimitiveType } from '@borkdominik-biguml/uml-model-server/grammar';
import { type Dimension, type Point } from '@eclipse-glsp/protocol';
import { GNode, type GModelElement } from '@eclipse-glsp/server';
import type { ElementContext } from './core/element-context.js';
import { CompartmentHeader } from './core/index.js';

/**
 * What the line in guillemets says where the user has not written it themselves - the metaclass, which is
 * what UML writes over a primitive type that carries no stereotype of its own.
 *
 * Also what clearing the line comes back to: an empty one would be a shape with a blank line over its name
 * and nothing to say what it is, and the property it is stored in cannot hold an empty value in any case.
 */
export const PRIMITIVE_TYPE_KEYWORD = 'PrimitiveType';

export class GPrimitiveTypeNode extends GNode {
    override type = ClassDiagramNodeTypes.PRIMITIVE_TYPE;
    // Kept in the middle of the box at whatever height it is dragged to, as for a class - see `GClassNode`.
    override layout = 'uml-centered-vbox';
    name: string = 'UNDEFINED DataType NAME';
}

export interface GPrimitiveTypeNodeElementProps {
    node: PrimitiveType;
    position?: Point;
    size?: Dimension;
}

export function GPrimitiveTypeNodeElement(props: GPrimitiveTypeNodeElementProps): GModelElement {
    const { node, position, size } = props;
    const id = node.__id;

    const primNode = new GPrimitiveTypeNode();
    primNode.id = id;
    primNode.name = node.name;
    primNode.cssClasses = ['uml-node'];
    primNode.children = [];

    if (position) {
        primNode.position = position;
    }
    if (size) {
        primNode.size = size;
        primNode.layoutOptions = { prefWidth: size.width, prefHeight: size.height };
    }

    // The keyword is the element's own to retype - `«PrimitiveType»` is what it says until the user says
    // otherwise, and typing over it writes the stereotype rather than renaming the shape. See the property
    // on `PrimitiveType`, which is what makes this label editable rather than an annotation.
    const header = <CompartmentHeader id={id} name={node.name} stereotype={node.stereotype ?? PRIMITIVE_TYPE_KEYWORD} stereotypeEditable />;
    header.parent = primNode;
    primNode.children.push(header);

    return primNode;
}

export function createPrimitiveTypeElement(ctx: ElementContext<PrimitiveType>): GModelElement {
    const position = ctx.modelIndex.findPosition(ctx.node.__id);
    const size = ctx.modelIndex.findSize(ctx.node.__id);

    return <GPrimitiveTypeNodeElement node={ctx.node} position={position} size={size} />;
}
