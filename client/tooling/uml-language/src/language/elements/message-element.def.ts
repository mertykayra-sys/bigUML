/*********************************************************************************
 * Copyright (c) 2026 borkdominik and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the MIT License which is available at https://opensource.org/licenses/MIT.
 *
 * SPDX-License-Identifier: MIT
 *********************************************************************************/

import { Glsp } from '@borkdominik-biguml/uml-glsp-server/generator';
import { Language } from '@borkdominik-biguml/uml-language-tooling';
import 'reflect-metadata';
import { Edge, type MessageEnd, type Visibility } from '../core/element.def.js';

// @ts-nocheck

/**
 * What kind of message it is, which is the whole of how the arrow is drawn - UML's `MessageSort`.
 *
 * A call is a solid line; a reply and a create are dashed, because they carry no new request. A
 * synchronous call and a delete take the filled head that says the sender waits; everything else takes the
 * open one. See `MESSAGE_SORTS`, which is the table all of that is written in, and `messageStroke`, which
 * draws from it.
 */
export type MessageSort = 'SYNCH_CALL' | 'ASYNCH_CALL' | 'ASYNCH_SIGNAL' | 'REPLY' | 'CREATE_MESSAGE' | 'DELETE_MESSAGE';

@Glsp.toolPalette({
    section: 'Edges',
    label: 'Message',
    icon: 'uml-message-icon'
})
@Glsp.defaults
export class Message extends Edge {
    /**
     * What is written on the line, as the user wrote it.
     *
     * Free text rather than an identifier, because a message is labelled with the operation it calls and
     * an operation is written with its parentheses - `validate()` is as legal a label as `Hello`, and so is
     * `data = 5` for a message that assigns what it returns. The parentheses are not notation this tool
     * puts on or takes off: a message that names an operation has them, a message that names a signal or
     * says something in prose does not, and only whoever typed the label knows which of those it is. So
     * they are stored as part of the name and drawn as part of it - nothing here appends a pair to a label
     * that was typed without one.
     *
     * `LangiumName` is what every other name is parsed as, and it has no terminal for a `(`, a `.` or a
     * `,` - a name typed with any of them was stored without it, silently, so `validate()` came back as
     * `validate` on the next read. See `storableProse`, which is the filter this rule pairs with, and
     * `hasTextName`, which is how the two are kept together.
     */
    @Language.text name?: string;
    visibility?: Visibility;
    /**
     * A message that says nothing about its kind is a call and is drawn as one, which is what the default
     * makes of every message created from the palette. A message stored before this property existed
     * carries none at all, and is read the same way - see `messageStroke`.
     */
    messageSort?: MessageSort = 'SYNCH_CALL';
    /**
     * A stereotype applied to this message, written `«ajax»` above the line.
     *
     * What the message *is* rather than what it does: the name says which operation is called and the sort
     * says how the sender waits, and neither has anywhere to say that the call goes out over one mechanism
     * rather than another. Free text for the reason `Lifeline.stereotype` is - a stereotype is UML's way of
     * marking an element as a kind the standard does not name - and stored without the guillemets, which
     * are notation (see `stereotypeText`).
     */
    stereotype?: string;
    /**
     * The two ends. A lifeline usually, and a gate where the message crosses the border of a frame instead
     * of reaching a participant - see {@link MessageEnd}, which is what makes the two interchangeable here.
     */
    @Language.reference source: MessageEnd;
    @Language.reference target: MessageEnd;
}
