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
import { ArrayMaxSize, MinLength, ValidateIf } from 'class-validator';
import 'reflect-metadata';
import { MessageEnd, type Visibility } from '../core/element.def.js';
import type { BehaviorExecutionSpecification } from './behavior-execution-specification-element.def.js';
import type { DestructionOccurrenceSpecification } from './destruction-occurrence-specification-element.def.js';
import type { StateInvariant } from './state-invariant-element.def.js';

// @ts-nocheck

/**
 * How the head of a lifeline is drawn - the part above the line that says which participant it is.
 *
 * `BOX` is the ordinary one: the name in a rectangle. `ACTOR` is the stick figure UML draws when the
 * participant is someone outside the system rather than an object inside it. `BOUNDARY` is the circle with
 * a bar against it, for a participant that sits on the edge of the system and is what the outside world
 * talks to - a page, a servlet, a screen. Both of the latter write the name above the icon rather than
 * inside a box.
 *
 * A property rather than a second element type, because the two are the same participant drawn two ways:
 * messages arrive on it, executions run on it and it can be destroyed either way, and a diagram that
 * changed its mind would otherwise have to delete the lifeline and everything hanging off it.
 *
 * It has to be said rather than worked out. UML takes the figure from the type of the connectable element
 * the lifeline represents, and here that type is `className` - free text naming a class in some other
 * document, which this model cannot look up and ask whether it is an actor.
 */
export type LifelineHead = 'BOX' | 'ACTOR' | 'BOUNDARY';

/**
 * A lifeline: one participant in an interaction, and the line down the page along which it lives.
 *
 * What is written in its head is the `lifeline-ident` of UML 2.4 -
 * `[ name [ '[' selector ']' ] ] [ ':' class-name ] [ decomposition ] | 'self'` - so `data : Stock`,
 * `: User`, `x[k] : X`, or `self`. The four parts below are that notation held apart, because the
 * brackets, the colon and the `ref` are notation and not data; they are put together only to be drawn.
 * See `composeLifelineIdent`.
 *
 * A `MessageEnd` rather than a plain node, because it is one of the two things a message can be attached
 * to - the other being a gate on the border of a frame. See {@link MessageEnd}.
 */
@Glsp.toolPalette({
    section: 'Container',
    label: 'Lifeline',
    icon: 'uml-lifeline-icon'
})
@Glsp.defaults
export class Lifeline extends MessageEnd {
    /**
     * The `connectable-element-name` - the `data` of `data : Stock`, or the keyword `self` for the object
     * of the classifier that encloses the interaction.
     *
     * Optional, because UML draws anonymous lifelines: `: User` names a class and no participant. The
     * ident as a whole may not be empty though, so a lifeline that names no class has to be named - which
     * is what the check below says.
     */
    @ValidateIf(o => !o.className)
    @MinLength(1, { message: 'A lifeline must be named, or must name the class it represents' })
    name?: string;
    /**
     * The `[k]` of `x[k]` - which one of a multi-valued connectable element this lifeline stands for. An
     * expression, so free text rather than a name.
     */
    @Language.text selector?: string;
    /**
     * The type after the colon: the `Stock` of `data : Stock`, which UML takes from the connectable
     * element this lifeline represents.
     *
     * Typed in rather than picked, the way a property's type is - see `Property.propertyType` for what a
     * dropdown could not offer. It matters more here than there: a sequence diagram holds no `Class` at
     * all, so there would be nothing in the document to choose from.
     */
    @Language.text className?: string;
    /**
     * The `interaction-ident [ 'strict' ]` of a `ref` decomposition - the interaction this lifeline is
     * decomposed into. Held as text for the same reason the class name is: the interaction it names is
     * usually in another document.
     */
    @Language.text decomposition?: string;
    visibility?: Visibility;
    /**
     * Whether the head is a box holding the name or the stick figure of an actor. A lifeline that says
     * nothing about it is a box, which is what every one stored before this property existed is read as.
     */
    head?: LifelineHead = 'BOX';
    /**
     * Whether the participant is an active object: one with a thread of its own, which runs rather than
     * waiting to be called.
     *
     * UML draws it with a vertical line ruled down each side of the head, and takes the fact from
     * `Class::isActive` on the classifier the lifeline represents. It has to be said here instead, for the
     * reason the head does: that classifier is `className`, free text naming a class in some other
     * document, and this model has no way to look it up and ask.
     *
     * Says nothing about the head being a box or an icon - the two are independent, and a lifeline keeps
     * whichever it was given when this is toggled. It is only ever *drawn* on a box, there being no sides
     * to rule on a stick figure; see `GSequenceLifelineNodeView`.
     *
     * Named for the attribute it stands in for, which `Class` already carries under the same name: one UML
     * fact should not be two words in one model, whichever element happens to be saying it.
     */
    isActive?: boolean;
    /**
     * A stereotype applied to this participant, written `«servlet»` above the ident.
     *
     * Free for the user to say rather than a fixed set, because that is what a stereotype is: UML's way of
     * marking an element as a kind the standard does not name. The guillemets are notation and are not
     * stored - see `stereotypeText`.
     *
     * One rather than a list. UML allows several and writes them `«a, b»`, but a comma cannot be stored in
     * a name (see `storableName`), and a lifeline head is a few characters wide - a second stereotype on
     * one is more than the shape can carry legibly.
     */
    stereotype?: string;
    /**
     * The stretches during which this participant is doing something - the bars laid over its lifetime
     * line. Owned by the lifeline because that is what they run on: an execution is a period of *this*
     * participant's life, and there is nothing to say about one apart from the line it sits on.
     */
    executions?: Array<BehaviorExecutionSpecification>;
    /**
     * Where this participant's life ends - the cross drawn on the line, with the line stopping there.
     *
     * An array because that is the shape a containment takes here: `getCreationPath` appends to a list, so
     * a single-valued property could not be created into. UML's cardinality is one, which is what the cap
     * says - a lifeline is destroyed once or not at all, and a second cross on one line would be two
     * answers to when the object died.
     */
    @ArrayMaxSize(1, { message: 'A lifeline can only be destroyed once' })
    destructions?: Array<DestructionOccurrenceSpecification>;
    /**
     * The conditions that have to hold of this participant at points down its line - the constraints UML
     * writes in braces on it, and the state symbols that are the same thing said another way.
     *
     * Owned by the lifeline for the same reason the executions are: a state invariant covers exactly one
     * lifeline in UML, and here that is not a reference it holds but the list it is in. Any number of
     * them, unlike the destruction - a participant passes through as many conditions as the interaction
     * has moments to check it at.
     */
    stateInvariants?: Array<StateInvariant>;
}
