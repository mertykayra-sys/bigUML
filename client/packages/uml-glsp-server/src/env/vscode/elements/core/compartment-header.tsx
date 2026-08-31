/**********************************************************************************
 * Copyright (c) 2026 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 **********************************************************************************/

import { CommonModelTypes, STEREOTYPE_LABEL_SUFFIX, stereotypeText } from '@borkdominik-biguml/uml-glsp-server';
import { GCompartmentElement, GLabelElement } from '@borkdominik-biguml/uml-glsp-server/jsx';
import { DefaultTypes } from '@eclipse-glsp/protocol';
import type { GModelElement } from '@eclipse-glsp/server';

export interface CompartmentHeaderProps {
    id: string;
    name: string;
    stereotype?: string;
    stereotypeCssClasses?: string[];
    /**
     * Whether the line in guillemets is the element's own to change, rather than the keyword its metaclass
     * writes. Set it only where the element has a `stereotype` property in the grammar to write back to:
     * the id this gives the label is what `GenericLabelEditOperationHandler` reads to tell a retyped
     * stereotype from a retyped name, and an element with nowhere to put one would have the word stored as
     * its name instead.
     *
     * Off by default, because most of these keywords are not a matter of opinion - an `«interface»` that
     * says something else is not an interface, and the shape would be lying about what it is.
     */
    stereotypeEditable?: boolean;
    isAbstract?: boolean;
    /**
     * Writes a name of several words over several lines, one word per line, instead of on a single
     * line. A shape that does this can be dragged narrower than its name reads on one line, which is
     * why it is asked for per shape rather than done for every name.
     */
    wrapName?: boolean;
}

export function CompartmentHeader(props: CompartmentHeaderProps): GModelElement {
    const { id, name, stereotype, stereotypeCssClasses, stereotypeEditable, isAbstract, wrapName } = props;

    const nameLabelCssClasses = ['uml-font-bold'];
    if (isAbstract) {
        nameLabelCssClasses.push('uml-font-italic');
    }

    return (
        <GCompartmentElement
            id={id + '_comp_header'}
            type={DefaultTypes.COMPARTMENT_HEADER}
            layout='vbox'
            layoutOptions={{ hAlign: 'center' }}
        >
            {stereotype && (
                <GLabelElement
                    // The id says which property a retyped line belongs to, and the type says whether it can
                    // be retyped at all: an editable one is the same label a lifeline and a message write
                    // their stereotype on, and a fixed one is an annotation with nothing behind it.
                    id={stereotypeEditable ? id + STEREOTYPE_LABEL_SUFFIX : id + '_annotation_label'}
                    type={stereotypeEditable ? CommonModelTypes.LABEL_NAME : CommonModelTypes.LABEL_TEXT}
                    text={stereotypeText(stereotype)}
                    cssClasses={stereotypeCssClasses}
                />
            )}
            <GLabelElement
                id={id + '_name_label'}
                type={CommonModelTypes.LABEL_NAME}
                text={name}
                args={wrapName ? { highlight: true, wrapAtSpaces: true } : { highlight: true }}
                cssClasses={nameLabelCssClasses}
            />
        </GCompartmentElement>
    );
}
